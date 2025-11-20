// controllers/quizInteractivoController.js - Gestión de quizzes interactivos

const { openDB } = require('../config/database');
const { io, quizzesActivos } = require('../app'); // Importar desde app.js

// Iniciar un quiz interactivo
const iniciarQuizInteractivo = async (req, res) => {
  try {
    const { quizId } = req.body;
    const usuarioId = req.user.id;

    const db = await openDB();

    // Obtener el quiz y verificar permisos
    const quiz = await db.get(`
      SELECT q.*, m.nombre as materia_nombre
      FROM quizzes q
      INNER JOIN archivos_subidos a ON q.archivo_id = a.id
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE q.id = ? AND q.usuario_id = ?
    `, [quizId, usuarioId]);

    await db.close();

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Parsear preguntas
    const preguntas = typeof quiz.preguntas === 'string' 
      ? JSON.parse(quiz.preguntas) 
      : quiz.preguntas;

    // Generar código único para el quiz
    const codigo = generarCodigoQuiz();
    
    // Crear objeto del quiz interactivo
    const quizInteractivo = {
      id: quiz.id,
      titulo: quiz.titulo,
      codigo,
      profesorId: usuarioId,
      preguntas: preguntas,
      preguntaActual: 0,
      activo: true,
      tiempoPorPregunta: 30, // segundos
      tiempoRestante: 30,
      fechaInicio: new Date(),
      alumnos: new Map()
    };

    // Guardar en mapa de quizzes activos
    quizzesActivos.set(codigo, quizInteractivo);

    // Programar limpieza automática después de 2 horas
    setTimeout(() => {
      if (quizzesActivos.has(codigo)) {
        quizzesActivos.delete(codigo);
        console.log(`Quiz ${codigo} limpiado automáticamente`);
      }
    }, 2 * 60 * 60 * 1000);

    res.json({
      mensaje: 'Quiz interactivo iniciado',
      codigo,
      quiz: {
        id: quiz.id,
        titulo: quiz.titulo,
        totalPreguntas: preguntas.length,
        codigoAcceso: codigo
      }
    });

  } catch (error) {
    console.error('Error iniciando quiz interactivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Avanzar a la siguiente pregunta
const siguientePregunta = async (req, res) => {
  try {
    const { codigo } = req.body;
    const usuarioId = req.user.id;

    if (!quizzesActivos.has(codigo)) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    const quiz = quizzesActivos.get(codigo);

    // Verificar que el usuario sea el profesor
    if (quiz.profesorId !== usuarioId) {
      return res.status(403).json({ error: 'Solo el profesor puede controlar el quiz' });
    }

    // Avanzar pregunta
    quiz.preguntaActual++;
    quiz.tiempoRestante = quiz.tiempoPorPregunta;

    // Si es la última pregunta, finalizar quiz
    if (quiz.preguntaActual >= quiz.preguntas.length) {
      return finalizarQuiz(codigo, usuarioId, res);
    }

    // Notificar a todos los alumnos
    io.to(codigo).emit('nueva_pregunta', {
      preguntaIndex: quiz.preguntaActual,
      pregunta: quiz.preguntas[quiz.preguntaActual],
      tiempoRestante: quiz.tiempoRestante,
      totalPreguntas: quiz.preguntas.length
    });

    // Iniciar cuenta regresiva
    iniciarCuentaRegresiva(codigo);

    res.json({
      mensaje: 'Siguiente pregunta iniciada',
      preguntaActual: quiz.preguntaActual,
      totalPreguntas: quiz.preguntas.length
    });

  } catch (error) {
    console.error('Error avanzando pregunta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Finalizar quiz
const finalizarQuiz = async (codigo, usuarioId, res) => {
  try {
    const quiz = quizzesActivos.get(codigo);

    quiz.activo = false;

    // Calcular resultados
    const resultados = Array.from(quiz.alumnos.values()).map(alumno => ({
      nombre: alumno.nombre,
      puntaje: alumno.puntaje,
      respuestasCorrectas: alumno.respuestas.filter(r => r?.esCorrecta).length,
      totalPreguntas: quiz.preguntas.length
    }));

    // Ordenar por puntaje
    resultados.sort((a, b) => b.puntaje - a.puntaje);

    // Notificar a todos los alumnos
    io.to(codigo).emit('quiz_finalizado', { resultados });

    // Eliminar quiz activo después de 5 minutos
    setTimeout(() => {
      if (quizzesActivos.has(codigo)) {
        quizzesActivos.delete(codigo);
        console.log(`Quiz ${codigo} finalizado y limpiado`);
      }
    }, 5 * 60 * 1000);

    if (res) {
      res.json({
        mensaje: 'Quiz finalizado',
        resultados
      });
    }

  } catch (error) {
    console.error('Error finalizando quiz:', error);
    if (res) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

// Obtener estado del quiz
const getEstadoQuiz = async (req, res) => {
  try {
    const { codigo } = req.params;
    const usuarioId = req.user.id;

    if (!quizzesActivos.has(codigo)) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    const quiz = quizzesActivos.get(codigo);

    // Verificar permisos
    if (quiz.profesorId !== usuarioId) {
      return res.status(403).json({ error: 'Solo el profesor puede ver el estado' });
    }

    const alumnos = Array.from(quiz.alumnos.values()).map(alumno => ({
      nombre: alumno.nombre,
      puntaje: alumno.puntaje,
      respuestas: alumno.respuestas
    }));

    res.json({
      quiz: {
        codigo: quiz.codigo,
        titulo: quiz.titulo,
        preguntaActual: quiz.preguntaActual,
        totalPreguntas: quiz.preguntas.length,
        activo: quiz.activo,
        tiempoRestante: quiz.tiempoRestante,
        totalAlumnos: quiz.alumnos.size
      },
      alumnos
    });

  } catch (error) {
    console.error('Error obteniendo estado del quiz:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// === FUNCIONES AUXILIARES ===
const generarCodigoQuiz = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
};

const iniciarCuentaRegresiva = (codigo) => {
  const quiz = quizzesActivos.get(codigo);
  
  const intervalo = setInterval(() => {
    if (!quizzesActivos.has(codigo)) {
      clearInterval(intervalo);
      return;
    }

    quiz.tiempoRestante--;

    // Notificar tiempo actualizado
    io.to(codigo).emit('tiempo_actualizado', {
      tiempoRestante: quiz.tiempoRestante
    });

    // Si se acaba el tiempo, avanzar automáticamente
    if (quiz.tiempoRestante <= 0) {
      clearInterval(intervalo);
      // Aquí podrías avanzar automáticamente a la siguiente pregunta
    }
  }, 1000);
};

module.exports = {
  iniciarQuizInteractivo,
  siguientePregunta,
  finalizarQuiz,
  getEstadoQuiz
};