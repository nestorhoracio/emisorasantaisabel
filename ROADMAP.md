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
- Contador de reproducciones en tiempo real (2026-10-12): "▶ N reproducciones" arriba del hero, mismo patrón que atalaias-rou (Edge Functions + Netlify Blobs). Cuenta cuándo el audio del player arranca de verdad, una vez cada 30 min por navegador. Detalle en README ("Contador de reproducciones") y gotchas en CLAUDE.md
- Deploy en Netlify: **https://emisorasantaisabel.netlify.app** (auto-deploy desde `main`). `santaisabelfm.com.uy` es el sitio actual de la radio (servidor Apache, otro hosting) — este proyecto todavía no está conectado a ese dominio

## En curso

- Proyecto a medio camino: el cliente todavía no aprobó el presupuesto (2026-09-24).
- **Contador de reproducciones — definiciones tomadas sin el cliente** (2026-10-12): (1) queda oculto mientras el total es 0, para no mostrar "0 reproducciones" al lanzarlo; (2) una reproducción cuenta como mucho una vez cada 30 min por navegador (pausar y volver a darle play no suma); (3) el número es público desde el primer día; (4) cuenta solo lo que se reproduce desde este sitio — no a quien escucha por el dial, por otra app o por TuneIn. Si el cliente prefiere no mostrarlo, o esperar a que haya volumen, alcanza con no incluir `<PlayCounter />` en `Hero.astro`.

## Próximo / Pendiente

- Si aprueban el presupuesto: cargar el número de WhatsApp de la radio en `WA_NUMBER` (`WhatsAppChat.astro`, hoy vacío a propósito) y autohospedar las fuentes (hoy Google Fonts por CDN).
- **"Sonando ahora" no se actualiza desde el navegador** (preexistente, confirmado el 2026-10-12): `status-json.xsl` no devuelve `Access-Control-Allow-Origin` (visto con `curl`, y Chrome lo bloquea por CORS tanto desde localhost como desde `emisorasantaisabel.netlify.app`), así que `StickyPlayer.astro` siempre muestra el texto de respaldo "Santa Isabel FM — En vivo". Opciones: el proxy por `netlify.toml` que ya documenta el README (ese archivo y `STATUS` son "No tocar sin avisar"), pedirle al proveedor del Icecast que agregue el header CORS, o pedir el estado desde una Edge Function (del lado servidor no hay CORS) — ver el punto siguiente.
- Oyentes conectados ahora: el Icecast ya informa `listeners` en ese mismo `status-json.xsl` (14 oyentes con pico de 50 al consultarlo el 2026-10-12). Es un dato distinto al del contador (simultáneos, de cualquier app o dial, en vez de reproducciones acumuladas desde el sitio) y no hace falta Blobs; sí un fetch del lado servidor por lo del CORS. Una sola Edge Function (`GET /api/oyentes`, con caché de CDN de 15-30 s) podría resolver a la vez los oyentes y el título de "Sonando ahora". Decidir con el cliente si lo quiere mostrar.
- Hero (preexistente, detectado el 2026-10-12): está centrado en `100svh` sin descontar header ni player, así que a 1366×768 los últimos 15 px (de 51) del botón "Escuchar ahora" quedan debajo del player, y a 375×667 quedan debajo 30 px de 51 (medido en producción con los rects reales; a 390×844 y a 1920×1080 se ve entero). Arreglo de una línea: `min-height: calc(100svh - var(--header-h) - var(--player-h))` en `.hero` (mueve el contenido ~65 px hacia arriba; revisar con NH antes de aplicarlo). También en pantallas anchas el badge "Transmitiendo en vivo" queda al costado del "100.uno" en vez de arriba (ambos son `inline-flex` en la misma línea): confirmar si es intencional.

## Changelog resumido

- **2026-10-12** — Contador de reproducciones en tiempo real, replicando lo hecho en atalaias-rou (2026-10-01) pero con un solo contador porque acá hay una sola radio: dos Edge Functions (`netlify/edge-functions/reproducciones-leer.ts` y `reproducciones-sumar.ts`) sobre Netlify Blobs (`src/lib/reproducciones.ts`) y `PlayCounter.astro` en el hero. `StickyPlayer.astro` no se tocó: el contador escucha su `<audio>` desde afuera. Se agregó la dependencia `@netlify/blobs`. **Verificado en local** con `netlify dev` (Edge Functions reales en Deno + Blobs en sandbox, sin tocar producción) y en Chrome real contra el stream de la radio: oculto en 0 → play → el audio arranca → 1 POST → "1 reproducción"; pausar y volver a darle play no suma; pasados 30 min suma de nuevo ("2 reproducciones"); 403 sin `Origin` o con `Origin` ajeno; el contador no mueve nada del hero al aparecer (medido con los rects de cada bloque) y queda entero a 8 tamaños de pantalla, en tema claro y oscuro, sin scroll horizontal ni errores de JS. **Verificado en producción** (`emisorasantaisabel.netlify.app`) con los mismos chequeos en Chrome real: idénticos resultados; la CDN guarda el GET (`Cache-Status: stored`); 10 sumas en secuencia con ETags reales, sin pérdidas (totales 3→12); y una ráfaga de 8 sumas simultáneas en la que **se perdieron 2** (el total quedó en 18 en vez de 20, con las 8 respuestas en 200): es la no-atomicidad de Blobs, que el reparto en 8 fragmentos reduce pero no elimina (con 8 en el mismo instante lo esperable son ~2-3 pérdidas). Con oyentes reales repartidos en el tiempo es despreciable, pero el número no es auditable. Los datos de prueba se borraron del store de producción (`netlify blobs:delete`) antes de cerrar: arranca en cero. Hallazgos: (1) el sandbox local de Blobs no devuelve ETag en la lectura y eso dejaba todas las sumas en 503 una vez que existían los 8 fragmentos — corregido; (2) el contador no puede ir debajo del botón (el player fijo lo tapa y el hero centrado se corre al aparecer), por eso va absoluto arriba. Detalle en CLAUDE.md → Gotchas.
- **2026-09-24** — `youtube-live.js` pasó de CommonJS a ESM: el deploy de `688fc62` falló en Netlify por esa function (CommonJS en un proyecto `"type": "module"`). De paso se descubrió que las functions CommonJS respondían 502 en producción desde julio: el chat y la detección de YouTube en vivo no andaban. Detalle en CLAUDE.md → Gotchas.

- **2026-09-24** — Se sacó del `systemPrompt` de `chat.js` la línea suelta `Guardá, commitá:` (entre los pasos 1 y 2), colada por error en `636c0ef` (2026-05-01). El resto del prompt, sin cambios.
- **2026-09-24** — `/api/chat` protegido: `chat.js` pasó a Netlify Functions v2 con validación de origen, forma y largo del historial, `max_tokens` 500, errores genéricos y rate limit nativo (el endpoint estaba abierto sin límites y usa la API key de NH). Se sacó del widget el número personal de NH, que había quedado de las pruebas. Verificado en producción (después del arreglo de `youtube-live.js`): chat respondiendo, origen ajeno → 403, rate limit activo (429 después del umbral, con la demora de hasta 10 s que documenta Netlify), y `youtube-live` de nuevo en 200.
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
