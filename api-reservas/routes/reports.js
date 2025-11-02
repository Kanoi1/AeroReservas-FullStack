const { Router } = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// Endpoint: GET /api/reports/summary
// Devuelve un resumen con todas las estadísticas del sistema.
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        // Usaremos Promise.all para ejecutar todas las consultas en paralelo para mayor eficiencia
        const [
            usersCount,
            reservationsData,
            businessSeatsData,
            economySeatsData,
            selectionData,
            modifiedCount,
            cancelledCount,
        ] = await Promise.all([
            // 1. Cantidad de usuarios creados
            pool.query("SELECT COUNT(*) FROM Users"),
            // 2. Datos de reservas (total y por usuario)
            pool.query("SELECT user_id, COUNT(*) as count FROM Reservations WHERE status = 'confirmed' GROUP BY user_id"),
            // 3. Asientos de negocios (total y ocupados)
            pool.query("SELECT COUNT(*) as total, COUNT(r.reservation_id) as occupied FROM Seats s LEFT JOIN Reservations r ON s.seat_id = r.seat_id AND r.status = 'confirmed' WHERE s.class = 'business'"),
            // 4. Asientos económicos (total y ocupados)
            pool.query("SELECT COUNT(*) as total, COUNT(r.reservation_id) as occupied FROM Seats s LEFT JOIN Reservations r ON s.seat_id = r.seat_id AND r.status = 'confirmed' WHERE s.class = 'economy'"),
            // 5. Tipo de selección (manual vs aleatoria)
            pool.query("SELECT is_random_selection, COUNT(*) FROM Reservations WHERE status = 'confirmed' GROUP BY is_random_selection"),
            // 6. Cantidad de asientos modificados
            pool.query("SELECT COUNT(*) FROM Reservations WHERE modified_at > created_at"),
            // 7. Cantidad de asientos cancelados
            pool.query("SELECT COUNT(*) FROM Reservations WHERE status = 'cancelled'"),
        ]);

        // Procesar los resultados para construir el objeto final
        const businessOccupied = parseInt(businessSeatsData.rows[0].occupied);
        const businessTotal = parseInt(businessSeatsData.rows[0].total);
        const economyOccupied = parseInt(economySeatsData.rows[0].occupied);
        const economyTotal = parseInt(economySeatsData.rows[0].total);

        const selectionCounts = { manual: 0, random: 0 };
        selectionData.rows.forEach(row => {
            if (row.is_random_selection) {
                selectionCounts.random = parseInt(row.count);
            } else {
                selectionCounts.manual = parseInt(row.count);
            }
        });

        const summary = {
            created_users_count: parseInt(usersCount.rows[0].count),
            reservations_by_user: reservationsData.rows,
            business_class_occupied: businessOccupied,
            business_class_free: businessTotal - businessOccupied,
            economy_class_occupied: economyOccupied,
            economy_class_free: economyTotal - economyOccupied,
            seats_selected_by_user: selectionCounts.manual,
            seats_selected_randomly: selectionCounts.random,
            modified_reservations_count: parseInt(modifiedCount.rows[0].count),
            cancelled_reservations_count: parseInt(cancelledCount.rows[0].count),
        };

        res.json(summary);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

module.exports = router;