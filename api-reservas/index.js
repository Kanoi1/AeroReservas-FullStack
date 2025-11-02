const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const swaggerUi = require('swagger-ui-express');
const yamljs = require('yamljs');
const path = require('path');
const swaggerDocument = yamljs.load(path.join(__dirname, 'openapi.yaml'));
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para poder entender los JSON que envía el cliente

// Probar conexión a BD
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar con la base de datos ❌', err);
  } else {
    console.log('Base de datos conectada exitosamente ✅');
  }
});

// Rutas
// Rutas
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', require('./routes/auth')); // Usamos las rutas de autenticación
app.use('/api/seats', require('./routes/seats'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/files', require('./routes/files'));
app.use('/api/reports', require('./routes/reports'));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});