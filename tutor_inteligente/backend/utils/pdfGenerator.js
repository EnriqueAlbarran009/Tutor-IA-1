// utils/pdfGenerator.js - VERSIÓN MEJORADA CON CAMBIOS SOLICITADOS

const PDFDocument = require('pdfkit');

// Generar PDF del examen para estudiantes
const generarPDFExamen = (quiz, opciones = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      // Colectar chunks de datos del PDF
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { incluirRespuestas = false } = opciones;

      // === ENCABEZADO SIMPLE ===
      doc.fontSize(16).font('Helvetica-Bold')
         .text('TUTOR INTELIGENTE - SISTEMA DE EVALUACIÓN', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12).font('Helvetica')
         .text(`Materia: ${quiz.materia_nombre || 'No especificada'}`, { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(14).font('Helvetica-Bold')
         .text(quiz.titulo, { align: 'center' });
      
      doc.moveDown(2);

      // === SOLO PARA EXAMEN (NO PARA RESPUESTAS): Información del estudiante ===
      if (!incluirRespuestas) {
        doc.fontSize(10)
           .text('Nombre: _________________________________________')
           .text('Matrícula: ______________________________________')
           .text('Fecha: __________________________________________');
        
        doc.moveDown(2);
      }
      
      // Línea separadora
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // === PREGUNTAS ===
      const preguntas = typeof quiz.preguntas === 'string' 
        ? JSON.parse(quiz.preguntas) 
        : quiz.preguntas;

      preguntas.forEach((pregunta, index) => {
        // Verificar espacio para nueva página
        if (doc.y > 650) {
          doc.addPage();
          // Encabezado simple en páginas adicionales
          doc.fontSize(10).text(`Continuación - ${quiz.titulo} - Página ${doc.bufferedPageRange().count}`, { align: 'center' });
          doc.moveDown();
        }

        // Número de pregunta
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`${index + 1}. ${pregunta.texto}`);
        
        doc.moveDown(0.3);

        // Opciones según tipo
        if (pregunta.tipo === 'opcion_multiple' && pregunta.opciones) {
          pregunta.opciones.forEach((opcion, opcionIndex) => {
            const letra = String.fromCharCode(65 + opcionIndex);
            doc.fontSize(11).font('Helvetica')
               .text(`   ${letra}) ${opcion}`);
          });
        } else if (pregunta.tipo === 'verdadero_falso') {
          doc.fontSize(11).font('Helvetica')
             .text('   ( ) Verdadero      ( ) Falso');
        } else if (pregunta.tipo === 'preguntas_abiertas') {
          doc.fontSize(11).font('Helvetica')
             .text('   ______________________________________________________')
             .text('   ______________________________________________________')
             .text('   ______________________________________________________');
        }

        // Respuesta (solo si se incluye - para PDF de respuestas)
        if (incluirRespuestas && pregunta.respuesta) {
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('blue')
             .text(`   Respuesta: ${pregunta.respuesta}`)
             .fillColor('black');
        }

        doc.moveDown();
      });

      // === PIE DE PÁGINA SIMPLE ===
      const totalPages = doc.bufferedPageRange().count;
      
      // Solo agregar pie de página si hay más de una página
      if (totalPages > 1) {
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).fillColor('gray')
             .text(`Página ${i + 1} de ${totalPages}`, 50, 800, { align: 'center' })
             .fillColor('black');
        }
      }

      doc.end();

    } catch (error) {
      console.error('Error en PDF Generator:', error);
      reject(error);
    }
  });
};

// Generar PDF de respuestas
const generarPDFRespuestas = (quiz) => {
  return generarPDFExamen(quiz, { incluirRespuestas: true });
};

// Formatear tipo de preguntas
const formatearTipoPreguntas = (tipo) => {
  const formatos = {
    'opcion_multiple': 'Opción Múltiple',
    'verdadero_falso': 'Verdadero/Falso', 
    'preguntas_abiertas': 'Preguntas Abiertas'
  };
  return formatos[tipo] || tipo;
};

module.exports = { generarPDFExamen, generarPDFRespuestas };