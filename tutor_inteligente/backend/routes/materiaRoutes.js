// routes/materiaRoutes.js - VERSIÓN COMPLETAMENTE CORREGIDA

const express = require('express');
const router = express.Router();
const { verifyToken, requireCoordinador } = require('../middleware/authMiddleware');
const { openDB } = require('../config/database');

/**
 * @swagger
 * tags:
 *   name: Materias
 *   description: Gestión de materias y asignaciones a profesores
 */

// Obtener todas las materias (público para usuarios autenticados)
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = await openDB();
    
    const materias = await db.all(`
      SELECT id, nombre, descripcion 
      FROM materias 
      ORDER BY nombre
    `);
    
    await db.close();
    
    res.json({ materias });
  } catch (error) {
    console.error('Error obteniendo materias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener materias del profesor actual (para profesores)
router.get('/mis-materias', verifyToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const rol = req.user.rol;

    const db = await openDB();
    
    let materias;
    if (rol === 'coordinador') {
      // Coordinador ve todas las materias
      materias = await db.all(`
        SELECT id, nombre, descripcion 
        FROM materias 
        ORDER BY nombre
      `);
    } else {
      // Profesor ve solo sus materias asignadas
      materias = await db.all(`
        SELECT m.id, m.nombre, m.descripcion 
        FROM materias m
        INNER JOIN profesor_materia pm ON m.id = pm.materia_id 
        WHERE pm.profesor_id = ?
        ORDER BY m.nombre
      `, [usuarioId]);
    }
    
    await db.close();
    
    res.json({ materias });
  } catch (error) {
    console.error('Error obteniendo materias del profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener materias de un profesor específico (solo coordinador)
router.get('/profesor/:profesorId', verifyToken, requireCoordinador, async (req, res) => {
  try {
    const { profesorId } = req.params;

    const db = await openDB();
    
    const materias = await db.all(`
      SELECT m.id, m.nombre, m.descripcion 
      FROM materias m
      INNER JOIN profesor_materia pm ON m.id = pm.materia_id 
      WHERE pm.profesor_id = ?
      ORDER BY m.nombre
    `, [profesorId]);
    
    await db.close();
    
    res.json({ materias });
  } catch (error) {
    console.error('Error obteniendo materias del profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asignar materia a profesor (solo coordinador)
router.post('/asignar', verifyToken, requireCoordinador, async (req, res) => {
  try {
    const { profesorId, materiaId } = req.body;

    if (!profesorId || !materiaId) {
      return res.status(400).json({ error: 'Profesor ID y Materia ID son requeridos' });
    }

    const db = await openDB();

    // Verificar si ya existe la asignación
    const asignacionExistente = await db.get(
      'SELECT id FROM profesor_materia WHERE profesor_id = ? AND materia_id = ?',
      [profesorId, materiaId]
    );

    if (asignacionExistente) {
      await db.close();
      return res.status(400).json({ error: 'Esta materia ya está asignada al profesor' });
    }

    // Crear la asignación
    await db.run(
      'INSERT INTO profesor_materia (profesor_id, materia_id) VALUES (?, ?)',
      [profesorId, materiaId]
    );

    await db.close();

    res.status(201).json({ mensaje: 'Materia asignada exitosamente' });

  } catch (error) {
    console.error('Error asignando materia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Quitar asignación de materia a un profesor (solo coordinador)
router.delete('/quitar', verifyToken, requireCoordinador, async (req, res) => {
  try {
    const { profesorId, materiaId } = req.body;

    const db = await openDB();
    
    const result = await db.run(
      'DELETE FROM profesor_materia WHERE profesor_id = ? AND materia_id = ?',
      [profesorId, materiaId]
    );

    await db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    res.json({ mensaje: 'Materia removida exitosamente' });

  } catch (error) {
    console.error('Error removiendo materia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva materia (solo coordinador)
router.post('/', verifyToken, requireCoordinador, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la materia es requerido' });
    }

    const db = await openDB();

    // Verificar si ya existe una materia con ese nombre
    const materiaExistente = await db.get(
      'SELECT id FROM materias WHERE nombre = ?',
      [nombre]
    );

    if (materiaExistente) {
      await db.close();
      return res.status(400).json({ error: 'Ya existe una materia con ese nombre' });
    }

    // Crear la nueva materia
    const result = await db.run(
      'INSERT INTO materias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );

    await db.close();

    res.status(201).json({
      mensaje: 'Materia creada exitosamente',
      materia: {
        id: result.lastID,
        nombre,
        descripcion
      }
    });

  } catch (error) {
    console.error('Error creando materia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;