const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { sendMultiReservationConfirmation, sendModificationConfirmation, sendCancellationConfirmation } = require('../services/emailService');

const router = Router();

// Endpoint: POST /api/reservations
// Crea una nueva reserva. Ruta protegida.
router.post(
  '/',
  authMiddleware,
  [
     body('cui').custom((value) => {
      if (!/^\d{13}$/.test(value)) {
        throw new Error('El CUI debe contener exactamente 13 dígitos numéricos.');
      }
      const cui = value.toString();
      const correlativo = cui.substring(0, 8);
      const verificador = cui.substring(8, 9);
      const deptoCode = parseInt(cui.substring(9, 11), 10);

      if (deptoCode < 1 || deptoCode > 22) {
        throw new Error('El código de departamento en el CUI no es válido (debe ser entre 01 y 22).');
      }
      
      let suma = 0;
      // El algoritmo oficial multiplica de derecha a izquierda por 2, 3, 4...
      for (let i = 0; i < correlativo.length; i++) {
        suma += parseInt(correlativo[i]) * (correlativo.length - i + 1);
      }
      
      const residuo = suma % 11;
      const verificadorCalculado = (11 - residuo) % 11;
      
      if (verificadorCalculado.toString() !== verificador) {
        throw new Error('El dígito verificador del CUI no es válido. El CUI es incorrecto.');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { seat_id, full_name, cui, has_baggage, is_random_selection } = req.body;
    const user_id = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const seatCheck = await client.query(
        "SELECT * FROM Reservations WHERE seat_id = $1 AND status = 'confirmed'",
        [seat_id]
      );

      if (seatCheck.rows.length > 0) {
        return res.status(400).json({ msg: 'Lo sentimos, este asiento ya está ocupado.' });
      }

      const newReservation = await client.query(
        `INSERT INTO Reservations (user_id, seat_id, full_name, cui, has_baggage, is_random_selection)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING reservation_id, seat_id, created_at`,
        [user_id, seat_id, full_name, cui, has_baggage || false, is_random_selection || false]
      );

      await client.query(
        'UPDATE Users SET reservation_count = reservation_count + 1 WHERE user_id = $1',
        [user_id]
      );

      await client.query('COMMIT');

      const seatInfo = await client.query('SELECT seat_code FROM Seats WHERE seat_id = $1', [seat_id]);
      res.status(201).json({
        msg: '¡Reserva creada con éxito!',
        reservation: { ...newReservation.rows[0], seat_code: seatInfo.rows[0].seat_code }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505' || (err.constraint && err.constraint.includes('idx_unique_active_cui'))) {
        return res.status(400).json({ msg: 'El CUI ya ha sido registrado en otra reserva activa.' });
      }
      console.error(err.message);
      res.status(500).send('Error en el servidor');
    } finally {
      client.release();
    }
  }
       
);

// Endpoint: PUT /api/reservations/cancel
router.put(
  '/cancel',
  authMiddleware,
  [
    body('seat_code', 'El código del asiento es obligatorio').not().isEmpty(),
    body('cui', 'El CUI es obligatorio').isLength({ min: 13, max: 13 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { seat_code, cui } = req.body;
    const user_id = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reservationQuery = await client.query(
        `SELECT r.reservation_id, r.user_id FROM Reservations r
         JOIN Seats s ON r.seat_id = s.seat_id
         WHERE s.seat_code = $1 AND r.cui = $2 AND r.user_id = $3 AND r.status = 'confirmed'`,
        [seat_code, cui, user_id]
      );

      if (reservationQuery.rows.length === 0) {
        return res.status(404).json({ msg: 'No se encontró una reserva activa para los datos proporcionados.' });
      }

      const { reservation_id, user_id: reservation_user_id } = reservationQuery.rows[0];

      await client.query(
        "UPDATE Reservations SET status = 'cancelled' WHERE reservation_id = $1",
        [reservation_id]
      );

      await client.query(
        'UPDATE Users SET reservation_count = reservation_count - 1 WHERE user_id = $1 AND reservation_count > 0',
        [reservation_user_id]
      );

      await client.query('COMMIT');
      const userEmailQuery = await client.query('SELECT email FROM Users WHERE user_id = $1', [user_id]);
      const userEmail = userEmailQuery.rows[0].email;
      sendCancellationConfirmation(userEmail, { seat_code: seat_code });

      res.json({ msg: `Reserva para el asiento ${seat_code} ha sido cancelada.` });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err.message);
      res.status(500).send('Error en el servidor');
    } finally {
      client.release();
    }
  }
);

// --- ENDPOINT DE MODIFICACIÓN CON DEPURACIÓN ---
router.put(
  '/modify',
  authMiddleware,
  [
    body('cui', 'El CUI es obligatorio').isLength({ min: 13, max: 13 }),
    body('current_seat_code', 'El código del asiento actual es obligatorio').not().isEmpty(),
    body('new_seat_id', 'El ID del nuevo asiento es obligatorio').isInt(),
  ],
  async (req, res) => {
    // <-- LOG DE DEPURACIÓN 1 -->
    console.log('\n--- INICIANDO PETICIÓN A /MODIFY ---');
    console.log('Datos recibidos del frontend:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cui, current_seat_code, new_seat_id } = req.body;
    const user_id = req.user.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener información de la reserva actual
      const currentReservationQuery = await client.query(
        `SELECT r.reservation_id, r.seat_id, s.class, s.price 
         FROM Reservations r
         JOIN Seats s ON r.seat_id = s.seat_id
         WHERE r.cui = $1 AND s.seat_code = $2 AND r.user_id = $3 AND r.status = 'confirmed'`,
        [cui, current_seat_code, user_id]
      );

      // <-- LOG DE DEPURACIÓN 2 -->
      console.log('Resultado de la búsqueda de la reserva ACTUAL:', currentReservationQuery.rows);

      if (currentReservationQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ msg: 'No se encontró una reserva activa que coincida con los datos proporcionados.' });
      }

      const { reservation_id, seat_id: current_seat_id, class: current_class, price: current_price } = currentReservationQuery.rows[0];

      // --- BLOQUE 'MISMO ASIENTO' CORREGIDO ---
      if (current_seat_id === new_seat_id) {
        const priceAsNumber = parseFloat(current_price);
        const modification_charge = (priceAsNumber * 0.10).toFixed(2);
        const new_price_for_this_reservation_num = priceAsNumber * 1.10;
        
        // Calcular total general aunque sea el mismo asiento
        const allReservationsQuery = await client.query(`SELECT s.price FROM Reservations r JOIN Seats s ON r.seat_id = s.seat_id WHERE r.user_id = $1 AND r.status = 'confirmed'`, [user_id]);
        let overall_total = 0;
        allReservationsQuery.rows.forEach(row => { overall_total += parseFloat(row.price); });
        await client.query('COMMIT');
        // Enviar correo también en este caso
        const userEmailQuery = await client.query('SELECT email FROM Users WHERE user_id = $1', [user_id]);
        const userEmail = userEmailQuery.rows[0].email;
        const passengerNameQuery = await client.query('SELECT full_name FROM Reservations WHERE reservation_id = $1', [reservation_id]);
        const emailDetails = {
          old_seat_code: current_seat_code,
          new_seat_code: current_seat_code, // Es el mismo asiento
          full_name: passengerNameQuery.rows[0].full_name,
          modification_charge: modification_charge,
          new_price_for_this_reservation: new_price_for_this_reservation_num.toFixed(2),
          overall_total_after_modification: overall_total.toFixed(2)
        };
        sendModificationConfirmation(userEmail, emailDetails);
        
        
        return res.json({
           msg: `La reserva para el asiento ${current_seat_code} ha sido re-confirmada.`,
           new_price: new_total_price.toFixed(2),
        });
      }

      // 2. Consulta para verificar el nuevo asiento por separado
      const newSeatQuery = await client.query(
        `SELECT s.class, r.reservation_id as occupied_by
         FROM Seats s
         LEFT JOIN Reservations r ON s.seat_id = r.seat_id AND r.status = 'confirmed'
         WHERE s.seat_id = $1`,
        [new_seat_id]
      );
      
      // <-- LOG DE DEPURACIÓN 3 -->
      console.log('Resultado de la búsqueda del asiento NUEVO:', newSeatQuery.rows);

      if (newSeatQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ msg: 'El nuevo asiento seleccionado no existe.' });
      }

      const { class: new_class, occupied_by } = newSeatQuery.rows[0];

      // 3. Validar reglas de negocio
      if (occupied_by) {
        // <-- LOG DE DEPURACIÓN 4 -->
        console.log('ERROR: El sistema determinó que el nuevo asiento está ocupado. ID de ocupación:', occupied_by);
        await client.query('ROLLBACK');
        return res.status(400).json({ msg: 'El nuevo asiento seleccionado ya está ocupado.' });
      }
      if (current_class !== new_class) {
        await client.query('ROLLBACK');
        return res.status(400).json({ msg: 'Solo se puede modificar a un asiento de la misma clase.' });
      }
   
      // 4. Actualizar la reserva con el nuevo seat_id
      await client.query(
        "UPDATE Reservations SET seat_id = $1, modified_at = CURRENT_TIMESTAMP WHERE reservation_id = $2",
        [new_seat_id, reservation_id]
      );



      await client.query('COMMIT');

      // 5. Calcular el nuevo precio y obtener el código del asiento
      const priceAsNumber = parseFloat(current_price);
      const modification_charge = (parseFloat(current_price) * 0.10).toFixed(2); // Calcula el recargo individual
      const new_price_for_this_reservation = (priceAsNumber * 1.10).toFixed(2);
      const newSeatCode = await getSeatCode(new_seat_id, client);

      // Calcular el nuevo TOTAL de TODAS las reservas activas del usuario DESPUÉS del commit
      const allReservationsQuery = await client.query(
        `SELECT s.price 
         FROM Reservations r 
         JOIN Seats s ON r.seat_id = s.seat_id 
         WHERE r.user_id = $1 AND r.status = 'confirmed'`,
        [user_id]
      );
      let overall_total = 0;
      allReservationsQuery.rows.forEach(row => { overall_total += parseFloat(row.price); });
      // --- FIN CÁLCULO DE PRECIOS Y TOTAL ---

      // Enviar Correo
      const userEmailQuery = await client.query('SELECT email FROM Users WHERE user_id = $1', [user_id]);
      const userEmail = userEmailQuery.rows[0].email;
      const passengerNameQuery = await client.query('SELECT full_name FROM Reservations WHERE reservation_id = $1', [reservation_id]);
      const emailDetails = {
        old_seat_code: current_seat_code,
        new_seat_code: newSeatCode,
        full_name: passengerNameQuery.rows[0].full_name,
        modification_charge: modification_charge,
        new_price_for_this_reservation: new_price_for_this_reservation, // Ya es string con .toFixed(2)
        overall_total_after_modification: overall_total.toFixed(2)
      };
      sendModificationConfirmation(userEmail, emailDetails);

      res.json({
        msg: `Reserva modificada con éxito. Su nuevo asiento es ${newSeatCode}.`,
        new_price: new_price_for_this_reservation,
      });

    } catch (err) {
      // Intenta hacer rollback si aún no se ha hecho
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error('Error en Rollback:', rbErr); }
      console.error('Error general en /modify:', err.message);
      res.status(500).send('Error en el servidor durante la modificación.');
    } finally {
      // Liberar el cliente SIEMPRE al final
      if (client) {
        client.release();
        console.log('Cliente de BD liberado.');
      }
    }
  }
);


// Endpoint: POST /api/reservations/quote
router.post(
  '/quote',
  authMiddleware,
  [
    body('seat_id', 'El ID del asiento es obligatorio').isInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { seat_id } = req.body;
    const user_id = req.user.id;

    try {
        const queryResult = await pool.query(
            `SELECT 
               s.price,
               u.reservation_count
             FROM Seats s, Users u
             WHERE s.seat_id = $1 AND u.user_id = $2`,
            [seat_id, user_id]
        );

        if (queryResult.rows.length === 0) {
            return res.status(404).json({ msg: 'No se encontró el asiento o el usuario.' });
        }

        const { price, reservation_count } = queryResult.rows[0];
        const original_price = parseFloat(price);
        let final_price = original_price;
        let discount = 0;
        const is_vip = reservation_count > 5;

        if (is_vip) {
            discount = original_price * 0.10;
            final_price = original_price - discount;
        }

        res.json({
            original_price: original_price.toFixed(2),
            is_vip,
            discount: discount.toFixed(2),
            final_price: final_price.toFixed(2)
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
  }
);

// Endpoint: GET /api/reservations/my-reservations
router.get('/my-reservations', authMiddleware, async (req, res) => {
  try {
    const userReservations = await pool.query(
      `SELECT
         r.reservation_id,
         s.seat_code,
         s.class,
         r.full_name,
         r.cui,
         r.has_baggage,
         r.status,
         r.created_at
       FROM Reservations r
       JOIN Seats s ON r.seat_id = s.seat_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json(userReservations.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});

// Función auxiliar para obtener el seat_code a partir de un seat_id
async function getSeatCode(seat_id, client) {
    const result = await client.query('SELECT seat_code FROM Seats WHERE seat_id = $1', [seat_id]);
    return result.rows[0].seat_code;
}

router.post('/send-summary-email', authMiddleware, async (req, res) => {
  const { reservations } = req.body;
  const user_id = req.user.id;

  if (!reservations || reservations.length === 0) {
    return res.status(400).json({ msg: 'No se proporcionaron reservas.' });
  }

  try {
    const userEmailQuery = await pool.query('SELECT email FROM Users WHERE user_id = $1', [user_id]);
    const userEmail = userEmailQuery.rows[0].email;
    sendMultiReservationConfirmation(userEmail, reservations);
    res.status(200).json({ msg: 'Correo de resumen enviado.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor al enviar correo de resumen.');
  }
});

module.exports = router;