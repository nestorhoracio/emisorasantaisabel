# Santa Isabel FM — Contexto para Claude Code

Sitio web de Santa Isabel FM (100.1, Paso de los Toros, Uruguay). Radio en vivo (Icecast) + contenido institucional, en una sola página.

## Stack

- **Astro 6** (SSG puro, sin framework de UI — no hay React/Vue/Svelte)
- CSS vanilla con custom properties para theming (`src/styles/global.css`)
- JS vanilla embebido en `<script>` dentro de los `.astro` (sin librerías de estado)
- **Netlify**: hosting + funciones serverless (`netlify/functions/`, CommonJS)
- Sin base de datos ni CMS — todo el contenido está hardcodeado en los componentes

## Estructura

- `src/pages/index.astro` — única página, compone todas las secciones
- `src/layouts/Layout.astro` — head, fuentes, theme script, scroll bar, Header/Player globales
- `src/components/` — un componente por sección: `Header`, `Hero`, `StickyPlayer`, `Schedule`, `Timeline`, `Team`, `Sponsors`, `YouTube`, `Contact`, `ThemeToggle`, `WhatsAppChat`
- `src/styles/global.css` — design tokens (paleta azul/rojo del logo, dark/light) + reset + tipografía base
- `netlify/functions/chat.js` — proxy a la API de Claude (Haiku) para el widget de WhatsApp
- `netlify/functions/youtube-live.js` — detecta si el canal de YouTube está en vivo (YouTube Data API)
- `public/logo.jpg` — logo, usado por Header/Player/favicon

## Convenciones

- Sitio de una sola página: las secciones nuevas van como componente en `src/components/` + import en `index.astro`, no como rutas nuevas
- Theming vía custom properties CSS: `--blue`, `--red`, `--bg`, `--text`, etc. definidas en `:root`/`[data-theme="dark"]` y sobreescritas en `[data-theme="light"]` (`src/styles/global.css`). No hardcodear colores nuevos fuera de estas variables
- Tipografía: `Bebas Neue` (títulos), `Barlow` (cuerpo), `Barlow Condensed` (labels/uppercase) — cargadas desde Google Fonts en `Layout.astro`
- Tono de copy: español rioplatense/uruguayo cálido y profesional, sin modismos muy informales (ver `netlify/functions/chat.js`, ajustado explícitamente en commit `636c0ef`)
- Cada componente lleva su propio `<style>` scoped — no hay CSS global por componente

## No tocar sin avisar

- `netlify/functions/chat.js`: el `systemPrompt` (tono, flujo de preguntas) fue afinado a mano en varias iteraciones — no reescribir el flujo sin confirmar con el usuario
- `STREAM`/`STATUS` (URLs de Icecast) en `StickyPlayer.astro` y `CHANNEL_ID` en `youtube-live.js` — apuntan a infraestructura real de la radio
- `WEB3FORMS_KEY` en `Contact.astro` — clave pública de Web3Forms (es normal que esté en el cliente), no reemplazar sin coordinar con el dueño de la cuenta
- `astro.config.mjs` (`site: 'https://santaisabelfm.com.uy'`) y `netlify.toml` — afectan build/deploy en producción

## Variables de entorno (configuradas en Netlify, no en el repo)

- `ANTHROPIC_API_KEY` — usada por `netlify/functions/chat.js`
- `YOUTUBE_API_KEY` — usada por `netlify/functions/youtube-live.js`

## Comandos

```bash
npm run dev       # http://localhost:4321
npm run build     # genera /dist
npm run preview   # sirve /dist localmente
```

Deploy: push a la rama principal → Netlify hace build (`npm run build`) y publica `dist/` automáticamente.

## Nota técnica — Now Playing / Icecast

Endpoint de metadatos: `https://emisiones.com.uy:8166/status-json.xsl`. Si falla por CORS, la solución ya documentada es un proxy en `netlify.toml` (`/api/nowplaying` → ese endpoint) y cambiar `STATUS` en `StickyPlayer.astro` a `/api/nowplaying` (ver README.md).

---
Ver **ROADMAP.md** para estado actual y próximos pasos antes de empezar cualquier tarea nueva.
