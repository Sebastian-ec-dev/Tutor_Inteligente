import { AIModelPort, AITextPart } from '../../../domain/ports/AIModelPort';
import { ClassContentType } from '../../../domain/entities/ClassContentType';
import { getModelCapabilityByContentType } from '../../../domain/entities/AIModelCapability';

export class MockAIModelAdapter implements AIModelPort {
  constructor(readonly name: string) {}

  async generateText(prompt: string, _attachment?: AITextPart): Promise<string> {
    return this.buildResponse('Resultado simulado del Tutor IA', prompt, 'general');
  }

  async analyzeClass(input: { content: string; contentType: ClassContentType }): Promise<string> {
    const capability = getModelCapabilityByContentType(input.contentType);
    return this.buildResponse(`${capability.provider} ${capability.modelName} simulado`, input.content, input.contentType);
  }

  private buildResponse(title: string, content: string, contentType: ClassContentType | 'general') {
    const preview = content.trim().slice(0, 700) || 'No se recibió contenido.';

    return `# ${title}\n\n` +
      `**Modelo seleccionado:** ${this.name}\n\n` +
      `**Tipo de contenido:** ${contentType}\n\n` +
      `## Resumen general\n` +
      `Este es un resultado de prueba generado sin consumir APIs externas. Sirve para verificar navegación, botones, guardado y chat con contexto directo.\n\n` +
      `## Conceptos clave\n` +
      `- Arquitectura hexagonal: las pantallas llaman casos de uso, no servicios externos directamente.\n` +
      `- Router IA: el core selecciona el adaptador según el tipo de contenido.\n` +
      `- Contexto directo: el resumen y la transcripción guardados se usan como base del chat de la materia.\n\n` +
      `## Puntos importantes\n` +
      `- El flujo puede probarse sin Gemini, OpenAI ni Whisper reales.\n` +
      `- El audio funciona como base de conocimiento para el chat.\n\n` +
      `## Posibles preguntas de prueba o examen\n` +
      `1. ¿Por qué la arquitectura hexagonal permite cambiar de proveedor de IA sin afectar el core?\n` +
      `2. ¿Por qué el contexto directo simplifica el flujo del chat?\n` +
      `3. ¿Cómo ayuda el resumen estructurado al estudio?\n\n` +
      `## Tareas detectadas\n` +
      `No se detectaron tareas o fechas de entrega en el modo simulado.\n\n` +
      `## Fecha de entrega detectada\n` +
      `No se detectaron tareas o fechas de entrega.\n\n` +
      `## Recomendaciones de estudio\n` +
      `- Repasar el resumen generado.\n` +
      `- Hacer preguntas al Tutor IA usando el chat de la materia.\n` +
      `- Revisar los conceptos clave antes de una evaluación.\n\n` +
      `## Contenido analizado\n` +
      `${preview}`;
  }
}
