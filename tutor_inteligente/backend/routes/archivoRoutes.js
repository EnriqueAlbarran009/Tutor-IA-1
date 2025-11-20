// routes/archivoRoutes.js - Rutas para gestión de archivos

const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const { verifyToken } = require('../middleware/authMiddleware');
const { subirArchivo, getArchivosUsuario } = require('../controllers/archivoController');
const { openDB } = require('../config/database'); // ¡ESTA LÍNEA FALTABA!

/**
 * @swagger
 * tags:
 *   name: Archivos
 *   description: Subida y gestión de archivos para generación de quizzes
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @swagger
 * /api/archivos:
 *   get:
 *     summary: Obtener archivos subidos por el usuario actual
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de archivos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 archivos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       nombre_original:
 *                         type: string
 *                         example: "introduccion_ia.pdf"
 *                       fecha_subida:
 *                         type: string
 *                         format: date-time
 *                       materia_nombre:
 *                         type: string
 *                         example: "Inteligencia Artificial"
 */

// GET /api/archivos - Obtener archivos del usuario
router.get('/', getArchivosUsuario);

/**
 * @swagger
 * /api/archivos/subir:
 *   post:
 *     summary: Subir un nuevo archivo para generar quizzes
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - archivo
 *               - materiaId
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo PDF, PPT o DOC (máx. 10MB)
 *               materiaId:
 *                 type: integer
 *                 example: 1
 *                 description: ID de la materia a la que pertenece el archivo
 *     responses:
 *       201:
 *         description: Archivo subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Archivo subido exitosamente"
 *                 archivo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     nombreOriginal:
 *                       type: string
 *                     nombreGuardado:
 *                       type: string
 *                     tipoMime:
 *                       type: string
 *                     contenidoExtraido:
 *                       type: string
 *       400:
 *         description: Archivo inválido o tipo no permitido
 *       413:
 *         description: Archivo demasiado grande (>10MB)
 */

// POST /api/archivos/subir - Subir nuevo archivo
router.post('/subir', upload.single('archivo'), subirArchivo);

// Agrega esta ruta después de las rutas existentes

// backend/routes/archivoRoutes.js - Agregar esta ruta

/**
 * @swagger
 * /api/archivos/{id}:
 *   delete:
 *     summary: Eliminar un archivo subido
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Archivo eliminado exitosamente
 *       404:
 *         description: Archivo no encontrado
 *       403:
 *         description: No tienes permisos para eliminar este archivo
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    const rol = req.user.rol;

    const db = await openDB();

    // Obtener el archivo
    const archivo = await db.get(
      'SELECT * FROM archivos_subidos WHERE id = ?',
      [id]
    );

    if (!archivo) {
      await db.close();
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Verificar permisos: coordinador o el dueño del archivo
    if (rol !== 'coordinador' && archivo.usuario_id !== usuarioId) {
      await db.close();
      return res.status(403).json({ error: 'No tienes permisos para eliminar este archivo' });
    }

    // Eliminar el archivo físico del sistema de archivos
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync(archivo.ruta)) {
      try {
        fs.unlinkSync(archivo.ruta);
        console.log(`Archivo físico eliminado: ${archivo.ruta}`);
      } catch (fileError) {
        console.error('Error eliminando archivo físico:', fileError);
        // Continuamos aunque falle la eliminación física
      }
    }

    // Eliminar registros relacionados en quizzes primero (por la foreign key)
    try {
      await db.run('DELETE FROM quizzes WHERE archivo_id = ?', [id]);
      console.log(`Quizzes relacionados eliminados para archivo ${id}`);
    } catch (quizError) {
      console.error('Error eliminando quizzes relacionados:', quizError);
    }

    // Eliminar el registro de la base de datos
    const result = await db.run('DELETE FROM archivos_subidos WHERE id = ?', [id]);

    await db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado en la base de datos' });
    }

    res.json({ 
      mensaje: 'Archivo eliminado exitosamente',
      archivoEliminado: {
        id: archivo.id,
        nombre: archivo.nombre_original
      }
    });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al eliminar el archivo',
      detalle: error.message 
    });
  }
});

module.exports = router;