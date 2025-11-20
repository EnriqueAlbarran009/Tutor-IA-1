// controllers/quizController.js - VERSIÓN MEJORADA CON TÍTULOS NATURALES

const { openDB } = require('../config/database');
const { generarPreguntasConOpenAI } = require('../config/openaiConfig');
const { generarPDFExamen, generarPDFRespuestas } = require('../utils/pdfGenerator');

// Función para generar un título natural para el quiz
const generarTituloNatural = (materiaNombre, tipoPreguntas, cantidadPreguntas) => {
  const tipoTexto = {
    'opcion_multiple': 'Opción Múltiple',
    'verdadero_falso': 'Verdadero/Falso', 
    'preguntas_abiertas': 'Preguntas Abiertas'
  }[tipoPreguntas] || 'Evaluación';

  return `Evaluación de ${materiaNombre} - ${tipoTexto} (${cantidadPreguntas} preguntas)`;
};

// Generar quiz a partir de un archivo
const generarQuiz = async (req, res) => {
  try {
    const { archivoId, tipoPreguntas, cantidadPreguntas } = req.body;
    const usuarioId = req.user.id;

    if (!archivoId || !tipoPreguntas) {
      return res.status(400).json({ 
        error: 'archivoId y tipoPreguntas son requeridos' 
      });
    }

    const db = await openDB();

    // Obtener el archivo y verificar permisos
    const archivo = await db.get(`
      SELECT a.*, m.nombre as materia_nombre 
      FROM archivos_subidos a
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE a.id = ? AND a.usuario_id = ?
    `, [archivoId, usuarioId]);

    if (!archivo) {
      await db.close();
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Generar preguntas con OpenAI (o modo demo)
    const preguntas = await generarPreguntasConOpenAI(
      archivo.contenido_extraido,
      {
        tipoPreguntas,
        cantidadPreguntas: cantidadPreguntas || 5,
        materia: archivo.materia_nombre
      }
    );

    // Generar título natural para el quiz
    const tituloNatural = generarTituloNatural(
      archivo.materia_nombre,
      tipoPreguntas,
      preguntas.length
    );

    // Guardar el quiz en la base de datos
    const quizResult = await db.run(
      `INSERT INTO quizzes 
       (usuario_id, archivo_id, titulo, tipo_preguntas, cantidad_preguntas, preguntas) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        archivoId,
        tituloNatural, // Usar título natural en lugar del nombre del archivo
        tipoPreguntas,
        preguntas.length,
        JSON.stringify(preguntas)
      ]
    );

    await db.close();

    res.status(201).json({
      mensaje: 'Quiz generado exitosamente',
      quiz: {
        id: quizResult.lastID,
        titulo: tituloNatural, // Usar título natural en la respuesta
        tipoPreguntas,
        cantidadPreguntas: preguntas.length,
        preguntas: preguntas,
        materia: archivo.materia_nombre
      }
    });

  } catch (error) {
    console.error('Error generando quiz:', error);
    
    if (error.message.includes('OpenAI') || error.message.includes('API')) {
      return res.status(502).json({ error: 'Error con el servicio de IA. Por favor intenta más tarde.' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor al generar quiz' });
  }
};

// Obtener quizzes del usuario
const getQuizzesUsuario = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    
    const db = await openDB();
    
    const quizzes = await db.all(`
      SELECT q.id, q.titulo, q.tipo_preguntas, q.cantidad_preguntas, q.fecha_creacion,
             m.nombre as materia_nombre, a.nombre_original as archivo_nombre
      FROM quizzes q
      INNER JOIN archivos_subidos a ON q.archivo_id = a.id
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE q.usuario_id = ?
      ORDER BY q.fecha_creacion DESC
    `, [usuarioId]);
    
    await db.close();
    
    res.json({ quizzes });
  } catch (error) {
    console.error('Error obteniendo quizzes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener un quiz específico
const getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    
    const db = await openDB();
    
    const quiz = await db.get(`
      SELECT q.*, m.nombre as materia_nombre, a.nombre_original as archivo_nombre
      FROM quizzes q
      INNER JOIN archivos_subidos a ON q.archivo_id = a.id
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE q.id = ? AND q.usuario_id = ?
    `, [id, usuarioId]);
    
    await db.close();
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Parsear las preguntas de JSON string a objeto
    quiz.preguntas = typeof quiz.preguntas === 'string' 
      ? JSON.parse(quiz.preguntas) 
      : quiz.preguntas;
    
    res.json({ quiz });
  } catch (error) {
    console.error('Error obteniendo quiz:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Generar PDF del examen (sin respuestas)
const generarPDFExamenController = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    
    const db = await openDB();
    
    const quiz = await db.get(`
      SELECT q.*, m.nombre as materia_nombre
      FROM quizzes q
      INNER JOIN archivos_subidos a ON q.archivo_id = a.id
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE q.id = ? AND q.usuario_id = ?
    `, [id, usuarioId]);
    
    await db.close();
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Parsear preguntas si es necesario
    quiz.preguntas = typeof quiz.preguntas === 'string' 
      ? JSON.parse(quiz.preguntas) 
      : quiz.preguntas;

    // Generar PDF
    const pdfBuffer = await generarPDFExamen(quiz);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=examen-${quiz.titulo}.pdf`);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generando PDF de examen:', error);
    res.status(500).json({ error: 'Error generando PDF' });
  }
};

// Generar PDF de respuestas
const generarPDFRespuestasController = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    
    const db = await openDB();
    
    const quiz = await db.get(`
      SELECT q.*, m.nombre as materia_nombre
      FROM quizzes q
      INNER JOIN archivos_subidos a ON q.archivo_id = a.id
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE q.id = ? AND q.usuario_id = ?
    `, [id, usuarioId]);
    
    await db.close();
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Parsear preguntas si es necesario
    quiz.preguntas = typeof quiz.preguntas === 'string' 
      ? JSON.parse(quiz.preguntas) 
      : quiz.preguntas;

    // Generar PDF con respuestas
    const pdfBuffer = await generarPDFRespuestas(quiz);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=respuestas-${quiz.titulo}.pdf`);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generando PDF de respuestas:', error);
    res.status(500).json({ error: 'Error generando PDF' });
  }
};

module.exports = { 
  generarQuiz, 
  getQuizzesUsuario, 
  getQuiz, 
  generarPDFExamenController, 
  generarPDFRespuestasController 
};