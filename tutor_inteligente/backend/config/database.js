// config/database.js - CONFIGURACIÓN PARA SQLITE

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Función para abrir la conexión a la base de datos
const openDB = async () => {
  return await open({
    filename: process.env.DB_PATH, // Ruta del archivo de la base de datos
    driver: sqlite3.Database
  });
};

// Función para probar la conexión
const testConnection = async () => {
  try {
    const db = await openDB();
    await db.get('SELECT 1 as test'); // Consulta simple de prueba
    console.log('CONEXIÓN A SQLITE EXITOSA');
    await db.close();
  } catch (error) {
    console.error('ERROR AL CONECTAR A SQLITE:', error.message);
  }
};

// Exportamos las funciones para usar en otras partes
module.exports = { openDB, testConnection };