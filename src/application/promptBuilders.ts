import { ClassContentType } from '../domain/entities/ClassContentType';
import { ConversationMessage } from '../domain/entities/ConversationMessage';

const MAX_HISTORY = 10;

export function buildConversationHistory(messages: ConversationMessage[]) {
  if (!messages.length) return '';

  const recentMessages = messages.slice(-MAX_HISTORY);
  const lines = recentMessages.map(
    (message) =>
      `${message.sender === 'user' ? 'Estudiante' : 'Tutor'}: ${message.text}`,
  );

  return [
    'Historial reciente de esta misma conversación:',
    lines.join('\n'),
    '',
  ].join('\n');
}

export function buildTutorPrompt(input: {
  contextText: string;
  userMessage: string;
  subjectName?: string;
  classTitle?: string;
  webSearchEnabled?: boolean;
}) {
  const topic = input.classTitle || input.subjectName || 'la clase seleccionada';

  return `
Eres el tutor académico personalizado de AulaIA.

TEMA FIJO DE ESTA CONVERSACIÓN:
"${topic}"

OBJETIVO:
Ayudar al estudiante a comprender, practicar y profundizar únicamente el tema fijo de esta conversación. Usa primero los apuntes de la clase y después conocimiento académico complementario relacionado.

REGLAS DE PERSISTENCIA TEMÁTICA:
- Mantén todas las respuestas directamente relacionadas con "${topic}".
- No cambies a otra materia o tema aunque el estudiante lo solicite dentro de este chat.
- Si la pregunta no guarda relación con "${topic}", responde brevemente que debe crear otro chat en la materia o clase correspondiente y vuelve a ofrecer ayuda sobre el tema actual.
- Las preguntas de seguimiento deben conservar el hilo de esta conversación.
- Nunca mezcles información de otras clases guardadas.

USO DE FUENTES EXTERNAS:
- ${input.webSearchEnabled ? 'Puedes consultar la web únicamente para reforzar este mismo tema con fuentes académicas o confiables.' : 'No tienes búsqueda web habilitada en esta conversación.'}
- Si usas información externa, intégrala como refuerzo, no como reemplazo de los apuntes.
- No uses la búsqueda para desviarte del tema fijo.
- Cuando sea útil, incluye una ayuda visual en Markdown: tabla comparativa, esquema, pasos numerados, fórmula o diagrama textual sencillo.

ESTILO DIDÁCTICO:
- Explica con claridad y vocabulario apropiado para un estudiante universitario.
- Da ejemplos, analogías o ejercicios cuando aporten al aprendizaje.
- En matemáticas, muestra el procedimiento paso a paso.
- Si los apuntes no contienen un dato específico, indícalo y diferencia claramente el refuerzo general.
- No inventes fechas, tareas, instrucciones del docente ni datos de la clase.
- No reveles ni repitas contraseñas, correos, usuarios, teléfonos, identificaciones o datos personales.

CONTEXTO DIRECTO DE LA CLASE:
"""
${input.contextText || 'No se encontraron apuntes procesados.'}
"""

PREGUNTA DEL ESTUDIANTE:
${input.userMessage}
`;
}

export function buildTaskDetectionPrompt(input: {
  transcript: string;
  summary?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return `
Eres un clasificador académico especializado en detectar tareas reales dentro de una clase.

FECHA ACTUAL: ${today}

OBJETIVO:
Determinar con criterio semántico si el docente asignó acciones concretas que el estudiante debe realizar después de la clase. No uses coincidencias de palabras aisladas.

CONSIDERA TAREA SOLO CUANDO:
- Existe una instrucción explícita o inequívoca dirigida al estudiante o al grupo.
- La acción debe realizarse, entregarse, prepararse, investigarse, resolverse, leerse o presentarse después.
- El contexto confirma que es una asignación real, aunque el docente no diga literalmente “tarea” o “deber”.

NO CONSIDERES TAREA:
- Definiciones o explicaciones sobre qué es una tarea.
- Ejemplos hipotéticos, ejercicios resueltos durante la clase o frases citadas.
- Comentarios como “esta tarea es sencilla” sin una instrucción concreta identificable.
- Recomendaciones generales de estudio que no hayan sido asignadas.
- Palabras aisladas como tarea, consultar, investigar, entregar o presentar sin contexto de obligación.
- Acciones ambiguas. Ante la duda, no las incluyas.

REGLAS:
- No inventes tareas, detalles, fechas ni responsables.
- Resume cada tarea en un título breve y claro.
- En details conserva la instrucción concreta y la información útil.
- dueDate debe ser YYYY-MM-DD o null. Resuelve expresiones como “mañana” usando la fecha actual, pero no supongas fechas no mencionadas.
- confidence debe ser un número entre 0 y 1.
- Devuelve únicamente JSON válido, sin Markdown ni explicaciones.

FORMATO OBLIGATORIO:
{
  "tasks": [
    {
      "isTask": true,
      "title": "Título corto de la tarea",
      "details": "Instrucción concreta asignada por el docente",
      "dueDate": "YYYY-MM-DD o null",
      "confidence": 0.95
    }
  ]
}

Si no hay una asignación real, devuelve exactamente:
{"tasks":[]}

TRANSCRIPCIÓN:
"""
${input.transcript}
"""

RESUMEN DE APOYO:
"""
${input.summary || ''}
"""
`;
}

export function buildTranscriptionPrompt() {
  return `
Transcribe el audio de la clase de forma clara y ordenada.

Reglas de privacidad:
- Si escuchas contraseñas, usuarios, correos, números de identificación, teléfonos, claves, insultos o datos personales, omítelos por completo.
- No inventes contenido.
- Mantén solo información útil para el estudio.
- No escribas avisos como “dato sensible eliminado”, “información bloqueada” o similares.

Devuelve únicamente la transcripción limpia.
`;
}

export function buildClassAnalysisPrompt(
  content: string,
  contentType: ClassContentType,
) {
  const baseRules = `
Analiza el siguiente contenido académico y genera apuntes de estudio fieles a la clase.

Reglas:
- No incluyas contraseñas, usuarios, correos, teléfonos, identificaciones ni datos personales. Omite esos fragmentos sin avisarlo.
- Organiza la respuesta en Markdown.
- No inventes información, instrucciones del docente, tareas ni fechas.
- Resume y organiza; no copies toda la transcripción.
- Devuelve la información con esta estructura obligatoria:
  # Título del tema
  ## Resumen general
  ## Temas tratados
  ## Conceptos y puntos importantes
  ## Posibles preguntas importantes
  ## Recomendaciones de estudio
- En “Resumen general” explica en pocas líneas el propósito y contenido principal de la clase.
- En “Temas tratados” enumera los bloques temáticos realmente mencionados.
- En “Conceptos y puntos importantes” incluye definiciones, procedimientos, fórmulas o ideas esenciales.
- En “Posibles preguntas importantes” genera preguntas de repaso o evaluación basadas exclusivamente en el audio.
- La detección de tareas se realiza mediante un clasificador de IA separado; no agregues una sección de tareas en esta respuesta.
`;

  if (contentType === 'math') {
    return `${baseRules}
Ruta IA seleccionada: OpenAI GPT-4.1 mini / modo Light.
Tipo de contenido: Matemática o ejercicios.
Instrucciones específicas:
- Explica procedimientos paso a paso.
- Conserva fórmulas importantes.
- Señala errores comunes o recomendaciones de resolución.
- Si hay un ejercicio, presenta el método y no solo la respuesta.

Contenido limpio:
"""
${content}
"""
`;
  }

  return `${baseRules}
Ruta IA seleccionada: Google Gemini 2.5 Flash.
Tipo de contenido: Teórico o general.
Instrucciones específicas:
- Resume ideas principales.
- Identifica definiciones y relaciones entre conceptos.
- Genera apuntes útiles para estudiar después.

Contenido limpio:
"""
${content}
"""
`;
}
