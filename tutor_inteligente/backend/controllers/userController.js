// controllers/userController.js - Gestión de usuarios (VERSIÓN ACTUALIZADA)

const bcrypt = require('bcryptjs');
const { openDB } = require('../config/database');

// Obtener todos los profesores (solo coordinador)
const getProfesores = async (req, res) => {
  try {
    const db = await openDB();
    
    const profesores = await db.all(`
      SELECT id, nombre, usuario, correo, rol, carrera, activo, fecha_creacion 
      FROM usuarios 
      WHERE rol = 'profesor'
      ORDER BY nombre
    `);
    
    await db.close();
    
    res.json({ profesores });
  } catch (error) {
    console.error('Error obteniendo profesores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un nuevo profesor (solo coordinador)
const crearProfesor = async (req, res) => {
  try {
    const { nombre, usuario, correo, contraseña, carrera } = req.body;

    // Validaciones básicas
    if (!nombre || !usuario || !correo || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (contraseña.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const db = await openDB();

    // Verificar si el usuario o correo ya existen
    const usuarioExistente = await db.get(
      'SELECT id FROM usuarios WHERE usuario = ? OR correo = ?',
      [usuario, correo]
    );

    if (usuarioExistente) {
      await db.close();
      return res.status(400).json({ error: 'El usuario o correo ya existen' });
    }

    // Encriptar contraseña
    const contraseñaEncriptada = await bcrypt.hash(contraseña, 10);

    // Insertar nuevo profesor
    const result = await db.run(
      `INSERT INTO usuarios (nombre, usuario, correo, contraseña_encriptada, rol, carrera) 
       VALUES (?, ?, ?, ?, 'profesor', ?)`,
      [nombre, usuario, correo, contraseñaEncriptada, carrera]
    );

    await db.close();

    res.status(201).json({
      mensaje: 'Profesor creado exitosamente',
      profesor: {
        id: result.lastID,
        nombre,
        usuario,
        correo,
        rol: 'profesor',
        carrera
      }
    });

  } catch (error) {
    console.error('Error creando profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Desactivar/activar profesor (solo coordinador)
const toggleProfesorActivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const db = await openDB();
    
    await db.run(
      'UPDATE usuarios SET activo = ? WHERE id = ? AND rol = ?',
      [activo ? 1 : 0, id, 'profesor']
    );

    await db.close();

    res.json({ 
      mensaje: `Profesor ${activo ? 'activado' : 'desactivado'} exitosamente` 
    });

  } catch (error) {
    console.error('Error actualizando profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar perfil de usuario
const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, correo, carrera } = req.body;
    const usuarioId = req.user.id;

    if (!nombre || !correo) {
      return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
    }

    const db = await openDB();

    // Verificar si el correo ya existe en otro usuario
    const correoExistente = await db.get(
      'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
      [correo, usuarioId]
    );

    if (correoExistente) {
      await db.close();
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }

    // Actualizar perfil
    await db.run(
      'UPDATE usuarios SET nombre = ?, correo = ?, carrera = ? WHERE id = ?',
      [nombre, correo, carrera, usuarioId]
    );

    // Obtener usuario actualizado
    const usuarioActualizado = await db.get(
      'SELECT id, nombre, usuario, correo, rol, carrera, activo, fecha_creacion FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    await db.close();

    res.json({
      mensaje: 'Perfil actualizado exitosamente',
      usuario: usuarioActualizado
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cambiar contraseña
const cambiarContraseña = async (req, res) => {
  try {
    const { contraseñaActual, nuevaContraseña } = req.body;
    const usuarioId = req.user.id;

    if (!contraseñaActual || !nuevaContraseña) {
      return res.status(400).json({ error: 'La contraseña actual y nueva son obligatorias' });
    }

    if (nuevaContraseña.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const db = await openDB();

    // Obtener usuario actual
    const usuario = await db.get(
      'SELECT contraseña_encriptada FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (!usuario) {
      await db.close();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const contraseñaValida = await bcrypt.compare(contraseñaActual, usuario.contraseña_encriptada);
    
    if (!contraseñaValida) {
      await db.close();
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Encriptar nueva contraseña
    const nuevaContraseñaEncriptada = await bcrypt.hash(nuevaContraseña, 10);

    // Actualizar contraseña
    await db.run(
      'UPDATE usuarios SET contraseña_encriptada = ? WHERE id = ?',
      [nuevaContraseñaEncriptada, usuarioId]
    );

    await db.close();

    res.json({ mensaje: 'Contraseña cambiada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Exportar datos del usuario en CSV
const exportarDatos = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const db = await openDB();

    // Obtener datos del usuario
    const usuario = await db.get(
      'SELECT * FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    // Obtener archivos del usuario
    const archivos = await db.all(`
      SELECT a.*, m.nombre as materia_nombre 
      FROM archivos_subidos a 
      LEFT JOIN materias m ON a.materia_id = m.id 
      WHERE a.usuario_id = ?
    `, [usuarioId]);

    // Obtener quizzes del usuario
    const quizzes = await db.all(`
      SELECT q.*, m.nombre as materia_nombre, a.nombre_original as archivo_nombre
      FROM quizzes q
      LEFT JOIN archivos_subidos a ON q.archivo_id = a.id
      LEFT JOIN materias m ON a.materia_id = m.id
      WHERE q.usuario_id = ?
    `, [usuarioId]);

    await db.close();

    // Generar CSV
    let csvContent = 'Tutor Inteligente - Exportación de Datos\n\n';
    csvContent += `Usuario: ${usuario.nombre} (${usuario.usuario})\n`;
    csvContent += `Fecha de exportación: ${new Date().toLocaleString('es-ES')}\n\n`;

    // Información del perfil
    csvContent += 'INFORMACIÓN DEL PERFIL\n';
    csvContent += 'Campo,Valor\n';
    csvContent += `Nombre,${usuario.nombre}\n`;
    csvContent += `Usuario,${usuario.usuario}\n`;
    csvContent += `Correo,${usuario.correo}\n`;
    csvContent += `Rol,${usuario.rol}\n`;
    csvContent += `Formación,${usuario.carrera}\n`;
    csvContent += `Fecha de registro,${usuario.fecha_creacion}\n\n`;

    // Archivos subidos
    csvContent += 'ARCHIVOS SUBIDOS\n';
    csvContent += 'ID,Nombre Original,Materia,Fecha Subida\n';
    archivos.forEach(archivo => {
      csvContent += `${archivo.id},"${archivo.nombre_original}","${archivo.materia_nombre}",${archivo.fecha_subida}\n`;
    });
    csvContent += '\n';

    // Quizzes generados
    csvContent += 'QUIZZES GENERADOS\n';
    csvContent += 'ID,Título,Materia,Tipo,Preguntas,Fecha Creación\n';
    quizzes.forEach(quiz => {
      csvContent += `${quiz.id},"${quiz.titulo}","${quiz.materia_nombre}",${quiz.tipo_preguntas},${quiz.cantidad_preguntas},${quiz.fecha_creacion}\n`;
    });

    // Configurar headers para descarga CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=datos-${usuario.usuario}-${Date.now()}.csv`);
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error exportando datos:', error);
    res.status(500).json({ error: 'Error interno del servidor al exportar datos' });
  }
};

module.exports = { 
  getProfesores, 
  crearProfesor, 
  toggleProfesorActivo,
  actualizarPerfil,
  cambiarContraseña,
  exportarDatos
};