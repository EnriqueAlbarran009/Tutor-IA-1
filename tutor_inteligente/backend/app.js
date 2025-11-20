// app.js - El corazón de nuestro Back-end (Versión SQLite) - CORREGIDO

// 1. IMPORTAR LAS HERRAMIENTAS
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de entorno

// Importar la configuración de la base de datos y el inicializador
const { testConnection } = require('./config/database');
const initDatabase = require('./database/initDB');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const materiaRoutes = require('./routes/materiaRoutes');
const archivoRoutes = require('./routes/archivoRoutes');
const quizRoutes = require('./routes/quizRoutes');
const quizInteractivoRoutes = require('./routes/quizInteractivoRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const { swaggerSpec, swaggerUi } = require('./config/swagger'); //ULTIMA ACTUALIZACION

// 2. CREAR LA APLICACIÓN EXPRESS
const app = express();
const PORT = process.env.PORT || 5000;

// === NUEVO: Configuración para Socket.io ===
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // En producción, cambia esto a tu dominio
    methods: ["GET", "POST"]
  }
});

// 3. CONFIGURAR MIDDLEWARES (Funciones que procesan peticiones)
app.use(cors());
app.use(express.json());

// 4. INICIALIZAR BASE DE DATOS Y PROBAR CONEXIÓN
initDatabase().then(() => {
  testConnection();
});

// 5. USAR LAS RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materias', materiaRoutes);
app.use('/api/archivos', archivoRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quiz-interactivo', quizInteractivoRoutes);
app.use('/api/metrics', metricsRoutes); //ULTIMA ACTUALIZACION

// 6. RUTA DE PRUEBA MEJORADA
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '¡El servidor del Tutor Inteligente está funcionando!',
    base_de_datos: 'SQLite',
    estado: 'Conectado y listo',
    rutas_disponibles: [
      'POST /api/auth/login',
      'GET  /api/users/profesores (requiere token de coordinador)',
      'POST /api/users/profesores (requiere token de coordinador)',
      'GET  /api/materias (requiere token)',
      'GET  /api/materias/profesor/:id (requiere token de coordinador)',
      'POST /api/materias/asignar (requiere token de coordinador)'
    ]
  });
});

// 7. MANEJO DE ERRORES GLOBAL (Middleware simple)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor!' });
});

// 8. MANEJO DE RUTAS NO ENCONTRADAS (CORREGIDO)
//app.use('*', (req, res) => {
  //res.status(404).json({ error: 'Ruta no encontrada' });
//});

// --- Servidor HTTP + Socket.io ---
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Socket.io activo`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// === NUEVO: Lógica de Quizzes Interactivos ===
const quizzesActivos = new Map(); // Almacena quizzes activos

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Unirse a un quiz interactivo
  socket.on('unirse_quiz', (data) => {
    const { quizId, codigo, nombreAlumno } = data;
    
    if (!quizzesActivos.has(codigo)) {
      socket.emit('error', { mensaje: 'Código de quiz inválido' });
      return;
    }

    const quiz = quizzesActivos.get(codigo);
    
    // Verificar que el quiz esté activo
    if (!quiz.activo) {
      socket.emit('error', { mensaje: 'El quiz ya ha finalizado' });
      return;
    }

    // Unir al socket a la sala del quiz
    socket.join(codigo);
    socket.quizCode = codigo;
    socket.nombreAlumno = nombreAlumno;

    // Agregar alumno a la lista
    if (!quiz.alumnos) {
      quiz.alumnos = new Map();
    }
    quiz.alumnos.set(socket.id, {
      id: socket.id,
      nombre: nombreAlumno,
      respuestas: [],
      puntaje: 0
    });

    console.log(` ${nombreAlumno} se unió al quiz ${codigo}`);
    
    // Notificar a todos en la sala
    io.to(codigo).emit('alumno_unido', {
      alumno: nombreAlumno,
      totalAlumnos: quiz.alumnos.size
    });

    // Enviar estado actual al nuevo alumno
    socket.emit('estado_quiz', {
      titulo: quiz.titulo,
      preguntaActual: quiz.preguntaActual,
      totalPreguntas: quiz.preguntas.length,
      tiempoRestante: quiz.tiempoRestante
    });
  });

  // Recibir respuesta de alumno
  socket.on('enviar_respuesta', (data) => {
    const { preguntaIndex, respuesta, tiempoUsado } = data;
    const codigo = socket.quizCode;

    if (!codigo || !quizzesActivos.has(codigo)) {
      return;
    }

    const quiz = quizzesActivos.get(codigo);
    const alumno = quiz.alumnos.get(socket.id);

    if (!alumno || preguntaIndex !== quiz.preguntaActual) {
      return;
    }

    // Registrar respuesta
    const pregunta = quiz.preguntas[preguntaIndex];
    const esCorrecta = verificarRespuesta(pregunta, respuesta);
    
    alumno.respuestas[preguntaIndex] = {
      respuesta,
      esCorrecta,
      tiempoUsado,
      puntaje: esCorrecta ? calcularPuntaje(tiempoUsado) : 0
    };

    alumno.puntaje += alumno.respuestas[preguntaIndex].puntaje;

    console.log(` ${alumno.nombre} respondió: ${respuesta} (${esCorrecta ? '✓' : '✗'})`);

    // Notificar al profesor
    socket.to(codigo).emit('respuesta_recibida', {
      alumno: alumno.nombre,
      preguntaIndex,
      esCorrecta
    });
  });

  // Desconexión de cliente
  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
    
    const codigo = socket.quizCode;
    if (codigo && quizzesActivos.has(codigo)) {
      const quiz = quizzesActivos.get(codigo);
      if (quiz.alumnos && quiz.alumnos.has(socket.id)) {
        const alumno = quiz.alumnos.get(socket.id);
        quiz.alumnos.delete(socket.id);
        
        // Notificar a la sala
        io.to(codigo).emit('alumno_salio', {
          alumno: alumno.nombre,
          totalAlumnos: quiz.alumnos.size
        });
      }
    }
  });
});

// === NUEVO: Funciones auxiliares ===
const verificarRespuesta = (pregunta, respuesta) => {
  if (pregunta.tipo === 'opcion_multiple') {
    return pregunta.respuesta === respuesta;
  } else if (pregunta.tipo === 'verdadero_falso') {
    return pregunta.respuesta === respuesta;
  }
  // Para preguntas abiertas, siempre true (se calificarían manualmente)
  return true;
};

const calcularPuntaje = (tiempoUsado) => {
  const tiempoMaximo = 30; // segundos
  const puntajeBase = 1000;
  const puntaje = Math.max(100, puntajeBase - (tiempoUsado * 10));
  return Math.round(puntaje);
};

// Exportar io para usar en otras partes
module.exports = { io, quizzesActivos };

// === NUEVO: Servir documentación Swagger ===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .information-container { background: #f5f5f5; padding: 20px; }
  `,
  customSiteTitle: 'Tutor Inteligente - API Docs'
}));

// Ruta para obtener el spec en JSON (opcional)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});