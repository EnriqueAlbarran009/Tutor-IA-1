// config/multerConfig.js - Configuración de Multer para subida de archivos

const multer = require('multer');
const path = require('path');
const { ensureUploadsDir, isValidFileType } = require('../utils/fileUtils');

// Configurar almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Crear nombre único: timestamp + número random + extensión original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'archivo-' + uniqueSuffix + fileExtension);
  }
});

// Filtrar archivos por tipo
const fileFilter = (req, file, cb) => {
  if (isValidFileType(file.mimetype, file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDF, PPT, DOC, DOCX, TXT y otros formatos de texto'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10MB
  }
});

module.exports = upload;