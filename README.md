# FD_wed

Invitación web estática de boda para **Pame & Freddy**, diseñada para ser elegante, romántica, moderna, responsive y lista para publicar en GitHub Pages.

## Tecnologías
- HTML5
- CSS3
- JavaScript puro
- Sin backend, sin base de datos, sin frameworks

## Estructura

```text
FD_wed
│
├── index.html
├── styles.css
├── script.js
├── README.md
└── assets
    ├── foto-principal.jpg
    └── foto-1.jpg
```

## Cómo abrir localmente
1. Abre la carpeta `FD_wed`.
2. Haz clic derecho en `index.html`.
3. Selecciona **Open in Browser**.

También puedes usar un servidor local opcional, pero no es obligatorio.

## Cambiar fotos
1. Reemplaza `assets/foto-principal.jpg` por la foto principal del hero.
2. Reemplaza `assets/foto-1.jpg` por una foto de galería.
3. Si agregas más fotos, duplica un bloque `<figure class="gallery-item">` en `index.html` dentro de la sección `#galeria`.

## Editar hora, dirección y Google Forms
En `index.html` ya están marcados con comentarios:
- **Hora**: busca `Dónde cambiar la hora`.
- **Dirección exacta**: busca `Dónde cambiar la dirección exacta`.
- **Google Forms (iframe o URL)**: busca `Dónde pegar el iframe o enlace de Google Forms`.

## Cambiar enlaces de Google Maps
En `index.html`, busca el comentario:
- `Cómo cambiar el enlace de Google Maps`

Edita los `href` de los botones **Recepción** e **Iglesia**.

## Cambiar colores principales
En `styles.css`, en el bloque `:root`, están las variables CSS:
- `--cream`
- `--white`
- `--soft-gold`
- `--olive`
- `--earth`
- `--text-main`

Modifica esos valores para personalizar el estilo.

## Publicar en GitHub Pages
1. Sube esta carpeta a un repositorio de GitHub.
2. Ve a **Settings > Pages**.
3. En **Build and deployment**, selecciona:
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/ (root)`
4. Guarda y espera la URL pública.

La web quedará publicada sin backend y sin costos adicionales.
