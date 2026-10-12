# Santa Isabel FM — Sitio Web
## Stack: Astro + Netlify

> Estado actual, changelog y próximos pasos: ver [ROADMAP.md](./ROADMAP.md)

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

## Contador de reproducciones

El hero muestra cuántas veces se escuchó la radio desde el sitio ("▶ 1.234 reproducciones"), arriba del todo, debajo del header. Hasta que haya una primera reproducción, el contador no se muestra.

**Cómo funciona:**

- `GET /api/reproducciones` (`netlify/edge-functions/reproducciones-leer.ts`) devuelve `{ "total": N }`. La CDN de Netlify cachea la respuesta 30 s.
- `POST /api/reproducciones/sumar` (`reproducciones-sumar.ts`) suma 1 y devuelve el total nuevo. Solo acepta requests desde el propio sitio (header `Origin`) y tiene un rate limit de Netlify de 10 requests por minuto por IP.
- `PlayCounter.astro` consulta el total al cargar la página y cada 30 s mientras la pestaña está visible. Una reproducción se cuenta cuando el `<audio>` del player arranca de verdad (no al hacer clic), como mucho una vez cada 30 min por navegador: pausar y volver a darle play no suma.
- El total vive en el store `reproducciones` de Netlify Blobs, repartido en 8 blobs (`conteo-0` … `conteo-7`). Blobs no tiene incremento atómico, y repartir el total reduce el riesgo de perder una suma cuando dos personas le dan play al mismo tiempo (detalle en `src/lib/reproducciones.ts`).

**Qué esperar:** quien le da play ve su suma al instante. El resto de los visitantes la ven sin recargar en un máximo de ~60 s (consulta cada 30 s + caché de 30 s). Para que sea más rápido, bajar `INTERVALO_MS` en `PlayCounter.astro` y `s-maxage` en `reproducciones-leer.ts`, a costa de más invocaciones. Es un contador indicativo, no auditable: alguien con `curl` puede sumar hasta 10 por minuto desde su IP. Cuenta solo lo que se reproduce desde este sitio, no a quien escucha por el dial o por otra app.

**Probarlo:** `npm run dev` no corre Edge Functions: ahí el contador queda oculto y el hero se ve como siempre. Para probarlo de verdad, `npx netlify dev` (http://localhost:8888): corre las Edge Functions reales y usa un store de Blobs **local** (carpeta `.netlify/`, ignorada por git), así que no toca producción. Ojo con un deploy borrador (`netlify deploy --build`, sin `--prod`): ese sí lee y escribe el **mismo** store que producción.

**Poner el total en cero:** `netlify blobs:list reproducciones` y `netlify blobs:delete reproducciones <clave>` para cada `conteo-N` (con el sitio enlazado: `netlify link`).

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

Para el detalle de cambios realizados y lo que sigue, ver [ROADMAP.md](./ROADMAP.md).
