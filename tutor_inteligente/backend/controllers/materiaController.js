// controllers/materiaController.js - Gestión de materias y asignaciones

const { openDB } = require('../config/database');

// Obtener todas las materias
const getMaterias = async (req, res) => {
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
};

// Obtener materias asignadas a un profesor específico
const getMateriasPorProfesor = async (req, res) => {
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
};

// Asignar una materia a un profesor
const asignarMateria = async (req, res) => {
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
};

// Quitar asignación de materia a un profesor
const quitarMateria = async (req, res) => {
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
};

module.exports = { 
  getMaterias, 
  getMateriasPorProfesor, 
  asignarMateria, 
  quitarMateria 
};