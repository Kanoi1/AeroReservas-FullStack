const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  // 1. Obtener el token del encabezado (header)
  const token = req.header('x-auth-token');

  // 2. Si no hay token, denegar acceso
  if (!token) {
    return res.status(401).json({ msg: 'No hay token, permiso no válido.' });
  }

  // 3. Si hay token, verificarlo
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // Guardamos el payload del usuario en el objeto request
    next(); // El token es válido, continuamos
  } catch (err) {
    res.status(401).json({ msg: 'El token no es válido.' });
  }
};