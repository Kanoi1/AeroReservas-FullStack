const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
const { sendWelcomeEmail } = require('../services/emailService');

const router = Router();

// Endpoint: POST /api/auth/register
router.post(
  '/register',
  // Validaciones
  body('email', 'Por favor, introduce un email válido.').isEmail(),
  body('email').custom(value => {
    if (!value.endsWith('@gmail.com') && !value.endsWith('@outlook.com')) {
      return Promise.reject('Solo se permiten correos @gmail.com y @outlook.com');
    }
    return true;
  }),
  body('password', 'La contraseña debe tener al menos 6 caracteres.').isLength({ min: 6 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Hashear la contraseña
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Guardar usuario en la base de datos
      const newUser = await pool.query(
        "INSERT INTO Users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email",
        [email, password_hash]
      );

     
      sendWelcomeEmail(email);

      res.status(201).json(newUser.rows[0]);

    } catch (err) {
      // Manejo de error si el email ya existe
      if (err.code === '23505') { // Código de error para violación de constraint 'unique'
         return res.status(400).json({ msg: 'El correo electrónico ya está registrado.' });
      }
      console.error(err.message);
      res.status(500).send('Error en el servidor');
    }
  }
);

// Endpoint: POST /api/auth/login
router.post(
  '/login',
  // Validaciones
  body('email', 'Por favor, introduce un email válido.').isEmail(),
  body('password', 'La contraseña es obligatoria.').exists(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // 1. Verificar si el usuario existe
      const userResult = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
      if (userResult.rows.length === 0) {
        return res.status(400).json({ msg: 'Credenciales incorrectas' });
      }
      const user = userResult.rows[0];

      // 2. Comparar la contraseña
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Credenciales incorrectas' });
      }

      // 3. Crear y firmar el JWT
      const payload = {
        user: {
          id: user.user_id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }, // El token expira en 1 hora
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error en el servidor');
    }
  }
);


// Endpoint: GET /api/auth/me (Ruta Protegida)
// Devuelve los datos del usuario autenticado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // El middleware ya verificó el token y nos dio req.user.id
    const user = await pool.query(
      'SELECT user_id, email, created_at, reservation_count FROM Users WHERE user_id = $1',
      [req.user.id]
    );
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});
module.exports = router;