-- schema.sqlite.sql - Esquema adaptado para SQLite (VERSIÓN CORREGIDA)

-- Tabla para los Coordinadores y Profesores
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    correo TEXT UNIQUE NOT NULL,
    contraseña_encriptada TEXT NOT NULL,
    rol TEXT CHECK(rol IN ('coordinador', 'profesor')) NOT NULL,
    carrera TEXT,
    activo BOOLEAN DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Materias (Catálogo)
CREATE TABLE IF NOT EXISTS materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla que relaciona Profesores con las Materias que imparten
CREATE TABLE IF NOT EXISTS profesor_materia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profesor_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
);

-- Insertar un usuario coordinador por defecto (si no existe)
-- Contraseña: "admin123" (la encriptaremos después en el código)
INSERT OR IGNORE INTO usuarios (nombre, usuario, correo, contraseña_encriptada, rol, carrera) 
VALUES ('Coordinador Principal', 'admin', 'coordinador@universidad.edu', 'placeholder_para_contraseña_encriptada', 'coordinador', 'Ingeniería en Software');

-- Insertar algunas materias de ejemplo (si no existen)
INSERT OR IGNORE INTO materias (nombre, descripcion) VALUES 
('Inteligencia Artificial', 'Fundamentos y aplicaciones de la IA.'),
('Ingeniería de Software', 'Procesos de desarrollo de software.'),
('Programación Orientada a Objetos', 'Principios de POO y diseño.');

-- Tabla para archivos subidos
CREATE TABLE IF NOT EXISTS archivos_subidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    nombre_original TEXT NOT NULL,
    nombre_guardado TEXT NOT NULL,
    ruta TEXT NOT NULL,
    tipo_mime TEXT NOT NULL,
    contenido_extraido TEXT,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
);

-- Tabla para quizzes generados
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    archivo_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    tipo_preguntas TEXT NOT NULL,
    cantidad_preguntas INTEGER NOT NULL,
    preguntas TEXT NOT NULL, -- JSON con las preguntas y respuestas
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (archivo_id) REFERENCES archivos_subidos(id) ON DELETE CASCADE
);