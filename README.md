# Santa Isabel FM — Sitio Web
## Stack: Astro + Netlify

---

## Setup inicial (una sola vez)

Abrí la terminal en VSCode (`Ctrl + `` ` ``) y ejecutá:

```bash
# 1. Inicializar proyecto Astro en la carpeta actual
npm create astro@latest . -- --template minimal --no-git

# Responder los prompts:
# ✔ Where should we create your new project? → . (punto, carpeta actual)
# ✔ How would you like to start your new project? → Empty
# ✔ Install dependencies? → Yes
# ✔ Initialize a new git repository? → Yes (o No si ya tenés git)

# 2. Si no instaló dependencias automáticamente:
npm install
```

---

## Estructura de archivos a reemplazar/crear

Después del `npm create astro`, **reemplazá** los archivos generados con los de esta carpeta:

```
src/
├── styles/
│   └── global.css          ← NUEVO (crear carpeta styles)
├── layouts/
│   └── Layout.astro        ← REEMPLAZAR
├── pages/
│   └── index.astro         ← REEMPLAZAR
└── components/
    ├── Header.astro         ← NUEVO
    ├── Hero.astro           ← NUEVO
    ├── StickyPlayer.astro   ← NUEVO
    ├── Schedule.astro       ← NUEVO
    ├── Timeline.astro       ← NUEVO
    └── YouTube.astro        ← NUEVO

astro.config.mjs             ← REEMPLAZAR
```

---

## Logo

Copiá el logo de la emisora a:
```
public/logo.jpg
```

El header y el player lo toman automáticamente desde `/logo.jpg`.

---

## YouTube — configuración

En `src/components/YouTube.astro`, completar `VIDEO_ID`:
- Ir a YouTube → canal @100.1EmisoraSantaIsabel
- Elegir el video más representativo o el último
- Copiar el ID de la URL: `youtube.com/watch?v=`**`ESTE_ES_EL_ID`**
- Pegar en la variable `VIDEO_ID`

---

## Correr en desarrollo

```bash
npm run dev
# → http://localhost:4321
```

## Build para producción

```bash
npm run build
# Genera la carpeta /dist
```

## Deploy en Netlify

1. Subir el repo a GitHub
2. En Netlify → "Add new site" → "Import from Git"
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Cambiar DNS del dominio en nic.com.uy → apuntar a Netlify

---

## Now Playing — nota técnica

El endpoint de metadatos Icecast es:
`https://emisiones.com.uy:8166/status-json.xsl`

Si el fetch falla por CORS, la solución es crear un proxy en Netlify:

En `netlify.toml`:
```toml
[[redirects]]
  from = "/api/nowplaying"
  to   = "https://emisiones.com.uy:8166/status-json.xsl"
  status = 200
  force  = true
```

Luego cambiar `STATUS` en `StickyPlayer.astro`:
```js
const STATUS = '/api/nowplaying';
```

---

*Proyecto: Santa Isabel FM — NH Freelance · Mayo 2026*
