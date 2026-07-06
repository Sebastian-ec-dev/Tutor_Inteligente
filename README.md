# Tutor Inteligente / AulaIA

Aplicación móvil en React Native + Expo para registrar materias, subir audios de clase, generar transcripciones/resúmenes y consultar un Tutor IA con RAG.

Esta versión mantiene la arquitectura hexagonal:

- `domain`: entidades y puertos.
- `application`: casos de uso.
- `infrastructure`: adaptadores de Supabase, IA, embeddings, privacidad y archivos.
- `screens`: pantallas React Native.

## Cambios recientes

Se adaptó el formulario entregado por Figma Maker al proyecto móvil real:

- Pantalla inicial AulaIA.
- Formulario de inicio de sesión.
- Formulario de crear usuario con nombre, correo, contraseña, confirmación y universidad.
- Formulario de crear materia con nombre, docente, color, descripción y vista previa.
- Guardado real en Supabase mediante casos de uso y adaptadores hexagonales.

Revisa también:

- `README_ARQUITECTURA_HEXAGONAL.md`
- `IMPLEMENTACION_FORM_FIGMA.md`
- `VERIFICACION_BOTONES_Y_BASE_DATOS.md`

## Variables de entorno

Copia `.env.example` como `.env` y completa tus valores:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
EXPO_PUBLIC_USE_MOCK_AI=true
EXPO_PUBLIC_GEMINI_API_KEY=
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_OPENAI_MATH_MODEL=gpt-4.1-mini
```

Para probar sin Gemini ni GPT, deja:

```env
EXPO_PUBLIC_USE_MOCK_AI=true
```

Supabase sí debe estar configurado para login, usuarios, materias, audios y embeddings.

## Base de datos Supabase

Supabase ya trae una base PostgreSQL. No necesitas crear otra base. Debes crear las tablas ejecutando este archivo en:

`Supabase → SQL Editor → New query → Run`

```txt
supabase/sql/001_setup_rag_embeddings.sql
```

Ese SQL crea o actualiza:

- `public.profiles`
- `public.subjects`
- `public.audios`
- `public.audio_embeddings`
- función `public.match_audio_embeddings`
- políticas RLS por usuario

El `FROM` correcto para RAG está dentro de la función:

```sql
from public.audio_embeddings e
join public.audios a on e.audio_id = a.id
```

## Instalar y ejecutar

```bash
npm install
npx expo start -c
```

En PowerShell, si `npm` está bloqueado:

```powershell
npm.cmd install
npx.cmd expo start -c
```

## Verificación TypeScript

Se verificó con:

```bash
npx tsc --noEmit
```
