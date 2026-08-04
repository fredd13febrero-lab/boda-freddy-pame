# FD_wed

Invitacion web estatica de boda para **Pame & Freddy**, lista para publicar en GitHub Pages.

## Tecnologias
- HTML5
- CSS3
- JavaScript puro
- Supabase publico con anon key
- Sin frameworks, sin npm y sin build

## Estructura

```text
FD_wed
├── index.html
├── fotos.html
├── styles.css
├── fotos.css
├── script.js
├── fotos.js
├── README.md
└── assets
```

## Pagina fotos.html
`fotos.html` permite que los invitados suban fotografias y vean una galeria publica con las imagenes aprobadas.

La pagina:
- Comprime imagenes con Canvas antes de subirlas cuando el navegador puede decodificarlas.
- Reduce el lado mayor a maximo 1600 px sin aumentar imagenes pequenas.
- Convierte a JPEG con calidad 0.75.
- Sube a Supabase Storage en `event/2026-08-08/`.
- Registra metadatos en `wedding_photo_uploads` con `is_approved: false`.
- Muestra solo registros aprobados con `is_approved = true`.

## Supabase Storage
Bucket requerido:
- `wedding-photos`

Configuracion esperada:
- Bucket publico para mostrar fotografias aprobadas.
- Carpeta de carga: `event`.
- Tamano maximo por archivo original: 10 MB.

## Tabla wedding_photo_uploads
Columnas esperadas:
- `id`
- `storage_path`
- `public_url`
- `uploader_name`
- `message`
- `original_name`
- `mime_type`
- `file_size`
- `is_approved`
- `created_at`

## Como subir una prueba
1. Abre `fotos.html`.
2. Escribe tu nombre y un mensaje opcional.
3. Selecciona hasta 20 imagenes.
4. Revisa las miniaturas.
5. Presiona **Subir fotografias**.
6. Confirma en Supabase Storage que el archivo existe en `wedding-photos/event/2026-08-08/`.
7. Confirma en la tabla `wedding_photo_uploads` que el registro quedo con `is_approved = false`.

## Como aprobar fotografias
1. Entra al panel de Supabase.
2. Abre **Table Editor > wedding_photo_uploads**.
3. Revisa `public_url`, `uploader_name`, `message` y `created_at`.
4. Cambia manualmente `is_approved` de `false` a `true` para las fotos aceptadas.
5. Guarda el cambio.

El navegador no debe tener permisos para cambiar `is_approved` a `true`.

## Como abrir la galeria
Abre `fotos.html#galeria-invitados` o usa el boton **Subir y ver fotografias** en `index.html`.

La galeria consulta:
- Tabla: `wedding_photo_uploads`
- Filtro: `is_approved = true`
- Orden: `created_at` descendente

## Como descargar fotografias
1. En Supabase, abre **Storage > wedding-photos**.
2. Entra a `event/2026-08-08/`.
3. Descarga los archivos individualmente desde el panel, o usa la URL publica guardada en `public_url`.

## Limites del plan gratuito
El plan gratuito de Supabase tiene limites de almacenamiento, transferencia, tamano de base de datos y recursos del proyecto. Revisa el panel de Supabase antes del evento y descarga respaldos si esperas muchas fotos.

## Seguridad
- No usar `service_role` en frontend.
- No usar `client_secret`, contrasenas ni claves privadas en archivos publicos.
- No permitir `UPDATE` ni `DELETE` desde el navegador.
- Las cargas publicas deben insertar siempre `is_approved: false`.
- La galeria solo debe leer filas con `is_approved = true`.

## Politicas RLS necesarias
Tabla `wedding_photo_uploads`:
- Permitir `INSERT` a `anon` solo si `is_approved = false`.
- Permitir `SELECT` a `anon` solo si `is_approved = true`.
- No permitir `UPDATE` a `anon`.
- No permitir `DELETE` a `anon`.

Storage `wedding-photos`:
- Permitir `INSERT` a `anon` solo en rutas que comiencen con `event/`.
- Permitir `SELECT` publico para que las URLs del bucket puedan verse.
- No permitir `UPDATE`/upsert a `anon`.
- No permitir `DELETE` a `anon`.

## Publicar en GitHub Pages
1. Sube esta carpeta a un repositorio de GitHub.
2. Ve a **Settings > Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Usa branch `main` y folder `/ (root)`.
5. Guarda y espera la URL publica.
