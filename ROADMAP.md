# Roadmap — Santa Isabel FM

> Mantener actualizado al final de cada sesión de trabajo.

## Hecho

- Estructura completa del sitio (Header, Hero, Schedule, Timeline, Team, Sponsors, Contact) sobre Astro
- Reproductor fijo (StickyPlayer) con stream Icecast + "Now Playing" (polling cada 30s)
- Sección de video de YouTube con detección automática de transmisión en vivo (chequeo cada 15 min)
- Toggle de tema claro/oscuro (botón flotante fijo) con persistencia en localStorage
- Barra de progreso de scroll
- Widget de WhatsApp con asistente conversacional (Claude API vía función Netlify) — tono cálido/profesional en español uruguayo
- Sección "El Equipo" con avatares
- Sección de Patrocinadores
- Formulario de contacto vía Web3Forms
- Nav completa + menú mobile (hamburguesa)
- Ajustes de alineación del hero (punto decorativo "100.uno")
- Deploy en Netlify, dominio santaisabelfm.com.uy

## En curso

- Proyecto a medio camino: el cliente todavía no aprobó el presupuesto (2026-09-24).
- **Pendiente de verificar en producción**: que el widget responda en el sitio publicado con la nueva ruta `/api/chat`, y el rate limit (solo se activa en un deploy real).

## Próximo / Pendiente

- Si aprueban el presupuesto: cargar el número de WhatsApp de la radio en `WA_NUMBER` (`WhatsAppChat.astro`, hoy vacío a propósito) y autohospedar las fuentes (hoy Google Fonts por CDN).

## Changelog resumido

- **2026-09-24** — `youtube-live.js` pasó de CommonJS a ESM: el deploy de `688fc62` falló en Netlify por esa function (CommonJS en un proyecto `"type": "module"`). De paso se descubrió que las functions CommonJS respondían 502 en producción desde julio: el chat y la detección de YouTube en vivo no andaban. Detalle en CLAUDE.md → Gotchas.

- **2026-09-24** — Se sacó del `systemPrompt` de `chat.js` la línea suelta `Guardá, commitá:` (entre los pasos 1 y 2), colada por error en `636c0ef` (2026-05-01). El resto del prompt, sin cambios.
- **2026-09-24** — `/api/chat` protegido: `chat.js` pasó a Netlify Functions v2 con validación de origen, forma y largo del historial, `max_tokens` 500, errores genéricos y rate limit nativo (el endpoint estaba abierto sin límites y usa la API key de NH). Se sacó del widget el número personal de NH, que había quedado de las pruebas.
- Scaffold inicial del proyecto Astro + estructura de secciones
- Video de YouTube destacado → channel ID real → detección de vivo automática
- Toggle de tema + ajustes de paleta en modo claro
- Barra de progreso de scroll
- Widget de WhatsApp con Claude API (varias iteraciones de configuración de Netlify Functions) + ajuste de tono de voz
- Sección Equipo con avatares
- Sección Patrocinadores
- Formulario de contacto (Web3Forms) + limpieza de CSS obsoleto
- Nav completa + menú mobile
- Fixes de alineación del punto decorativo en el hero
