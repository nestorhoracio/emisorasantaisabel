# Santa Isabel FM — Contexto para Claude Code

Sitio web de Santa Isabel FM (100.1, Paso de los Toros, Uruguay). Radio en vivo (Icecast) + contenido institucional, en una sola página.

## Stack

- **Astro 6** (SSG puro, sin framework de UI — no hay React/Vue/Svelte)
- CSS vanilla con custom properties para theming (`src/styles/global.css`)
- JS vanilla embebido en `<script>` dentro de los `.astro` (sin librerías de estado)
- **Netlify**: hosting + funciones serverless (`netlify/functions/`): `chat.js` es Functions v2 (ESM, ruta `/api/chat`, desde 2026-09-24); `youtube-live.js` sigue en v1 pero en ESM (`export const handler`, `/.netlify/functions/youtube-live`). **Nunca CommonJS** (`exports.handler`) en `netlify/functions/`: ver Gotchas
- Sin base de datos ni CMS — todo el contenido está hardcodeado en los componentes

## Estructura

- `src/pages/index.astro` — única página, compone todas las secciones
- `src/layouts/Layout.astro` — head, fuentes, theme script, scroll bar, Header/Player globales
- `src/components/` — un componente por sección: `Header`, `Hero`, `StickyPlayer`, `Schedule`, `Timeline`, `Team`, `Sponsors`, `YouTube`, `Contact`, `ThemeToggle`, `WhatsAppChat`
- `src/styles/global.css` — design tokens (paleta azul/rojo del logo, dark/light) + reset + tipografía base
- `netlify/functions/chat.js` — proxy protegido a la API de Claude (Haiku) para el widget de WhatsApp (`/api/chat`)
- `netlify/functions/youtube-live.js` — detecta si el canal de YouTube está en vivo (YouTube Data API)
- `public/logo.jpg` — logo, usado por Header/Player/favicon

## Convenciones

- Sitio de una sola página: las secciones nuevas van como componente en `src/components/` + import en `index.astro`, no como rutas nuevas
- Theming vía custom properties CSS: `--blue`, `--red`, `--bg`, `--text`, etc. definidas en `:root`/`[data-theme="dark"]` y sobreescritas en `[data-theme="light"]` (`src/styles/global.css`). No hardcodear colores nuevos fuera de estas variables
- Tipografía: `Bebas Neue` (títulos), `Barlow` (cuerpo), `Barlow Condensed` (labels/uppercase) — cargadas desde Google Fonts en `Layout.astro`
- Tono de copy: español rioplatense/uruguayo cálido y profesional, sin modismos muy informales (ver `netlify/functions/chat.js`, ajustado explícitamente en commit `636c0ef`)
- Cada componente lleva su propio `<style>` scoped — no hay CSS global por componente

## Gotchas

- **Una function CommonJS en un proyecto `"type": "module"` rompe el deploy — y antes rompía la function en silencio** (2026-09-24): el deploy del commit `688fc62` falló en Netlify ("Build script returned non-zero exit code: 2") aunque `npm run build` y `netlify build --offline` pasaban en local. Causa raíz: `youtube-live.js` usaba `exports.handler`, pero `package.json` declara `"type": "module"`, así que Node lo trata como ESM y no lo puede cargar. Netlify ahora corta el build por eso (mensaje: "The function file ... is a CommonJS module, but the closest 'package.json' declares "type": "module""); en julio lo había publicado igual, y las functions CommonJS respondían **502** en producción — el chat y la detección de YouTube en vivo estaban rotos desde entonces. Confirmado leyendo el log real del build con `netlify logs --source deploy --follow` sobre un rebuild, y con `curl` (`/.netlify/functions/chat` → 502). Patrón correcto: toda function en ESM (`export default` en v2, o `export const handler` en v1); si en local el build pasa pero en Netlify falla, leer el log real antes de suponer.

## No tocar sin avisar

- `netlify/functions/chat.js`: el `systemPrompt` (tono, flujo de preguntas) fue afinado a mano en varias iteraciones — no reescribir el flujo sin confirmar con el usuario. Excepción ya resuelta: tenía una línea suelta `Guardá, commitá:` entre los pasos 1 y 2, colada por error en el commit `636c0ef` (2026-05-01, el mismo del ajuste de tono) — se sacó con OK de NH el 2026-09-24. Nada más del prompt cambió
- Protección de `/api/chat` (2026-09-24, mismo patrón que barraca-hefesto): valida `Origin`/`Referer` (dominio real + `*.netlify.app` + localhost), forma y largo del historial (últimos 20 mensajes, 2000 caracteres cada uno), `max_tokens` 500, errores genéricos, y solo reenvía `content` al widget. Rate limit nativo de Netlify en `config.rateLimit` (15 cada 180 s por IP) — solo se activa en un deploy real, no con `netlify dev`; confirmado en producción el 2026-09-24 (Netlify tarda hasta 10 s en empezar a bloquear, así que una ráfaga muy rápida pasa entera antes del 429). No sacar ninguno de estos chequeos sin un reemplazo: la API key es de NH y el endpoint es público
- `WA_NUMBER` en `WhatsAppChat.astro` está **vacío a propósito**: falta el número de la radio (se confirma si aprueban el presupuesto). Vacío, `wa.me` abre WhatsApp con el mensaje escrito y el oyente elige el contacto. `59899474094` es el número personal de NH (quedó de las pruebas) — no volver a usarlo acá
- `STREAM`/`STATUS` (URLs de Icecast) en `StickyPlayer.astro` y `CHANNEL_ID` en `youtube-live.js` — apuntan a infraestructura real de la radio
- `WEB3FORMS_KEY` en `Contact.astro` — clave pública de Web3Forms (es normal que esté en el cliente), no reemplazar sin coordinar con el dueño de la cuenta
- `astro.config.mjs` (`site: 'https://santaisabelfm.com.uy'`) y `netlify.toml` — afectan build/deploy en producción. Ojo: hoy el proyecto se publica en `emisorasantaisabel.netlify.app`; `santaisabelfm.com.uy` sigue siendo el sitio actual de la radio en otro hosting (verificado 2026-09-24)

## Variables de entorno (configuradas en Netlify, no en el repo)

- `ANTHROPIC_API_KEY` — usada por `netlify/functions/chat.js`
- `YOUTUBE_API_KEY` — usada por `netlify/functions/youtube-live.js`

## Comandos

```bash
npm run dev       # http://localhost:4321 — NO sirve las Netlify Functions (chat y YouTube en vivo)
npm run build     # genera /dist
npm run preview   # sirve /dist localmente
npx netlify dev   # sitio + functions en local (necesita ANTHROPIC_API_KEY / YOUTUBE_API_KEY)
```

Deploy: push a la rama principal → Netlify hace build (`npm run build`) y publica `dist/` automáticamente.

## Nota técnica — Now Playing / Icecast

Endpoint de metadatos: `https://emisiones.com.uy:8166/status-json.xsl`. Si falla por CORS, la solución ya documentada es un proxy en `netlify.toml` (`/api/nowplaying` → ese endpoint) y cambiar `STATUS` en `StickyPlayer.astro` a `/api/nowplaying` (ver README.md).

---
Ver **ROADMAP.md** para estado actual y próximos pasos antes de empezar cualquier tarea nueva.
