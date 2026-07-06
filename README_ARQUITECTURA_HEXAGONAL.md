# Reestructuración a Arquitectura Hexagonal - Tutor Inteligente

## Objetivo

El proyecto fue reestructurado para que el núcleo del negocio no dependa directamente de Supabase, Gemini, GPT, Whisper, Expo o React Native.

El núcleo del sistema sigue siendo:

- analizar clases,
- transcribir audio,
- generar apuntes,
- filtrar datos sensibles,
- guardar información,
- generar embeddings,
- responder preguntas mediante RAG.

Las tecnologías externas quedan como adaptadores reemplazables.

## Estructura aplicada

```txt
src/
├── domain/
│   ├── entities/        # Entidades del negocio
│   └── ports/           # Interfaces: contratos que usa el core
│
├── application/
│   ├── usecases/        # Casos de uso del sistema
│   ├── container.ts     # Inyección de dependencias
│   └── promptBuilders.ts
│
├── infrastructure/
│   ├── supabase/        # Adaptadores de base de datos y autenticación
│   ├── ai/              # Adaptadores Gemini, GPT, router IA, transcripción
│   ├── privacy/         # Filtro de datos sensibles
│   └── expo/            # Lectura de archivos del dispositivo
│
├── presentation/
│   # En este proyecto la presentación se mantiene en screens, navigation y components
│
├── screens/             # Pantallas React Native
├── navigation/
├── components/
└── shared/
```

## Flujo hexagonal principal

```txt
Pantalla React Native
    ↓
Caso de uso
    ↓
Puertos del dominio
    ↓
Adaptadores externos
    ↓
Supabase / Gemini / GPT / Expo / Filtro de privacidad
```

## Cambio principal frente a la versión anterior

Antes las pantallas llamaban directamente a Supabase y Gemini:

```txt
HomeScreen → Supabase
AudioScreen → Supabase + Gemini + FileSystem
ChatbotScreen → Supabase + Gemini
```

Ahora las pantallas llaman a casos de uso:

```txt
HomeScreen → ListSubjectsUseCase / CreateSubjectUseCase
AudioScreen → ProcessAudioNoteUseCase
ChatbotScreen → AskTutorUseCase
```

## Router de modelos IA

Se agregó un router de IA para bifurcar el análisis según el tipo de clase:

```txt
Clase teórica     → Gemini Flash
Tema general      → Gemini Flash
Tema matemático   → GPT 4.1 Light / mini
Tema con imágenes → GPT 4.1 Light / mini
```

Archivo principal:

```txt
src/infrastructure/ai/AIModelRouter.ts
```

El caso de uso no sabe qué proveedor se usa. Solo pide un modelo al router:

```txt
ProcessAudioNoteUseCase → AIModelRouterPort → Gemini/GPT Adapter
```

Eso permite cambiar Gemini, GPT u otro modelo sin romper el core del negocio.

## Protección de datos sensibles

Se agregó un filtro de privacidad antes de guardar o enviar contenido al modelo de análisis.

Archivo:

```txt
src/infrastructure/privacy/RegexPrivacyFilter.ts
```

Filtra elementos como:

- contraseñas,
- claves,
- usuarios,
- correos,
- teléfonos,
- identificaciones,
- palabras inadecuadas.

Cuando detecta información sensible, la reemplaza por:

```txt
[DATO SENSIBLE ELIMINADO]
```

## Flujo del procesamiento de audio

```txt
1. AudioScreen selecciona audio y tipo de clase.
2. ProcessAudioNoteUseCase ejecuta el flujo.
3. ExpoFileReaderAdapter lee el archivo en base64.
4. GeminiAudioTranscriptionAdapter transcribe el audio.
5. RegexPrivacyFilter limpia datos sensibles.
6. AIModelRouter decide el modelo según el tipo de clase.
7. GeminiAIModelAdapter o GptMathAIModelAdapter genera el resumen.
8. SupabaseAudioNoteRepository guarda el apunte.
9. GeminiEmbeddingAdapter genera embeddings.
10. SupabaseAudioNoteRepository guarda los embeddings para RAG.
```

## Flujo del chatbot

```txt
1. ChatbotScreen envía pregunta y materia seleccionada.
2. AskTutorUseCase limpia la pregunta.
3. GeminiEmbeddingAdapter genera embedding de la pregunta.
4. SupabaseAudioNoteRepository busca similitud con RPC match_audio_embeddings.
5. Se arma el contexto RAG.
6. AIModelRouter selecciona Gemini o GPT según la ruta elegida.
7. Se devuelve la respuesta limpia al usuario.
```

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
EXPO_PUBLIC_GEMINI_API_KEY=TU_GEMINI_API_KEY

# Opcional para GPT real
EXPO_PUBLIC_OPENAI_API_KEY=TU_OPENAI_API_KEY
EXPO_PUBLIC_OPENAI_MATH_MODEL=gpt-4.1-mini
```

Si no se coloca OpenAI API Key, el adaptador matemático usa Gemini como respaldo para que el prototipo funcione durante la exposición.

## Frase para defender la arquitectura

Aplicamos arquitectura hexagonal porque el core del negocio no debe depender directamente de Supabase, Gemini, GPT ni Expo. El núcleo se concentra en analizar clases, generar apuntes y responder preguntas. Las tecnologías externas se conectan mediante puertos y adaptadores, lo que permite cambiar modelos de IA, base de datos o mecanismo de transcripción sin modificar la lógica principal de la aplicación.

## Implementación de embeddings y FROM correcto en Supabase

El proyecto incluye el archivo `supabase/sql/001_setup_rag_embeddings.sql`. Ese archivo configura `pgvector`, la tabla `audio_embeddings` y la función `match_audio_embeddings`.

La consulta del RAG se mantiene con este `FROM`:

```sql
from public.audio_embeddings e
join public.audios a on e.audio_id = a.id
```

Esto es necesario porque los vectores se guardan en `audio_embeddings`, pero la materia pertenece al registro principal de `audios`. Por eso la función filtra por usuario y por materia sin duplicar innecesariamente el `subject_id` en cada embedding.

Flujo actualizado:

1. `ProcessAudioNoteUseCase` transcribe y filtra datos sensibles.
2. Se genera el resumen con el modelo seleccionado por `AIModelRouter`.
3. `buildAudioEmbeddingChunks` separa chunks de resumen y transcripción.
4. `GeminiEmbeddingAdapter` genera vectores de 768 dimensiones.
5. `SupabaseAudioNoteRepository.saveEmbedding` guarda cada vector en `audio_embeddings`.
6. `AskTutorUseCase` genera el embedding de la pregunta.
7. `SupabaseAudioNoteRepository.searchSimilar` llama al RPC `match_audio_embeddings`.
8. El contexto recuperado se envía al modelo seleccionado para responder.

## Actualización: Router IA por fortalezas y Splash Screen

Se agregó una pantalla de carga de 3 segundos antes de entrar al sistema. Durante esa carga se inicializa visualmente el transcriptor, el router de IA y la conexión lógica con Supabase/RAG.

El router ya no se presenta en la interfaz como una relación directa tipo “clase → modelo”, sino como un catálogo de IA por fortalezas:

- Google Gemini 2.5 Flash: mejor para contenido teórico, síntesis y apuntes conceptuales.
- OpenAI GPT-4.1 mini / modo Light: mejor para razonamiento matemático, ejercicios paso a paso e interpretación visual.
- OpenAI Whisper / transcriptor: mejor para convertir audio de clase en texto base.
- Mock AI: mejor para pruebas sin conectar APIs externas.

El core del negocio sigue siendo el mismo: procesar clase, limpiar datos sensibles, generar resumen estructurado, crear embeddings y permitir preguntas con RAG.
