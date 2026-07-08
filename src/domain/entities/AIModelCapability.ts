import { ClassContentType } from './ClassContentType';
import { AIProvider } from './AIProvider';

export type AIModelCapability = {
  id: string;
  provider: string;
  providerKey?: AIProvider;
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
    providerKey: 'gemini',
    modelName: 'Gemini 2.5 Flash',
    routeLabel: 'Ruta conceptual rápida',
    bestFor: 'clases teóricas, resúmenes rápidos, explicación de conceptos y organización de apuntes.',
    usedWhen: 'Se puede elegir para respuestas rápidas, teoría y resúmenes cuando Gemini esté disponible.',
    contentTypes: ['theory', 'general'],
  },
  {
    id: 'openai-gpt-41-light',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelName: 'GPT-4.1 mini / modo Light',
    routeLabel: 'Ruta de razonamiento, chat y visión',
    bestFor: 'preguntas complejas, razonamiento paso a paso, ejercicios con fórmulas, documentos e interpretación de imágenes.',
    usedWhen: 'Se puede elegir para chat, matemáticas, imágenes y documentos de apoyo.',
    contentTypes: ['math', 'image', 'theory', 'general'],
  },
  {
    id: 'openai-transcriptor-economico',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelName: 'gpt-4o-mini-transcribe',
    routeLabel: 'Ruta económica de transcripción',
    bestFor: 'convertir audios largos de clase a texto con el menor costo posible dentro de OpenAI.',
    usedWhen: 'Se usa únicamente para pasar audio a texto antes de generar resúmenes o responder preguntas.',
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

export function getModelCapabilityByContentType(contentType: ClassContentType, provider?: AIProvider): AIModelCapability {
  if (provider === 'openai') {
    return AI_MODEL_CAPABILITIES.find((model) => model.id === 'openai-gpt-41-light') || AI_MODEL_CAPABILITIES[1];
  }

  if (provider === 'gemini') {
    return AI_MODEL_CAPABILITIES.find((model) => model.id === 'google-gemini-flash') || AI_MODEL_CAPABILITIES[0];
  }

  return (
    AI_MODEL_CAPABILITIES.find((model) => model.contentTypes?.includes(contentType) && model.id !== 'openai-transcriptor-economico') ||
    AI_MODEL_CAPABILITIES[0]
  );
}
