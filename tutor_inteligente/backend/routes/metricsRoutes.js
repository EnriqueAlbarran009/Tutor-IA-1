// routes/metricsRoutes.js - Rutas para métricas y reportes

const express = require('express');
const router = express.Router();
const { verifyToken, requireCoordinador } = require('../middleware/authMiddleware');
const {
  getMetricasGenerales,
  getMetricasProfesor,
  getReporteUso
} = require('../controllers/metricsController');

/**
 * @swagger
 * tags:
 *   name: Métricas
 *   description: Dashboard de analytics y reportes del sistema
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @swagger
 * /api/metrics/generales:
 *   get:
 *     summary: Obtener métricas generales del sistema (solo coordinador)
 *     tags: [Métricas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas generales obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metricasGenerales:
 *                   type: object
 *                   properties:
 *                     totalProfesores:
 *                       type: integer
 *                       example: 15
 *                     totalQuizzes:
 *                       type: integer
 *                       example: 47
 *                     totalArchivos:
 *                       type: integer
 *                       example: 52
 *                     porcentajeActivos:
 *                       type: integer
 *                       example: 80
 *                     promedioQuizzesPorProfesor:
 *                       type: string
 *                       example: "3.1"
 *                 usoPorMateria:
 *                   type: array
 *                   items:
 *                     type: object
 *                 distribucionQuizzes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 actividadReciente:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: No tiene permisos de coordinador
 */

// GET /api/metrics/generales - Métricas generales del sistema (solo coordinador)
router.get('/generales', requireCoordinador, getMetricasGenerales);

/**
 * @swagger
 * /api/metrics/profesor/{profesorId}:
 *   get:
 *     summary: Obtener métricas específicas de un profesor
 *     tags: [Métricas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profesorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del profesor
 *     responses:
 *       200:
 *         description: Métricas del profesor obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profesor:
 *                   type: object
 *                 metricas:
 *                   type: object
 *                 quizzesRecientes:
 *                   type: array
 *                 materiasUtilizadas:
 *                   type: array
 *       403:
 *         description: No tiene permisos para ver estas métricas
 *       404:
 *         description: Profesor no encontrado
 */

// GET /api/metrics/profesor/:profesorId - Métricas de un profesor específico
router.get('/profesor/:profesorId', getMetricasProfesor);

/**
 * @swagger
 * /api/metrics/reporte-uso:
 *   get:
 *     summary: Obtener reporte detallado de uso del sistema
 *     tags: [Métricas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *           enum: [7dias, 30dias, 90dias]
 *           default: 30dias
 *         description: Período de tiempo para el reporte
 *     responses:
 *       200:
 *         description: Reporte de uso generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo:
 *                   type: string
 *                 resumen:
 *                   type: object
 *                 actividadDiaria:
 *                   type: array
 *                 topProfesores:
 *                   type: array
 *                 topMaterias:
 *                   type: array
 *                 tendenciaQuizzes:
 *                   type: array
 *       403:
 *         description: No tiene permisos de coordinador
 */

// GET /api/metrics/reporte-uso - Reporte de uso del sistema (solo coordinador)
router.get('/reporte-uso', requireCoordinador, getReporteUso);

module.exports = router;