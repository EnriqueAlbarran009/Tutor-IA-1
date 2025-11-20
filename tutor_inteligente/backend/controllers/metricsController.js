// controllers/metricsController.js - Métricas y analytics del sistema

const { openDB } = require('../config/database');

// Obtener métricas generales del sistema (para coordinador)
const getMetricasGenerales = async (req, res) => {
  try {
    const db = await openDB();

    // Métricas en paralelo para mejor performance
    const [
      totalProfesores,
      totalQuizzes,
      totalArchivos,
      profesoresActivos,
      usoPorMateria,
      quizzesPorTipo,
      actividadReciente
    ] = await Promise.all([
      // Total de profesores
      db.get("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'profesor'"),
      
      // Total de quizzes generados
      db.get("SELECT COUNT(*) as total FROM quizzes"),
      
      // Total de archivos subidos
      db.get("SELECT COUNT(*) as total FROM archivos_subidos"),
      
      // Profesores activos (con actividad en últimos 30 días)
      db.get(`
        SELECT COUNT(DISTINCT usuario_id) as total 
        FROM archivos_subidos 
        WHERE fecha_subida >= date('now', '-30 days')
      `),
      
      // Uso por materia
      db.all(`
        SELECT m.nombre as materia, COUNT(a.id) as total_archivos
        FROM materias m
        LEFT JOIN archivos_subidos a ON m.id = a.materia_id
        GROUP BY m.id, m.nombre
        ORDER BY total_archivos DESC
      `),
      
      // Quizzes por tipo
      db.all(`
        SELECT tipo_preguntas, COUNT(*) as total
        FROM quizzes
        GROUP BY tipo_preguntas
        ORDER BY total DESC
      `),
      
      // Actividad reciente (últimos 7 días)
      db.all(`
        SELECT 
          date(fecha_creacion) as fecha,
          COUNT(*) as total_quizzes
        FROM quizzes
        WHERE fecha_creacion >= date('now', '-7 days')
        GROUP BY date(fecha_creacion)
        ORDER BY fecha DESC
      `)
    ]);

    await db.close();

    // Calcular porcentaje de profesores activos
    const porcentajeActivos = totalProfesores.total > 0 
      ? Math.round((profesoresActivos.total / totalProfesores.total) * 100)
      : 0;

    res.json({
      metricasGenerales: {
        totalProfesores: totalProfesores.total,
        totalQuizzes: totalQuizzes.total,
        totalArchivos: totalArchivos.total,
        profesoresActivos: profesoresActivos.total,
        porcentajeActivos,
        promedioQuizzesPorProfesor: totalProfesores.total > 0 
          ? (totalQuizzes.total / totalProfesores.total).toFixed(1)
          : 0
      },
      usoPorMateria,
      distribucionQuizzes: quizzesPorTipo,
      actividadReciente,
      resumen: {
        estado: totalQuizzes.total > 0 ? 'Activo' : 'Inicializando',
        nivelUso: totalQuizzes.total < 10 ? 'Bajo' : 
                 totalQuizzes.total < 50 ? 'Medio' : 'Alto'
      }
    });

  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener métricas específicas de un profesor
const getMetricasProfesor = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const usuarioId = req.user.id;

    // Verificar permisos (coordinador o el propio profesor)
    const db = await openDB();
    const usuario = await db.get(
      "SELECT rol FROM usuarios WHERE id = ?",
      [usuarioId]
    );

    if (usuario.rol !== 'coordinador' && usuarioId != profesorId) {
      await db.close();
      return res.status(403).json({ error: 'No tienes permisos para ver estas métricas' });
    }

    // Métricas del profesor
    const [
      statsProfesor,
      quizzesRecientes,
      materiasUtilizadas,
      actividadMensual
    ] = await Promise.all([
      // Stats generales del profesor
      db.get(`
        SELECT 
          COUNT(DISTINCT a.id) as total_archivos,
          COUNT(DISTINCT q.id) as total_quizzes,
          COUNT(DISTINCT a.materia_id) as materias_utilizadas,
          MAX(a.fecha_subida) as ultima_actividad
        FROM usuarios u
        LEFT JOIN archivos_subidos a ON u.id = a.usuario_id
        LEFT JOIN quizzes q ON a.id = q.archivo_id
        WHERE u.id = ?
      `, [profesorId]),
      
      // Quizzes más recientes
      db.all(`
        SELECT q.id, q.titulo, q.tipo_preguntas, q.fecha_creacion, m.nombre as materia
        FROM quizzes q
        INNER JOIN archivos_subidos a ON q.archivo_id = a.id
        INNER JOIN materias m ON a.materia_id = m.id
        WHERE q.usuario_id = ?
        ORDER BY q.fecha_creacion DESC
        LIMIT 5
      `, [profesorId]),
      
      // Materias más utilizadas
      db.all(`
        SELECT m.nombre as materia, COUNT(a.id) as total_archivos
        FROM archivos_subidos a
        INNER JOIN materias m ON a.materia_id = m.id
        WHERE a.usuario_id = ?
        GROUP BY m.id, m.nombre
        ORDER BY total_archivos DESC
        LIMIT 5
      `, [profesorId]),
      
      // Actividad mensual
      db.all(`
        SELECT 
          strftime('%Y-%m', fecha_subida) as mes,
          COUNT(*) as total_archivos
        FROM archivos_subidos
        WHERE usuario_id = ? AND fecha_subida >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', fecha_subida)
        ORDER BY mes DESC
      `, [profesorId])
    ]);

    // Información del profesor
    const profesor = await db.get(
      "SELECT nombre, usuario, correo, carrera, fecha_creacion FROM usuarios WHERE id = ?",
      [profesorId]
    );

    await db.close();

    res.json({
      profesor,
      metricas: {
        totalArchivos: statsProfesor.total_archivos || 0,
        totalQuizzes: statsProfesor.total_quizzes || 0,
        materiasUtilizadas: statsProfesor.materias_utilizadas || 0,
        ultimaActividad: statsProfesor.ultima_actividad,
        actividadMensual,
        eficiencia: statsProfesor.total_archivos > 0 
          ? ((statsProfesor.total_quizzes / statsProfesor.total_archivos) * 100).toFixed(1)
          : 0
      },
      quizzesRecientes,
      materiasUtilizadas
    });

  } catch (error) {
    console.error('Error obteniendo métricas del profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener reporte de uso del sistema
const getReporteUso = async (req, res) => {
  try {
    const { periodo = '30dias' } = req.query; // 7dias, 30dias, 90dias
    
    const db = await openDB();

    const dias = periodo === '7dias' ? 7 : periodo === '90dias' ? 90 : 30;

    const [
      actividadDiaria,
      topProfesores,
      topMaterias,
      tendenciaQuizzes
    ] = await Promise.all([
      // Actividad diaria
      db.all(`
        SELECT 
          date(fecha_subida) as fecha,
          COUNT(*) as archivos_subidos,
          (SELECT COUNT(*) FROM quizzes q 
           WHERE date(q.fecha_creacion) = date(archivos_subidos.fecha_subida)) as quizzes_generados
        FROM archivos_subidos
        WHERE fecha_subida >= date('now', '-${dias} days')
        GROUP BY date(fecha_subida)
        ORDER BY fecha DESC
      `),
      
      // Top profesores más activos
      db.all(`
        SELECT 
          u.nombre,
          u.usuario,
          COUNT(a.id) as total_archivos,
          COUNT(q.id) as total_quizzes
        FROM usuarios u
        LEFT JOIN archivos_subidos a ON u.id = a.usuario_id
        LEFT JOIN quizzes q ON a.id = q.archivo_id
        WHERE u.rol = 'profesor' AND a.fecha_subida >= date('now', '-${dias} days')
        GROUP BY u.id, u.nombre, u.usuario
        ORDER BY total_archivos DESC
        LIMIT 10
      `),
      
      // Top materias más utilizadas
      db.all(`
        SELECT 
          m.nombre as materia,
          COUNT(a.id) as total_archivos,
          COUNT(q.id) as total_quizzes
        FROM materias m
        LEFT JOIN archivos_subidos a ON m.id = a.materia_id
        LEFT JOIN quizzes q ON a.id = q.archivo_id
        WHERE a.fecha_subida >= date('now', '-${dias} days')
        GROUP BY m.id, m.nombre
        ORDER BY total_archivos DESC
        LIMIT 10
      `),
      
      // Tendencia de tipos de quizzes
      db.all(`
        SELECT 
          tipo_preguntas,
          COUNT(*) as total,
          strftime('%Y-%m', fecha_creacion) as mes
        FROM quizzes
        WHERE fecha_creacion >= date('now', '-${dias} days')
        GROUP BY tipo_preguntas, strftime('%Y-%m', fecha_creacion)
        ORDER BY mes DESC, total DESC
      `)
    ]);

    await db.close();

    // Calcular métricas resumen
    const totalArchivos = actividadDiaria.reduce((sum, day) => sum + day.archivos_subidos, 0);
    const totalQuizzes = actividadDiaria.reduce((sum, day) => sum + day.quizzes_generados, 0);

    res.json({
      periodo,
      resumen: {
        totalArchivos,
        totalQuizzes,
        promedioDiarioArchivos: (totalArchivos / dias).toFixed(1),
        promedioDiarioQuizzes: (totalQuizzes / dias).toFixed(1),
      },
      actividadDiaria,
      topProfesores,
      topMaterias,
      tendenciaQuizzes
    });

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getMetricasGenerales,
  getMetricasProfesor,
  getReporteUso
};