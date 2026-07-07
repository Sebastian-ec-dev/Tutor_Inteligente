import { ClassContentType } from './ClassContentType';

export type AIModelCapability = {
  id: string;
  provider: string;
  modelName: string;
  routeLabel: string;
  bestFor: string;
  usedWhen: string;
  contentTypes?: ClassContentType[];
};

export const AI_MODEL_CAPABILITIES: AIModelCapability[] = [
  {
    id: 'google-gemini-flash',
    provider: 'Google Gemini',
    modelName: 'Gemini 2.5 Flash',
    routeLabel: 'Ruta conceptual rápida',
    bestFor: 'clases teóricas, resúmenes rápidos, explicación de conceptos y organización de apuntes.',
    usedWhen: 'Se usa cuando el contenido es teórico o general.',
    contentTypes: ['theory', 'general'],
  },
  {
    id: 'openai-gpt-41-light',
    provider: 'OpenAI',
    modelName: 'GPT-4.1 mini / modo Light',
    routeLabel: 'Ruta de razonamiento y visión',
    bestFor: 'problemas matemáticos, razonamiento paso a paso, ejercicios con fórmulas e interpretación de imágenes.',
    usedWhen: 'Se usa cuando el contenido es matemático o visual.',
    contentTypes: ['math', 'image'],
  },
  {
    id: 'openai-whisper-transcriptor',
    provider: 'OpenAI',
    modelName: 'Whisper / transcriptor de audio',
    routeLabel: 'Ruta de transcripción',
    bestFor: 'convertir grabaciones de clase en texto limpio para que luego el core genere resúmenes, tareas y contexto directo para el chat.',
    usedWhen: 'Se usa en la etapa de audio antes del análisis académico.',
  },
  {
    id: 'local-mock-ai',
    provider: 'Local',
    modelName: 'Mock AI',
    routeLabel: 'Ruta de pruebas sin API',
    bestFor: 'probar navegación, botones, guardado, resumen simulado y chat con contexto directo sin consumir claves externas.',
    usedWhen: 'Se activa con EXPO_PUBLIC_USE_MOCK_AI=true.',
  },
];

export function getModelCapabilityByContentType(contentType: ClassContentType): AIModelCapability {
  return (
    AI_MODEL_CAPABILITIES.find((model) => model.contentTypes?.includes(contentType)) ||
    AI_MODEL_CAPABILITIES[0]
  );
}
