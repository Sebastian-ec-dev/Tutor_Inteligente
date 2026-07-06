import { ClassContentType } from '../domain/entities/ClassContentType';
import { ConversationMessage } from '../domain/entities/ConversationMessage';

const MAX_HISTORY = 5;

export function buildConversationHistory(messages: ConversationMessage[]) {
  if (!messages.length) return '';

  const recentMessages = messages.slice(-MAX_HISTORY);
  const lines = recentMessages.map(
    (message) => `${message.sender === 'user' ? 'Estudiante' : 'Tutor'}: ${message.text}`,
  );

  return (
    'Historial reciente de la conversación. Úsalo solo para entender preguntas de seguimiento. ' +
    'La respuesta final debe basarse principalmente en los apuntes recuperados.\n' +
    `${lines.join('\n')}\n\n`
  );
}

export function buildTutorPrompt(contextText: string, userMessage: string) {
  return `
Eres un tutor inteligente para un estudiante universitario.

Objetivo:
Responder preguntas usando principalmente el contexto proporcionado desde los apuntes del estudiante.

Reglas:
- Prioriza la información del contexto.
- Explica con claridad, orden y tono didáctico.
- Si la información es parcial, puedes complementar de forma general, pero no inventes datos específicos.
- Si la respuesta no está en el contexto, indica: "No encontré información suficiente en tus apuntes sobre eso.".
- No reveles ni repitas datos sensibles si aparecen en el contexto.

Contexto de los apuntes:
"""
${contextText || 'No se encontraron fragmentos relevantes.'}
"""

Pregunta del estudiante:
${userMessage}
`;
}

export function buildTranscriptionPrompt() {
  return `
Transcribe el audio de la clase de forma clara y ordenada.

Reglas de privacidad:
- Si escuchas contraseñas, usuarios, correos, números de identificación, teléfonos, claves, insultos o datos personales, reemplázalos por [DATO SENSIBLE ELIMINADO].
- No inventes contenido.
- Mantén solo información útil para el estudio.

Devuelve únicamente la transcripción limpia.
`;
}

export function buildClassAnalysisPrompt(content: string, contentType: ClassContentType) {
  const baseRules = `
Analiza el siguiente contenido académico y genera apuntes de estudio.

Reglas:
- No incluyas contraseñas, usuarios, correos, teléfonos, identificaciones ni datos personales.
- Organiza la respuesta en Markdown.
- Evita contenido innecesario que fomente la vaguedad; enfócate en aprendizaje y atención.
- Devuelve la información con esta estructura obligatoria:
  # Título del tema
  ## Resumen general
  ## Conceptos clave
  ## Puntos importantes
  ## Posibles preguntas de prueba o examen
  ## Tareas detectadas
  ## Fecha de entrega detectada
  ## Recomendaciones de estudio
- Si no hay tareas o fechas, escribe: No se detectaron tareas o fechas de entrega.
`;

  if (contentType === 'math') {
    return `${baseRules}
Ruta IA seleccionada: OpenAI GPT-4.1 mini / modo Light.
Fortaleza esperada: razonamiento paso a paso, ejercicios matemáticos, fórmulas y explicación de procedimientos.

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

  if (contentType === 'image') {
    return `${baseRules}
Ruta IA seleccionada: OpenAI GPT-4.1 mini / modo Light.
Fortaleza esperada: interpretación visual, ejercicios con imágenes, diagramas y razonamiento escrito.

Tipo de contenido: Contenido con imágenes, diagramas o ejercicios visuales.
Instrucciones específicas:
- Explica lo visual de forma textual cuando aplique.
- Relaciona la imagen con los conceptos de la clase.
- Si hay ejercicios, explica el procedimiento.

Contenido limpio:
"""
${content}
"""
`;
  }

  return `${baseRules}
Ruta IA seleccionada: Google Gemini 2.5 Flash.
Fortaleza esperada: análisis rápido de clases teóricas, resúmenes conceptuales y organización de apuntes.

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
