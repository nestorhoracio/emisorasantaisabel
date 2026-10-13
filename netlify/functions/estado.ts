/**
 * GET /api/estado → { "oyentes": 12, "titulo": "Artista - Tema" | null }
 *
 * Estado en vivo del stream de la radio, pedido al Icecast desde el servidor: su
 * `status-json.xsl` no manda `Access-Control-Allow-Origin`, así que el navegador no
 * puede leerlo directo (CORS). Lo usan:
 *   - ListenersCounter.astro: oyentes conectados ahora (hero).
 *   - StickyPlayer.astro: "Sonando ahora".
 *
 * Los visitantes que consultan dentro de la misma ventana de caché de la CDN
 * comparten una sola invocación (y un solo pedido al Icecast de la radio).
 *
 * ⚠️ Es una Netlify Function (Node) y NO una Edge Function, a diferencia del contador
 * de reproducciones: el Icecast solo ofrece TLS 1.2 con intercambio de claves RSA
 * estático (AES256-GCM-SHA384; rechaza toda suite ECDHE y TLS 1.3). Las Edge Functions
 * corren en Deno, cuyo TLS (rustls) no soporta eso y la conexión muere con
 * `HandshakeFailure` (comprobado el 2026-10-12 con `netlify dev`). OpenSSL — Node, curl,
 * los navegadores — sí. Si el proveedor del Icecast actualiza su TLS, esto podría volver
 * a ser una Edge Function (cupo de invocaciones aparte del de Functions).
 *
 * El import lleva extensión `.ts` explícita para poder probar la lib directo con Node.
 */
import { interpretarEstado } from '../../src/lib/estado-icecast.ts';

// Infraestructura real de la radio: no cambiar sin avisar.
const STATUS = 'https://emisiones.com.uy:8166/status-json.xsl';
const TIMEOUT_MS = 5000;

export default async () => {
  try {
    const respuesta = await fetch(STATUS, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!respuesta.ok) throw new Error(`El Icecast respondió ${respuesta.status}`);

    return Response.json(interpretarEstado(await respuesta.json()), {
      headers: {
        // El navegador siempre revalida; la CDN de Netlify guarda la respuesta 60 s.
        // Cada invocación gasta del cupo de Functions de la cuenta (el mismo que usa
        // el chat). La caché normal es POR NODO de la CDN (probado el 2026-10-12: la
        // misma URL dio miss, miss, hit, hit, miss), así que sola no acota las
        // invocaciones; `durable` la comparte entre nodos y deja el peor caso en 1 por
        // minuto (~43.000 al mes) aunque haya visitantes todo el día.
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=60, durable',
      },
    });
  } catch (error) {
    console.error('No se pudo leer el estado del Icecast', error);
    return Response.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

export const config = {
  path: '/api/estado',
  method: 'GET',
};
