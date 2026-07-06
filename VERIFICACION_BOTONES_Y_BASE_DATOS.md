# Verificación de botones y base de datos - Tutor Inteligente

## 1. Tipo de base de datos

El proyecto usa **Supabase**, que internamente trabaja sobre **PostgreSQL**. Además, se usa la extensión **pgvector** para guardar embeddings y hacer búsqueda semántica tipo RAG.

Dónde se confirma:

- Cliente móvil: `src/infrastructure/supabase/supabaseClient.ts`
- Repositorios: `src/infrastructure/supabase/`
- Script SQL: `supabase/sql/001_setup_rag_embeddings.sql`

## 2. Tablas y campos configurados

### `auth.users`

Tabla interna de Supabase Auth. Aquí se guarda el usuario cuando se presiona **Crear usuario**.

Campos importantes usados por Supabase:

- `id`
- `email`
- `created_at`

La app no accede directamente a esta tabla desde React Native. Supabase Auth la administra.

### `public.profiles`

Tabla pública para consultar datos básicos del usuario desde la app.

Campos:

- `id`: mismo ID del usuario en `auth.users`
- `email`: correo del usuario
- `created_at`: fecha de creación

Se llena automáticamente con el trigger `on_auth_user_created_profile`.

### `public.subjects`

Guarda las materias creadas por cada usuario.

Campos:

- `id`
- `user_id`
- `name`
- `created_at`

Relación:

```txt
subjects.user_id -> auth.users.id
```

### `public.audios`

Guarda los apuntes procesados.

Campos:

- `id`
- `user_id`
- `subject_id`
- `title`
- `audio_url`
- `transcript`
- `summary`
- `content_type`: theory, math, image o general
- `created_at`

Relaciones:

```txt
audios.user_id -> auth.users.id
audios.subject_id -> subjects.id
```

### `public.audio_embeddings`

Guarda los embeddings para búsqueda semántica.

Campos:

- `id`
- `user_id`
- `audio_id`
- `content`
- `embedding vector(768)`
- `created_at`

Relaciones:

```txt
audio_embeddings.user_id -> auth.users.id
audio_embeddings.audio_id -> audios.id
```

## 3. Verificación de botones

### LoginScreen

| Botón | Acción real |
|---|---|
| Iniciar sesión | Ejecuta `loginUseCase.execute(email, password)` |
| Crear usuario | Cambia a la pestaña de registro |
| Crear usuario dentro del formulario | Ejecuta `registerUseCase.execute(email, password)` |

La pestaña **Crear usuario** ahora sí aparece y muestra:

- Correo electrónico
- Contraseña
- Confirmar contraseña

Validaciones:

- No permite campos vacíos.
- Valida formato básico de correo.
- Valida mínimo 6 caracteres en contraseña.
- Valida que las contraseñas coincidan.

### HomeScreen

| Botón | Acción real |
|---|---|
| + | Ejecuta `createSubjectUseCase.execute(nuevaMateria)` y guarda en `subjects` |
| Tarjeta de materia | Navega a `Resumen` con `subjectId` y `subjectName` |
| Hablar con IA | Navega a `Chatbot` |
| Cerrar sesión | Ejecuta `logoutUseCase.execute()` |

### ResumenScreen

| Botón | Acción real |
|---|---|
| + flotante | Navega a `Audio` con `subjectId` |
| Tarjeta de apunte | Expande/contrae resumen y transcripción |

### AudioScreen

| Botón | Acción real |
|---|---|
| Subir Archivo de Audio | Abre `expo-document-picker` |
| Procesar y Guardar Apunte | Ejecuta `processAudioNoteUseCase.execute(...)` |

El procesamiento realiza:

1. Lectura del archivo.
2. Transcripción.
3. Limpieza de datos sensibles.
4. Selección del modelo IA.
5. Resumen.
6. Guardado en `audios`.
7. Generación y guardado de embeddings en `audio_embeddings`.

### ChatbotScreen

| Botón | Acción real |
|---|---|
| Enviar | Ejecuta `askTutorUseCase.execute(...)` |

El chat usa:

1. Pregunta del usuario.
2. Embedding de la pregunta.
3. Búsqueda RAG en `audio_embeddings`.
4. Filtro por materia desde `audios.subject_id`.
5. Router IA: Gemini para teoría/general, GPT para matemática/imágenes.

## 4. Prueba sin GPT ni Gemini

Para probar sin consumir APIs externas, usar en `.env`:

```env
EXPO_PUBLIC_USE_MOCK_AI=true
```

Con eso se usan adaptadores simulados para:

- Análisis IA
- Transcripción
- Embeddings

Supabase sigue siendo necesario para:

- Crear usuario
- Login
- Materias
- Audios
- Embeddings

## 5. SQL que debe ejecutarse en Supabase

Ejecutar completo:

```txt
supabase/sql/001_setup_rag_embeddings.sql
```

Ese archivo crea:

- `profiles`
- `subjects`
- `audios`
- `audio_embeddings`
- función `match_audio_embeddings`
- RLS y políticas básicas por usuario
