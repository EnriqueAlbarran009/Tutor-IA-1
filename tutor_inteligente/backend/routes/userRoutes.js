// routes/userRoutes.js - Rutas para gestión de usuarios (VERSIÓN ACTUALIZADA)

const express = require('express');
const router = express.Router();
const { verifyToken, requireCoordinador } = require('../middleware/authMiddleware');
const { 
  getProfesores, 
  crearProfesor, 
  toggleProfesorActivo,
  actualizarPerfil,
  cambiarContraseña,
  exportarDatos
} = require('../controllers/userController');

/**
 * @swagger
 * tags:
 *   name: Gestión de Usuarios
 *   description: APIs para gestión de profesores (solo coordinadores)
 */

// TODAS estas rutas requieren autenticación
router.use(verifyToken);

/**
 * @swagger
 * /api/users/perfil:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [Gestión de Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez Actualizado"
 *               correo:
 *                 type: string
 *                 example: "juan.actualizado@universidad.edu"
 *               carrera:
 *                 type: string
 *                 example: "Maestría"
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *       400:
 *         description: Datos inválidos o correo ya en uso
 *       500:
 *         description: Error interno del servidor
 */
router.put('/perfil', actualizarPerfil);

/**
 * @swagger
 * /api/users/cambiar-contraseña:
 *   put:
 *     summary: Cambiar contraseña del usuario
 *     tags: [Gestión de Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contraseñaActual
 *               - nuevaContraseña
 *             properties:
 *               contraseñaActual:
 *                 type: string
 *                 example: "password123"
 *               nuevaContraseña:
 *                 type: string
 *                 example: "nuevaPassword456"
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *       400:
 *         description: Contraseña actual incorrecta o nueva contraseña inválida
 *       500:
 *         description: Error interno del servidor
 */
router.put('/cambiar-contraseña', cambiarContraseña);

/**
 * @swagger
 * /api/users/exportar-datos:
 *   get:
 *     summary: Exportar datos del usuario en formato CSV
 *     tags: [Gestión de Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos exportados exitosamente
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/exportar-datos', exportarDatos);

// Las siguientes rutas requieren ser coordinador
router.use(requireCoordinador);

/**
 * @swagger
 * /api/users/profesores:
 *   get:
 *     summary: Obtener lista de todos los profesores
 *     tags: [Gestión de Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de profesores obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profesores:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Usuario'
 *       403:
 *         description: No tiene permisos de coordinador
 *       500:
 *         description: Error interno del servidor
 */

// GET /api/users/profesores - Obtener todos los profesores
router.get('/profesores', getProfesores);

/**
 * @swagger
 * /api/users/profesores:
 *   post:
 *     summary: Crear un nuevo profesor
 *     tags: [Gestión de Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - usuario
 *               - correo
 *               - contraseña
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "María García"
 *               usuario:
 *                 type: string
 *                 example: "maria.garcia"
 *               correo:
 *                 type: string
 *                 example: "maria@universidad.edu"
 *               contraseña:
 *                 type: string
 *                 example: "password123"
 *                 minLength: 6
 *               carrera:
 *                 type: string
 *                 example: "Maestría"
 *     responses:
 *       201:
 *         description: Profesor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Profesor creado exitosamente"
 *                 profesor:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     nombre:
 *                       type: string
 *                     usuario:
 *                       type: string
 *                     correo:
 *                       type: string
 *                     rol:
 *                       type: string
 *                       example: "profesor"
 *                     carrera:
 *                       type: string
 *       400:
 *         description: Datos inválidos o usuario/correo ya existen
 *       403:
 *         description: No tiene permisos de coordinador
 *       500:
 *         description: Error interno del servidor
 */

// POST /api/users/profesores - Crear un nuevo profesor
router.post('/profesores', crearProfesor);

/**
 * @swagger
 * /api/users/profesores/{id}/toggle:
 *   patch:
 *     summary: Activar/desactivar un profesor
 *     tags: [Gestión de Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del profesor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activo
 *             properties:
 *               activo:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado del profesor actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Profesor desactivado exitosamente"
 *       404:
 *         description: Profesor no encontrado
 *       403:
 *         description: No tiene permisos de coordinador
 *       500:
 *         description: Error interno del servidor
 */

// PATCH /api/users/profesores/:id/toggle - Activar/desactivar profesor
router.patch('/profesores/:id/toggle', toggleProfesorActivo);

module.exports = router;