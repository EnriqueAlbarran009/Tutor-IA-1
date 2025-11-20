// database/initDB.js - Inicializa la base de datos SQLite (VERSIÓN CORREGIDA)

const fs = require('fs');
const path = require('path');
const { openDB } = require('../config/database');

const initDatabase = async () => {
  try {
    // Crear la carpeta database si no existe
    const dbDir = path.dirname(process.env.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = await openDB();
    
    // Leer y ejecutar el schema SQL
    const schemaPath = path.join(__dirname, 'schema.sqlite.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Ejecutar cada sentencia SQL por separado
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.exec(statement);
      }
    }

    console.log('BASE DE DATOS SQLITE INICIALIZADA CORRECTAMENTE');
    await db.close();
  } catch (error) {
    // Si el error es por datos duplicados, es normal después del primer inicio
    if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed')) {
      console.log('La base de datos ya estaba inicializada (datos duplicados ignorados)');
    } else {
      console.error('ERROR AL INICIALIZAR LA BASE DE DATOS:', error.message);
    }
  }
};

// Ejecutar la inicialización si este archivo se ejecuta directamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;