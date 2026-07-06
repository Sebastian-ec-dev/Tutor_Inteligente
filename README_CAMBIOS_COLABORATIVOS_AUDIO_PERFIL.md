# Cambios agregados: colaboración, perfil, edición y grabación real

## 1. Perfil de usuario
Se agregó la pantalla `ProfileScreen` para que el usuario pueda:

- Ver su correo.
- Editar su nombre visible.
- Editar su universidad/instituto.
- Ver las aulas/materias donde participa y su rol.

Ruta nueva:

```txt
Profile
```

## 2. Agregar amigos / integrantes
Se agregó la pantalla `MembersScreen` para cada materia/aula. Permite:

- Ver integrantes del aula.
- Invitar amigos por correo.
- Asignar rol al invitado: administrador, maestro o estudiante.
- Cambiar roles de integrantes que no sean el creador.

Tablas usadas:

```txt
subject_members
subject_invites
```

Roles:

```txt
owner    -> creador
admin    -> administrador
teacher  -> maestro
student  -> estudiante
```

## 3. Editar y eliminar materia
En cada tarjeta de materia se agregaron botones:

- Editar
- Amigos
- Eliminar

Editar actualiza `public.subjects`.
Eliminar borra la materia y sus registros relacionados por `on delete cascade`.

## 4. Grabar audio desde la app
En `AudioScreen` se agregó grabación real con `expo-av`:

- Botón `Grabar audio desde la app`.
- Contador de tiempo.
- Botón `Finalizar grabación`.
- El archivo grabado se usa como audio base para el flujo de procesamiento.

También se mantiene la opción de subir archivo de audio desde el dispositivo.

## 5. Subir archivos desde el chat
En `ChatbotScreen` se agregó botón de adjuntar archivo. Permite subir:

- Imágenes.
- Audios.
- PDF.
- Documentos.

Los archivos se guardan en Supabase Storage, bucket:

```txt
chat-uploads
```

Y se registra metadata en:

```txt
session_files
```

## 6. SQL actualizado
Ejecutar nuevamente:

```txt
supabase/sql/001_setup_rag_embeddings.sql
```

Ese archivo ahora crea o ajusta:

```txt
profiles
subjects
audios
audio_embeddings
subject_members
subject_invites
session_files
storage bucket chat-uploads
políticas RLS
triggers de owner
```

## 7. Verificación
Se verificó TypeScript con:

```bash
npx tsc --noEmit
```

Resultado: sin errores.
