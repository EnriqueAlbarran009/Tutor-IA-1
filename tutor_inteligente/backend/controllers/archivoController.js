// controllers/archivoController.js - Gestión de archivos y generación de quizzes

const { openDB } = require('../config/database');
const { extractTextFromFile, hasContent } = require('../utils/fileUtils');
const path = require('path');

// Subir archivo y extraer contenido
const subirArchivo = async (req, res) => {
  try {
    // VALIDACIÓN SECUENCIAL: Primero verificar que se haya seleccionado materia
    const { materiaId } = req.body;
    const usuarioId = req.user.id;

    if (!materiaId) {
      return res.status(400).json({ error: 'Primero debes seleccionar una materia' });
    }

    // VALIDACIÓN SECUENCIAL: Luego verificar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'Debes seleccionar un archivo para subir' });
    }

    // Verificar que el profesor tenga acceso a esta materia
    const db = await openDB();
    const materiaAsignada = await db.get(
      `SELECT pm.id FROM profesor_materia pm
       INNER JOIN materias m ON pm.materia_id = m.id
       WHERE pm.profesor_id = ? AND pm.materia_id = ?`,
      [usuarioId, materiaId]
    );

    if (!materiaAsignada && req.user.rol !== 'coordinador') {
      await db.close();
      return res.status(403).json({ error: 'No tienes acceso a esta materia' });
    }

    // VALIDACIÓN: Verificar que el archivo tenga contenido
    if (!hasContent(req.file.path)) {
      await db.close();
      // Eliminar el archivo vacío
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error eliminando archivo vacío:', unlinkError);
      }
      return res.status(400).json({ error: 'El archivo está vacío. Sube un archivo con contenido.' });
    }

    // Extraer texto del archivo
    let contenidoExtraido;
    try {
      contenidoExtraido = await extractTextFromFile(
        req.file.path,
        req.file.mimetype
      );
    } catch (error) {
      await db.close();
      // Eliminar el archivo si no se pudo procesar
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error eliminando archivo no procesable:', unlinkError);
      }
      
      if (error.message.includes('vacío') || error.message.includes('contenido')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(400).json({ error: 'No se pudo extraer contenido del archivo. Asegúrate de que el archivo sea válido y tenga texto procesable.' });
    }

    // Guardar información del archivo en la base de datos
    const result = await db.run(
      `INSERT INTO archivos_subidos 
       (usuario_id, materia_id, nombre_original, nombre_guardado, ruta, tipo_mime, contenido_extraido) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        materiaId,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        contenidoExtraido
      ]
    );

    await db.close();

    res.status(201).json({
      mensaje: 'Archivo subido exitosamente',
      archivo: {
        id: result.lastID,
        nombreOriginal: req.file.originalname,
        nombreGuardado: req.file.filename,
        tipoMime: req.file.mimetype,
        contenidoExtraido: contenidoExtraido
      }
    });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    
    if (error.message.includes('Tipo de archivo no permitido')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor al subir archivo' });
  }
};

// Obtener archivos subidos por el usuario
const getArchivosUsuario = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    
    const db = await openDB();
    
    const archivos = await db.all(`
      SELECT a.id, a.nombre_original, a.fecha_subida, m.nombre as materia_nombre
      FROM archivos_subidos a
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE a.usuario_id = ?
      ORDER BY a.fecha_subida DESC
    `, [usuarioId]);
    
    await db.close();
    
    res.json({ archivos });
  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { subirArchivo, getArchivosUsuario };