const { Router } = require('express');
const { create } = require('xmlbuilder2');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const { convert } = require('xmlbuilder2');

// Configuración de Multer para guardar el archivo en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

// Endpoint: GET /api/files/export/xml
// Exporta todas las reservas confirmadas a un archivo XML.
router.get('/export/xml', authMiddleware, async (req, res) => {
    try {
        // 1. Obtener todas las reservas confirmadas con datos del usuario y asiento
        const reservations = await pool.query(
            `SELECT 
                s.seat_code,
                r.full_name,
                u.email,
                r.cui,
                r.has_baggage,
                r.created_at AS reservation_date
             FROM Reservations r
             JOIN Users u ON r.user_id = u.user_id
             JOIN Seats s ON r.seat_id = s.seat_id
             WHERE r.status = 'confirmed'`
        );

        if (reservations.rows.length === 0) {
            return res.status(404).json({ msg: 'No hay reservas confirmadas para exportar.' });
        }

        // 2. Construir el documento XML
        const root = create({ version: '1.0' }).ele('reservations');
        for (const reservation of reservations.rows) {
            const reservationNode = root.ele('reservation');
            reservationNode.ele('seat').txt(reservation.seat_code);
            reservationNode.ele('fullName').txt(reservation.full_name);
            reservationNode.ele('email').txt(reservation.email);
            reservationNode.ele('cui').txt(reservation.cui);
            reservationNode.ele('hasBaggage').txt(reservation.has_baggage);
            reservationNode.ele('reservationDate').txt(reservation.reservation_date.toISOString());
        }

        const xml = root.end({ prettyPrint: true });

        // 3. Configurar las cabeceras para forzar la descarga del archivo
        res.header('Content-Type', 'application/xml');
        res.header('Content-Disposition', `attachment; filename="reservations_${Date.now()}.xml"`);

        // 4. Enviar el XML como respuesta
        res.send(xml);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

// Endpoint: POST /api/files/import/xml
// Importa reservas desde un archivo XML.
router.post(
  '/import/xml',
  authMiddleware,
  upload.single('reservationsFile'), // 'reservationsFile' es el nombre del campo en el form-data
  async (req, res) => {
    // Iniciar temporizador
    const startTime = process.hrtime();

    if (!req.file) {
      return res.status(400).json({ msg: 'No se ha subido ningún archivo.' });
    }

    // Contadores y log de errores
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    const client = await pool.connect();
    try {
      // Convertir el buffer del archivo a string y luego a objeto JS
      const xmlString = req.file.buffer.toString('utf8');
      const xmlObj = convert(xmlString, { format: 'object' });

      const reservationsToImport = xmlObj.reservations?.reservation || [];
      if (!Array.isArray(reservationsToImport)) {
         return res.status(400).json({ msg: 'Formato de XML no válido. No se encontró la lista de reservaciones.' });
      }

      for (const item of reservationsToImport) {
        const { seat, fullName, email, cui, hasBaggage } = item;

        // Transacción para cada reserva individual
        try {
          await client.query('BEGIN');

          // Validaciones
          const seatResult = await client.query('SELECT seat_id FROM Seats WHERE seat_code = $1', [seat]);
          const userResult = await client.query('SELECT user_id FROM Users WHERE email = $1', [email]);
          if (seatResult.rows.length === 0 || userResult.rows.length === 0) {
            throw new Error(`Usuario (${email}) o asiento (${seat}) no válido.`);
          }
          const seat_id = seatResult.rows[0].seat_id;
          const user_id = userResult.rows[0].user_id;

          // Insertar si no hay errores
          await client.query(
            `INSERT INTO Reservations (user_id, seat_id, full_name, cui, has_baggage) VALUES ($1, $2, $3, $4, $5)`,
            [user_id, seat_id, fullName, cui, hasBaggage === 'true']
          );
          await client.query('UPDATE Users SET reservation_count = reservation_count + 1 WHERE user_id = $1', [user_id]);

          await client.query('COMMIT');
          successCount++;

        } catch (err) {
          await client.query('ROLLBACK');
          errorCount++;
          errors.push({ cui: cui, seat: seat, reason: err.message });
        }
      }
    } catch (err) {
      // Error general al procesar el archivo
      client.release();
      return res.status(500).json({ msg: 'Error al procesar el archivo XML.', error: err.message });
    }

    client.release();
    // Finalizar temporizador y calcular duración
    const diff = process.hrtime(startTime);
    const durationInMs = (diff[0] * 1e9 + diff[1]) / 1e6;

    res.json({
      message: 'Proceso de carga finalizado.',
      successful_loads: successCount,
      failed_loads: errorCount,
      processing_time_ms: durationInMs.toFixed(2),
      errors: errors
    });
  }
);

module.exports = router;