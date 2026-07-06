# Implementación del formulario de Figma Maker en React Native

Se adaptó el prototipo generado por Figma Maker al proyecto Expo/React Native con arquitectura hexagonal.

## Pantalla de acceso

Se implementaron tres estados dentro de `src/screens/LoginScreen.tsx`:

- `welcome`: pantalla inicial AulaIA.
- `login`: inicio de sesión con correo y contraseña.
- `register`: creación de usuario con nombre completo, correo, contraseña, confirmar contraseña y universidad/instituto.

El botón **Crear usuario** llama a:

```ts
registerUseCase.execute(email, password, {
  displayName,
  university,
});
```

Ese caso de uso llama al puerto de autenticación y finalmente al adaptador:

```ts
supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name,
      university,
    },
  },
});
```

Los usuarios reales se guardan en Supabase Auth, en `auth.users`. El perfil público se sincroniza en `public.profiles` mediante el trigger SQL incluido.

## Formulario de crear materia

Se implementó en `src/screens/HomeScreen.tsx` mediante un modal funcional con estos campos:

- Nombre de la materia.
- Docente.
- Color de materia.
- Descripción.
- Vista previa.

El botón **Crear materia** llama a:

```ts
createSubjectUseCase.execute({
  name,
  teacher,
  description,
  color,
  icon: '📚',
});
```

Luego el adaptador de Supabase guarda en `public.subjects`:

```ts
.from('subjects')
.insert([
  {
    name,
    user_id,
    teacher,
    description,
    color,
    icon,
  },
])
```

## Campos de Supabase agregados

Ejecutar `supabase/sql/001_setup_rag_embeddings.sql` en Supabase SQL Editor. Ese script crea o actualiza:

- `public.profiles`
  - `id`
  - `email`
  - `display_name`
  - `university`
  - `created_at`

- `public.subjects`
  - `id`
  - `user_id`
  - `name`
  - `teacher`
  - `description`
  - `color`
  - `icon`
  - `created_at`

- `public.audios`
  - `id`
  - `user_id`
  - `subject_id`
  - `title`
  - `audio_url`
  - `transcript`
  - `summary`
  - `content_type`
  - `created_at`

- `public.audio_embeddings`
  - `id`
  - `user_id`
  - `audio_id`
  - `content`
  - `embedding`
  - `created_at`

## FROM correcto para RAG

La función `match_audio_embeddings` mantiene el `FROM` correcto:

```sql
from public.audio_embeddings e
join public.audios a on e.audio_id = a.id
```

Esto permite buscar por similitud en los embeddings y filtrar por materia usando `audios.subject_id`.

## Verificación realizada

Se ejecutó:

```bash
npx tsc --noEmit
```

El proyecto compila sin errores TypeScript después de la implementación.
