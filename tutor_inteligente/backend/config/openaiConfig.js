// ================================================================
// Generador de Preguntas Avanzado — DeepSeek + Procesamiento de Texto
// Versión CommonJS (require/module.exports)
// ================================================================

const dotenv = require("dotenv");
const OpenAI = require("openai");

// ================================================================
// Cargar variables de entorno
// ================================================================
dotenv.config();

// ================================================================
// Cliente DeepSeek
// ================================================================
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

// ================================================================
// Utilidad: limpia y reduce el texto si es demasiado extenso
// ================================================================
const limpiarTexto = (texto) => {
  if (!texto) return "";

  return texto
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 18000);
};

// ================================================================
// Prompt avanzado (SIN extracción de conceptos)
// ================================================================
const crearPromptPreguntas = (textoDocumento, tipo, cantidad, materia) => {
  return `
Eres un experto en diseño pedagógico y generación de evaluaciones de alta calidad.

Debes generar preguntas totalmente naturales, variadas, profundas y basadas EXCLUSIVAMENTE en el contenido del texto proporcionado.

================================================================
INSTRUCCIONES GENERALES
================================================================
- NO inventes información que NO esté en el documento.
- NO uses plantillas genéricas.
- NO generes preguntas obvias o triviales.
- Usa terminología, hechos, eventos, conceptos y relaciones reales mencionadas en el documento.
- Asegúrate de que cada pregunta sea diferente y no se repita en estructura.
- Las preguntas deben sentirse como si un profesor humano experto hubiera leído el documento.

================================================================
TIPOS DE PREGUNTAS
================================================================

1) opcion_multiple
   - Genera una pregunta clara y natural basada en algo que SÍ esté en el documento.
   - Crea 4 opciones plausibles.
   - EXACTAMENTE UNA debe ser la respuesta correcta.
   - Las otras 3 deben ser distractores creíbles y relacionados.
   - Coloca la respuesta correcta en una posición aleatoria entre A, B, C o D.
   - No escribas explicación.

   Formato:
   {
     "texto":"pregunta",
     "tipo":"opcion_multiple",
     "opciones":["A","B","C","D"],
     "respuesta":"A"
   }

2) verdadero_falso
   - Genera una afirmación basada en el contenido del documento.
   - Mezcla natural de Verdadero y Falso.

   Formato:
   {
     "texto":"afirmacion",
     "tipo":"verdadero_falso",
     "respuesta":"Verdadero"
   }

3) preguntas_abiertas
   - Genera preguntas abiertas que requieran comprensión profunda.
   - No entregues respuestas ni puntos clave.

   Formato:
   {
     "texto":"pregunta",
     "tipo":"preguntas_abiertas"
   }

================================================================
DOCUMENTO A ANALIZAR
================================================================
"${textoDocumento}"

================================================================
REGLAS FINALES
================================================================
Devuelve EXCLUSIVAMENTE un array JSON con las preguntas.
================================================================
`;
};

// ================================================================
// Función principal
// ================================================================
async function generarPreguntasAvanzado(textoDocumento, tipo, cantidad, materia) {
  try {
    const textoLimpio = limpiarTexto(textoDocumento);

    const prompt = crearPromptPreguntas(textoLimpio, tipo, cantidad, materia);

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "Eres un generador experto de preguntas académicas basadas en contenido." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8
    });

    const raw = response.choices[0].message.content.trim();

    const inicio = raw.indexOf("[");
    const fin = raw.lastIndexOf("]");

    if (inicio === -1 || fin === -1) {
      throw new Error("DeepSeek no devolvió un JSON válido.");
    }

    const json = raw.substring(inicio, fin + 1);

    return JSON.parse(json);

  } catch (error) {
    console.error("❌ ERROR en generarPreguntasAvanzado:", error);
    return { error: "Ocurrió un problema al generar las preguntas." };
  }
}

// ================================================================
// Exportar en CommonJS
// ================================================================
module.exports = { 
  generarPreguntasConOpenAI: generarPreguntasAvanzado 
};