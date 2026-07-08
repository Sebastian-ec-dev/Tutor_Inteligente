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
    'La respuesta debe partir del tema de la clase o audio seleccionado y puede reforzarse con explicación académica general relacionada. ' +
    'No cambies a temas ajenos a la clase seleccionada.\n' +
    `${lines.join('\n')}\n\n`
  );
}

export function buildTutorPrompt(
  contextText: string,
  userMessage: string,
  options?: { selectedClassTitle?: string },
) {
  const selectedClassTitle = options?.selectedClassTitle || 'Clase seleccionada';

  return `
Eres AulaIA, un tutor inteligente para un estudiante universitario.

Tema base de estudio:
${selectedClassTitle}

Objetivo:
Ayudar al estudiante a aprender el tema de la clase/audio seleccionado. Usa el contexto de la clase como punto de partida y, cuando sea útil para reforzar el aprendizaje, complementa con conocimiento académico general relacionado con ese mismo tema.

Cómo debes trabajar:
1. Identifica el tema central usando el título, resumen, transcripción y pregunta del estudiante.
2. Responde primero con base en la clase/audio seleccionado.
3. Luego puedes reforzar con explicaciones generales, definiciones, ejemplos, analogías, pasos de estudio o preguntas de práctica relacionadas con el mismo tema.
4. Si agregas información que no aparece literalmente en la clase, sepárala con el título "Refuerzo general para aprender".
5. Si la pregunta está fuera del tema de la clase/audio, indícalo y redirige la respuesta al tema más cercano del contexto.
6. No afirmes que buscaste en internet ni cites fuentes externas si no fueron proporcionadas por la app.
7. No inventes datos específicos de la clase, tareas, fechas, nombres, calificaciones o instrucciones del docente.
8. No reveles ni repitas datos sensibles como contraseñas, correos, usuarios, teléfonos, identificaciones o claves.
9. Responde con orden, tono didáctico y ejemplos fáciles de entender.

Contexto de la clase/audio seleccionado:
"""
${contextText || 'No se encontraron apuntes procesados para la clase seleccionada.'}
"""

Pregunta del estudiante:
${userMessage}
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

export function buildClassAnalysisPrompt(content: string, contentType: ClassContentType) {
  const baseRules = `
Analiza el siguiente contenido académico y genera apuntes de estudio.

Enfoque:
- Usa el contenido entregado de esta clase/audio como base principal.
- Detecta el tema central de la clase y mantén el resumen alineado a ese tema.
- Puedes agregar refuerzo académico general relacionado con el tema para que el estudiante aprenda mejor.
- Si agregas información complementaria, sepárala como refuerzo y no la presentes como si el docente la hubiera dicho.
- No mezcles información de otras clases ni inventes datos específicos de esta clase.

Reglas:
- No incluyas contraseñas, usuarios, correos, teléfonos, identificaciones ni datos personales. Omite esos fragmentos sin avisarlo.
- Organiza la respuesta en Markdown.
- Evita contenido innecesario que fomente la vaguedad; enfócate en aprendizaje y atención.
- No escribas avisos como “dato sensible eliminado”, “información bloqueada” o similares.
- No inventes tareas, fechas, conceptos o conclusiones si no aparecen en el contenido.
- Devuelve la información con esta estructura obligatoria:
  # Título del tema
  ## Resumen general
  ## Conceptos clave
  ## Puntos importantes
  ## Posibles preguntas de prueba o examen
  ## Refuerzo para aprender
  ## Ejemplos prácticos
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
- Refuerza el tema con definiciones, ejemplos y ejercicios similares cuando ayude a comprender mejor.
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
- Refuerza el tema con explicación académica general relacionada cuando ayude al aprendizaje.
- Si hay ejercicios, explica el procedimiento.

Contenido limpio:
"""
${content}
"""
`;
  }

  return `${baseRules}
Ruta IA seleccionada: modelo conceptual configurable.
Fortaleza esperada: análisis de clases teóricas, resúmenes conceptuales y organización de apuntes.

Tipo de contenido: Teórico o general.
Instrucciones específicas:
- Resume ideas principales.
- Identifica definiciones y relaciones entre conceptos.
- Agrega refuerzo académico general relacionado con el tema cuando ayude a comprender mejor.
- Propón ejemplos sencillos y preguntas de práctica para estudiar.
- Genera apuntes útiles para estudiar después.

Contenido limpio:
"""
${content}
"""
`;
}
