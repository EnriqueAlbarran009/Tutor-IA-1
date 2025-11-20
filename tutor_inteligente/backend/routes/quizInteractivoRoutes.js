// routes/quizInteractivoRoutes.js - Rutas para quizzes interactivos

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  iniciarQuizInteractivo,
  siguientePregunta,
  finalizarQuiz,
  getEstadoQuiz
} = require('../controllers/quizInteractivoController');

/**
 * @swagger
 * tags:
 *   name: Quizzes Interactivos
 *   description: Sistema de quizzes en tiempo real (estilo Kahoot)
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @swagger
 * /api/quiz-interactivo/iniciar:
 *   post:
 *     summary: Iniciar un quiz interactivo
 *     tags: [Quizzes Interactivos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quizId
 *             properties:
 *               quizId:
 *                 type: integer
 *                 example: 1
 *                 description: ID del quiz previamente generado
 *     responses:
 *       200:
 *         description: Quiz interactivo iniciado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Quiz interactivo iniciado"
 *                 codigo:
 *                   type: string
 *                   example: "ABC123"
 *                   description: Código de acceso para los alumnos
 *                 quiz:
 *                   type: object
 *       404:
 *         description: Quiz no encontrado
 */

// POST /api/quiz-interactivo/iniciar - Iniciar quiz interactivo
router.post('/iniciar', iniciarQuizInteractivo);

/**
 * @swagger
 * /api/quiz-interactivo/siguiente-pregunta:
 *   post:
 *     summary: Avanzar a la siguiente pregunta del quiz
 *     tags: [Quizzes Interactivos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: "ABC123"
 *                 description: Código del quiz interactivo
 *     responses:
 *       200:
 *         description: Siguiente pregunta iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 preguntaActual:
 *                   type: integer
 *                 totalPreguntas:
 *                   type: integer
 *       404:
 *         description: Quiz no encontrado
 *       403:
 *         description: Solo el profesor puede controlar el quiz
 */

// POST /api/quiz-interactivo/siguiente-pregunta - Avanzar a siguiente pregunta
router.post('/siguiente-pregunta', siguientePregunta);

/**
 * @swagger
 * /api/quiz-interactivo/finalizar:
 *   post:
 *     summary: Finalizar un quiz interactivo
 *     tags: [Quizzes Interactivos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: "ABC123"
 *     responses:
 *       200:
 *         description: Quiz finalizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 resultados:
 *                   type: array
 *                   items:
 *                     type: object
 */

// POST /api/quiz-interactivo/finalizar - Finalizar quiz
router.post('/finalizar', (req, res) => {
  finalizarQuiz(req.body.codigo, req.user.id, res);
});

/**
 * @swagger
 * /api/quiz-interactivo/estado/{codigo}:
 *   get:
 *     summary: Obtener estado actual de un quiz interactivo
 *     tags: [Quizzes Interactivos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *         description: Código del quiz interactivo
 *     responses:
 *       200:
 *         description: Estado del quiz obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz:
 *                   type: object
 *                 alumnos:
 *                   type: array
 *       404:
 *         description: Quiz no encontrado
 *       403:
 *         description: Solo el profesor puede ver el estado
 */

// GET /api/quiz-interactivo/estado/:codigo - Obtener estado del quiz
router.get('/estado/:codigo', getEstadoQuiz);

module.exports = router;