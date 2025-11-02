const { Router } = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// Endpoint: GET /api/seats
// Devuelve todos los asientos y su estado (ocupado/libre).
// Es una ruta protegida, necesitas estar logueado.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT 
        s.seat_id, 
        s.seat_code, 
        s.class, 
        s.price,
        CASE 
          WHEN r.reservation_id IS NOT NULL THEN true 
          ELSE false 
        END AS is_occupied
      FROM Seats s
      LEFT JOIN Reservations r ON s.seat_id = r.seat_id AND r.status = 'confirmed'
      ORDER BY 
          SUBSTRING(s.seat_code FROM 1 FOR 1) DESC,  -- Ordena por la Letra (A, B, C...)
          CAST(SUBSTRING(s.seat_code FROM 2) AS INTEGER) ASC; -- Ordena por el Número (1, 2, 3...)
    `;

    const allSeats = await pool.query(query);
    res.json(allSeats.rows);

  } catch (err) {
    console.error('Error al obtener asientos:', err.message); // Añadido para ver el error exacto
    res.status(500).send('Error en el servidor al obtener asientos');
  }
});

module.exports = router;