# Proyecto: AeroReservas (Sistema de Reservas Full-Stack)

¡Bienvenido al proyecto AeroReservas! Esta es una aplicación web completa, construida desde cero, que simula un sistema de reservas de asientos de avión. Utiliza un backend en Node.js (API RESTful) y un frontend en Angular, siguiendo las mejores prácticas de desarrollo.

## ✈️ Características Principales

### Backend (API con Node.js y Express)
* **Autenticación Segura:** Sistema de registro y login basado en tokens (JWT).
* **Gestión de Reservas:** Lógica completa para crear, modificar, cancelar y ver reservas.
* **Validación de Datos Avanzada:** Verificación del formato y dígito verificador de CUI guatemalteco (RENAP), y validación de nombres.
* **Lógica de Negocio:**
    * Sistema de usuarios **VIP** con descuentos automáticos.
    * Recargo del **10%** por cada modificación de reserva.
* **Notificaciones por Correo:** Envío automático de correos (usando Nodemailer) para:
    * Bienvenida a nuevos usuarios.
    * Confirmación de reserva (individual y resumen múltiple).
    * Notificación de modificación (con desglose de precios).
    * Notificación de cancelación.
* **Gestión de Datos:** Endpoints para exportar (`.xml`) e importar (`.xml`) reservas masivamente.
* **Reportes:** Un endpoint que consolida todas las estadísticas del sistema.
* **Documentación:** API completamente documentada usando **Swagger** (OpenAPI en un archivo `openapi.yaml`).

### Frontend (Aplicación con Angular)
* **Arquitectura Standalone:** Construido con la arquitectura moderna de componentes independientes.
* **Diseño "Glassmorphism":** Interfaz de usuario moderna, limpia y responsiva (móvil, tablet, escritorio) con efecto de vidrio esmerilado.
* **Flujo de Reserva Avanzado:**
    * Reserva de **múltiples asientos** en un solo flujo.
    * Opción de **selección manual** (con vista de una sola clase) o **selección aleatoria**.
    * Opción de "Omitir Pasajero" en reservas múltiples.
* **Paneles de Usuario:**
    * **Navbar** que muestra el email del usuario y su estado **VIP**.
    * **"Mis Reservas"**: Página para ver y gestionar reservas activas o canceladas.
    * **"Ver Avión"**: Vista de solo lectura del mapa de asientos.
    * **Paneles de Reportes y Gestión de Datos**.
* **Experiencia de Usuario (UX) Mejorada:**
    * Uso de **Modales** personalizados en lugar de `alert()` y `confirm()`.

## 🛠️ Stack Tecnológico

* **Frontend:** Angular, TypeScript, RxJS
* **Backend:** Node.js, Express
* **Base de Datos:** PostgreSQL (gestionado con Docker)
* **Autenticación:** JSON Web Tokens (JWT)
* **Notificaciones:** Nodemailer (con Gmail)
* **Documentación API:** Swagger (OpenAPI 3.0) y `yamljs`

---

## 🚀 Instalación y Ejecución

Sigue estos pasos para levantar el proyecto en tu máquina local.

### Prerrequisitos
* [Node.js](https://nodejs.org/) (v18+)
* [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con una instancia de PostgreSQL corriendo)

### 1. Backend (API)
Navega a la carpeta de la API (`api-reservas`) y sigue los pasos:

```bash
# 1. Instalar dependencias
npm install

# 2. Crear un archivo .env en la raíz de /api-reservas
# (Usa .env.example como plantilla si existe)
# Debes añadir tus credenciales de PostgreSQL y tu
# correo y "Contraseña de Aplicación" de Gmail.
#
# Ejemplo de .env:
# DB_USER=postgres
# DB_HOST=localhost
# DB_DATABASE=aero_reservas
# DB_PASSWORD=tu_password_de_postgres
# DB_PORT=5432
# JWT_SECRET=mi_clave_secreta
# EMAIL_USER=tu_correo@gmail.com
# EMAIL_PASS=tu_contraseña_de_16_letras_de_google

# 3. Iniciar el servidor (en modo desarrollo)
npm run dev