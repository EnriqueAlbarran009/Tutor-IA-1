// utils/fileUtils.js - Utilidades para manejo de archivos

const path = require('path');
const fs = require('fs');

// Crear la carpeta de uploads si no existe
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Validar tipos de archivo permitidos
const isValidFileType = (mimetype, originalname) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text'
  ];
  
  const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  const fileExtension = path.extname(originalname).toLowerCase();
  
  return allowedTypes.includes(mimetype) && allowedExtensions.includes(fileExtension);
};

// Verificar si el archivo tiene contenido
const hasContent = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size > 0;
  } catch (error) {
    console.error('Error verificando contenido del archivo:', error);
    return false;
  }
};

// Extraer texto de diferentes tipos de archivo (versión simplificada)
const extractTextFromFile = async (filePath, mimetype) => {
  try {
    // Verificar que el archivo tenga contenido
    if (!hasContent(filePath)) {
      throw new Error('El archivo está vacío o no tiene contenido procesable');
    }

    // Por ahora, simulamos la extracción de texto
    // En un proyecto real, usarías librerías como 'pdf-parse' para PDFs
    if (mimetype === 'application/pdf') {
      return `[CONTENIDO SIMULADO DE PDF]
Tema principal: Introducción a la Inteligencia Artificial
La inteligencia artificial es el campo de la informática que se centra en crear máquinas capaces de realizar tareas que normalmente requieren inteligencia humana. Esto incluye aprendizaje, razonamiento, percepción y comprensión del lenguaje natural.

Los principales tipos de IA son:
1. IA débil: Diseñada para una tarea específica
2. IA fuerte: Capaz de entender y aprender cualquier tarea intelectual humana

El machine learning es un subcampo de la IA que permite a las máquinas aprender de datos sin ser programadas explícitamente.`;
    } else if (mimetype === 'text/plain') {
      // Simular lectura de archivo de texto
      const contenido = fs.readFileSync(filePath, 'utf8');
      if (contenido.trim().length === 0) {
        throw new Error('El archivo de texto está vacío');
      }
      return contenido.substring(0, 1000) + '...'; // Limitar contenido para demo
    } else {
      return `[CONTENIDO SIMULADO DEL ARCHIVO]
Este es un contenido de ejemplo sobre ${mimetype.includes('presentation') ? 'presentación' : 'documento'}.
Incluye conceptos clave, definiciones importantes y ejemplos prácticos para evaluación.`;
    }
  } catch (error) {
    console.error('Error extrayendo texto:', error);
    
    // Si el error es por archivo vacío, propagarlo
    if (error.message.includes('vacío') || error.message.includes('contenido')) {
      throw error;
    }
    
    // Si falla, devolver un contenido de ejemplo
    return "Contenido de ejemplo para generación de preguntas. Conceptos clave: definición, características, ejemplos, aplicaciones prácticas.";
  }
};

module.exports = { 
  ensureUploadsDir, 
  isValidFileType, 
  extractTextFromFile,
  hasContent 
};