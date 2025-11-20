// controllers/authController.js - Lógica para el login

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { openDB } = require('../config/database');

const login = async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

    // 1. Validar que vengan los datos necesarios
    if (!usuario || !contraseña) {
      return res.status(400).json({ 
        error: 'Por favor proporciona usuario y contraseña' 
      });
    }

    const db = await openDB();

    // 2. Buscar el usuario en la base de datos
    const user = await db.get(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1',
      [usuario]
    );

    await db.close();

    // 3. Verificar si el usuario existe
    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // 4. Verificar la contraseña (comparar con la encriptada)
    const contraseñaValida = await bcrypt.compare(contraseña, user.contraseña_encriptada);
    
    if (!contraseñaValida) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // 5. Crear el token JWT (sesión)
    const token = jwt.sign(
      { 
        id: user.id, 
        usuario: user.usuario, 
        rol: user.rol,
        nombre: user.nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // El token expira en 8 horas 8h
    );

    // 6. Enviar respuesta exitosa
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        carrera: user.carrera
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login };