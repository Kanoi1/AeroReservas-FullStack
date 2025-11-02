const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función base para enviar correos
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"AeroReservas" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    console.log('Correo enviado exitosamente a:', to);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};

// --- 1. NUEVA PLANTILLA DE CORREO ---
// Esta función crea el contenedor visual para todos nuestros correos.
const wrapInTemplate = (title, bodyContent) => {
  // Usamos los colores de tu paleta
  const headerColor = '#101430'; // Fondo azul oscuro
  const accentColor = '#07ebe9'; // Cyan vibrante
  const footerBg = '#f9f9f9';
  const footerText = '#777';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: ${headerColor}; color: ${accentColor}; padding: 20px;">
        <h1 style="margin: 0; text-align: center; font-size: 28px;">AeroReservas</h1>
      </div>
      
      <div style="padding: 30px;">
        <h2 style="color: ${headerColor}; font-size: 22px;">${title}</h2>
        ${bodyContent}
      </div>
      
      <div style="background-color: ${footerBg}; color: ${footerText}; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
        <p style="margin: 0; font-size: 12px;">© ${new Date().getFullYear()} AeroReservas. Todos los derechos reservados.</p>
        <p style="margin: 5px 0 0; font-size: 12px;">Este es un correo electrónico generado automáticamente, por favor no respondas.</p>
      </div>
    </div>
  `;
};

// --- 2. FUNCIONES DE CORREO ACTUALIZADAS PARA USAR LA PLANTILLA ---

// Plantilla para correo de bienvenida
const sendWelcomeEmail = (to) => {
    const subject = '¡Bienvenido a AeroReservas!';
    const title = '¡Bienvenido!';
    const body = `
      <p>¡Hola y bienvenido a AeroReservas!</p>
      <p>Tu cuenta ha sido creada exitosamente.</p>
      <p>Ya puedes empezar a planificar tus viajes y reservar tus asientos.</p>
      <p style="margin-top: 25px;">¡Buen viaje!</p>
    `;
    // Envolvemos el cuerpo en la plantilla
    const html = wrapInTemplate(title, body);
    sendEmail(to, subject, html);
};

// Plantilla para correo de resumen de múltiples reservas
const sendMultiReservationConfirmation = (to, reservations) => {
  const subject = `✅ Confirmación de tus ${reservations.length} reserva(s)`;
  const title = '¡Tus reservas están confirmadas!';
  let total = 0;
  let itemsHtml = '';

  reservations.forEach(r => {
    total += parseFloat(r.price);
    itemsHtml += `<li style="margin-bottom: 10px;"><strong>Asiento ${r.seat_code}:</strong> ${r.full_name} - $${parseFloat(r.price).toFixed(2)}</li>`;
  });

  const body = `
    <p>Hola, hemos procesado con éxito tus ${reservations.length} reserva(s). Aquí están los detalles:</p>
    <ul style="padding-left: 20px;">${itemsHtml}</ul>
    <hr style="border: 0; border-top: 1px solid #eee;">
    <h3 style="color: #333; text-align: right;">Total Pagado: $${total.toFixed(2)}</h3>
    <p>¡Gracias por elegir AeroReservas!</p>
  `;
  const html = wrapInTemplate(title, body);
  sendEmail(to, subject, html);
};

// Plantilla para modificación de reserva
const sendModificationConfirmation = (to, details) => {
  const subject = `🔄 Tu reserva ha sido modificada`;
  const title = '¡Tu reserva ha sido actualizada!';
  const body = `
    <p>Hola,</p>
    <p>Se ha modificado tu asiento con éxito. Aquí están los detalles del cambio:</p>
    <ul>
      <li><strong>Asiento Anterior:</strong> ${details.old_seat_code}</li>
      <li><strong>Nuevo Asiento:</strong> ${details.new_seat_code}</li>
      <li><strong>Pasajero:</strong> ${details.full_name}</li>
    </ul>
    <p style="margin-top: 20px;">Costo por esta modificación: $${details.modification_charge}</p>
    <p>Nuevo precio para esta reserva (con recargo): $${details.new_price_for_this_reservation}</p>
    <hr style="border: 0; border-top: 1px solid #eee;">
    <h3 style="color: #333; text-align: right;">Nuevo Saldo Total de Reservas Activas: $${details.overall_total_after_modification}</h3>
    <p>Este es el monto total acumulado de todas tus reservas activas, incluyendo el recargo de esta modificación.</p>
  `;
  const html = wrapInTemplate(title, body);
  sendEmail(to, subject, html);
};

// Plantilla para cancelación de reserva
const sendCancellationConfirmation = (to, details) => {
  const subject = `❌ Tu reserva para el asiento ${details.seat_code} ha sido cancelada`;
  const title = 'Reserva Cancelada';
  const body = `
    <p>Hola,</p>
    <p>Hemos procesado la cancelación de tu reserva para el asiento <strong>${details.seat_code}</strong>.</p>
    <p>Esperamos verte de nuevo pronto en AeroReservas.</p>
  `;
  const html = wrapInTemplate(title, body);
  sendEmail(to, subject, html);
};

// Exportamos las funciones
module.exports = {
  sendWelcomeEmail,
  sendMultiReservationConfirmation,
  sendModificationConfirmation,
  sendCancellationConfirmation,
};