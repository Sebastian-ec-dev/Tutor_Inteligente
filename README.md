# Tutor Inteligente - Asistente de Estudio

Tutor Inteligente es una aplicación móvil desarrollada en React Native y Expo que funciona como un asistente de estudio personalizado. Permite a los estudiantes universitarios subir sus apuntes y grabaciones de clase, procesarlos mediante Inteligencia Artificial para obtener transcripciones y resúmenes, y posteriormente consultar toda esa información a través de un chatbot conversacional inteligente (RAG - Retrieval-Augmented Generation).

## Características Principales

- **Autenticación de Usuarios:** Registro e inicio de sesión seguro utilizando Supabase Auth.
- **Gestión de Materias:** Crea y organiza diferentes materias para mantener tus apuntes ordenados.
- **Subida y Análisis de Apuntes:** Sube archivos de audio. La aplicación utiliza IA para analizarlos, generando automáticamente una transcripción y un resumen estructurado.
- **Búsqueda Semántica:** Los apuntes se vectorizan (embeddings) para permitir búsquedas semánticas precisas.
- **Chatbot Inteligente (Tutor IA):** Un chat interactivo que responde preguntas basándose exclusivamente en los apuntes subidos por el estudiante. Permite filtrar la búsqueda por una materia específica para obtener respuestas más exactas y actualizadas.
- **Soporte Markdown:** El chatbot formatea sus respuestas en Markdown (negritas, listas, etc.) para una lectura más clara y estructurada.

## Tecnologías Utilizadas

- **Frontend:** React Native, Expo, React Navigation.
- **UI/UX:** Lucide React Native (iconos), React Native Markdown Display (renderizado del chat).
- **Backend & Base de Datos:** Supabase (PostgreSQL).
- **Inteligencia Artificial:** API de Gemini (Google) para generación de texto, transcripción, resúmenes y generación de embeddings (vectorización de texto).
- **Almacenamiento Vectorial:** Extensión `pgvector` en PostgreSQL (Supabase) para almacenar y realizar consultas de similitud (Similarity Search) sobre los embeddings.

2. **Configurar Variables de Entorno:**
   Debes configurar las credenciales de tu proyecto de Supabase y tu API Key de Gemini en tu código (asegúrate de no subirlas a repositorios públicos).

   Busca los archivos de configuración en `src/lib/` y añade tus claves:
   - `supabase.ts` (URL y Anon Key de Supabase)
   - `gemini.ts` (API Key de Gemini)

3. **Configuración de la Base de Datos (Supabase):**
   Debes ejecutar las siguientes instrucciones SQL en el panel de tu proyecto en Supabase para crear las tablas necesarias y activar la extensión `vector`:

   ```sql
   -- Activar la extensión pgvector
   create extension if not exists vector;

   -- Crear tabla de Materias
   create table public.subjects (
     id uuid default gen_random_uuid() primary key,
     user_id uuid references auth.users (id) on delete cascade,
     name text not null,
     created_at timestamp with time zone default timezone('utc'::text, now())
   );

   -- Crear tabla de Audios/Apuntes
   create table public.audios (
     id uuid default gen_random_uuid() primary key,
     user_id uuid references auth.users (id) on delete cascade,
     subject_id uuid references public.subjects (id) on delete cascade,
     title text not null,
     audio_url text,
     transcript text,
     summary text,
     created_at timestamp with time zone default timezone('utc'::text, now())
   );

   -- Crear tabla de Embeddings Vectoriales
   create table public.audio_embeddings (
     id uuid not null default extensions.uuid_generate_v4() primary key,
     user_id uuid references auth.users (id) on delete cascade,
     audio_id uuid references audios (id) on delete cascade,
     content text not null,
     embedding public.vector,
     created_at timestamp with time zone not null default timezone('utc'::text, now())
   );

   -- Crear índice HNSW para búsquedas de similitud ultra rápidas
   create index IF not exists audio_embeddings_embedding_idx on public.audio_embeddings using hnsw (embedding vector_cosine_ops) TABLESPACE pg_default;
   ```

4. **Función RPC para búsqueda Semántica:**
   Ejecuta esta función en el SQL Editor de Supabase para permitir que el chatbot busque apuntes por materia:

   ```sql
   create or replace function public.match_audio_embeddings (
     query_embedding vector,
     match_threshold float,
     match_count int,
     p_user_id uuid,
     p_subject_id uuid
   )
   returns table (
     id uuid,
     audio_id uuid,
     content text,
     similarity float
   )
   language sql stable
   as $$
     select
       e.id,
       e.audio_id,
       e.content,
       1 - (e.embedding <=> query_embedding) as similarity
     from public.audio_embeddings e
     join public.audios a on e.audio_id = a.id
     where e.user_id = p_user_id
       and a.subject_id = p_subject_id
       and 1 - (e.embedding <=> query_embedding) > match_threshold
     order by similarity desc, a.created_at desc
     limit match_count;
   $$;
   ```

## Ejecución de la Aplicación

Para iniciar el servidor de desarrollo de Expo:

```bash
npx expo start
```

Escanea el código QR generado con la aplicación **Expo Go** en tu dispositivo físico, o presiona la tecla `a` para abrir en el emulador de Android, o `i` para el simulador de iOS.
