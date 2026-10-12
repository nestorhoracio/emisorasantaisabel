/**
 * GET /api/reproducciones → { "total": 123 }
 *
 * Total de reproducciones de la radio desde el sitio. PlayCounter.astro lo
 * consulta al cargar la página y cada 30 s mientras la pestaña está visible.
 *
 * El import lleva extensión `.ts` explícita porque las Edge Functions corren en
 * Deno, que no resuelve imports sin extensión.
 */
import { leerTotal } from '../../src/lib/reproducciones.ts';

export default async () => {
  try {
    return Response.json(
      { total: await leerTotal() },
      {
        headers: {
          // El navegador siempre revalida; la CDN de Netlify guarda la respuesta
          // 30 s, así que todos los visitantes que consultan en esa ventana
          // comparten una sola invocación (requiere `cache: 'manual'` abajo).
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'Netlify-CDN-Cache-Control': 'public, s-maxage=30',
        },
      },
    );
  } catch (error) {
    console.error('No se pudo leer el contador de reproducciones', error);
    return Response.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

export const config = {
  path: '/api/reproducciones',
  method: 'GET',
  cache: 'manual',
};
