// database/updatePassword.js - Actualizar contraseña a encriptada (VERSIÓN CORREGIDA)
require('dotenv').config(); // ¡ESTA LÍNEA FALTABA!
const bcrypt = require('bcryptjs');
const { openDB } = require('../config/database');

const updatePassword = async () => {
  try {
    const db = await openDB();
    const contraseñaPlana = 'admin123';
    const contraseñaEncriptada = await bcrypt.hash(contraseñaPlana, 10);
    
    await db.run(
      'UPDATE usuarios SET contraseña_encriptada = ? WHERE usuario = ?',
      [contraseñaEncriptada, 'admin']
    );
    
    console.log('Contraseña actualizada correctamente');
    console.log('Usuario: admin');
    console.log('Contraseña: admin123');
    console.log('Contraseña encriptada:', contraseñaEncriptada);
    
    await db.close();
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
  }
};

updatePassword();