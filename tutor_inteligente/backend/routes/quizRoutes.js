// routes/quizRoutes.js - RUTAS ACTUALIZADAS

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { 
  generarQuiz, 
  getQuizzesUsuario, 
  getQuiz,
  generarPDFExamenController,
  generarPDFRespuestasController
} = require('../controllers/quizController');

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Generación y gestión de quizzes automáticos
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Obtener quizzes del usuario actual
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de quizzes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       titulo:
 *                         type: string
 *                         example: "Quiz - introduccion_ia.pdf"
 *                       tipo_preguntas:
 *                         type: string
 *                         example: "opcion_multiple"
 *                       cantidad_preguntas:
 *                         type: integer
 *                         example: 5
 *                       fecha_creacion:
 *                         type: string
 *                         format: date-time
 *                       materia_nombre:
 *                         type: string
 *                         example: "Inteligencia Artificial"
 *                       archivo_nombre:
 *                         type: string
 *                         example: "introduccion_ia.pdf"
 */

// GET /api/quizzes - Obtener quizzes del usuario
router.get('/', getQuizzesUsuario);

/**
 * @swagger
 * /api/quizzes/generar:
 *   post:
 *     summary: Generar un nuevo quiz a partir de un archivo
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - archivoId
 *               - tipoPreguntas
 *             properties:
 *               archivoId:
 *                 type: integer
 *                 example: 1
 *                 description: ID del archivo subido previamente
 *               tipoPreguntas:
 *                 type: string
 *                 enum: [opcion_multiple, verdadero_falso, preguntas_abiertas]
 *                 example: "opcion_multiple"
 *               cantidadPreguntas:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 5
 *                 default: 5
 *     responses:
 *       201:
 *         description: Quiz generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Quiz generado exitosamente"
 *                 quiz:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     titulo:
 *                       type: string
 *                     tipoPreguntas:
 *                       type: string
 *                     cantidadPreguntas:
 *                       type: integer
 *                     preguntas:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Datos inválidos o archivo no encontrado
 *       500:
 *         description: Error interno del servidor o error con el servicio de IA
 */

// GET /api/quizzes/:id - Obtener un quiz específico
router.get('/:id', getQuiz);

// POST /api/quizzes/generar - Generar nuevo quiz
router.post('/generar', generarQuiz);

/**
 * @swagger
 * /api/quizzes/{id}/pdf/examen:
 *   get:
 *     summary: Descargar PDF del examen (sin respuestas)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del quiz
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Quiz no encontrado
 *       500:
 *         description: Error generando PDF
 */

// GET /api/quizzes/:id/pdf/examen - Descargar PDF del examen
router.get('/:id/pdf/examen', generarPDFExamenController);

/**
 * @swagger
 * /api/quizzes/{id}/pdf/respuestas:
 *   get:
 *     summary: Descargar PDF con respuestas (para profesores)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del quiz
 *     responses:
 *       200:
 *         description: PDF con respuestas generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Quiz no encontrado
 *       500:
 *         description: Error generando PDF
 */

// GET /api/quizzes/:id/pdf/respuestas - Descargar PDF de respuestas
router.get('/:id/pdf/respuestas', generarPDFRespuestasController);

module.exports = router;