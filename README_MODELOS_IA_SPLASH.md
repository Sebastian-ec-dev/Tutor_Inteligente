# Cambios implementados: Router IA + Splash Screen

## 1. Pantalla de carga de 3 segundos

Se agregó `src/screens/SplashScreen.tsx`.

La app muestra una pantalla de carga inicial durante al menos 3 segundos antes de entrar al login o al home. La pantalla indica que se están preparando:

- Transcriptor de audio.
- Router de modelos IA.
- Supabase y RAG.

El control se implementó en `src/navigation/AppNavigator.tsx` usando `MIN_SPLASH_MS = 3000`.

## 2. Catálogo de modelos IA

Se agregó `src/domain/entities/AIModelCapability.ts` con la lista de modelos y su fortaleza:

- **Google Gemini 2.5 Flash**: mejor para clases teóricas, resúmenes rápidos, explicación de conceptos y organización de apuntes.
- **OpenAI GPT-4.1 mini / modo Light**: mejor para ejercicios matemáticos, razonamiento paso a paso, fórmulas e interpretación de imágenes.
- **OpenAI Whisper / transcriptor de audio**: mejor para convertir grabaciones de clase en texto limpio.
- **Mock AI**: mejor para probar sin APIs reales, sin consumir Gemini ni OpenAI.

## 3. Cambio en la pantalla de audio

Se actualizó `src/screens/AudioScreen.tsx`.

Antes se mostraba una lista directa tipo `Clase teórica → Gemini`. Ahora la pantalla muestra el nombre de la IA y en qué es mejor cada modelo.

También muestra cuál modelo se selecciona según el tipo de contenido académico.

## 4. Router de modelos IA

Se actualizó `src/infrastructure/ai/AIModelRouter.ts`.

El router mantiene la decisión técnica dentro de infraestructura, pero el core trabaja mediante el puerto `AIModelRouterPort`.

La pantalla no llama directamente a Gemini, GPT ni Whisper.

## 5. Transcripción de audio

Se actualizó `src/infrastructure/ai/WhisperTranscriptionAdapter.ts`.

La ruta de audio usa OpenAI Whisper / transcriptor cuando existe API key. Si no existe o falla, usa un transcriptor de respaldo para que el prototipo no se rompa durante pruebas.

Para pruebas sin API:

```env
EXPO_PUBLIC_USE_MOCK_AI=true
```

## 6. Prompt estructurado

Se actualizó `src/application/promptBuilders.ts` para que la respuesta del procesamiento tenga esta estructura:

- Título del tema.
- Resumen general.
- Conceptos clave.
- Puntos importantes.
- Posibles preguntas de prueba o examen.
- Tareas detectadas.
- Fecha de entrega detectada.
- Recomendaciones de estudio.

## 7. Variables nuevas del .env

El proyecto acepta estas variables:

```env
EXPO_PUBLIC_OPENAI_MATH_MODEL=gpt-4.1-mini
EXPO_PUBLIC_OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
EXPO_PUBLIC_USE_MOCK_AI=true
```

Si no se configuran claves de OpenAI, el proyecto puede seguir funcionando con Mock AI o con adaptador de respaldo según el modo configurado.
