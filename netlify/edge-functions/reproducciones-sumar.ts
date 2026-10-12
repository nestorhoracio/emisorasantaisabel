/**
 * POST /api/reproducciones/sumar → { "total": 124 }
 *
 * Suma una reproducción. El navegador la manda solo cuando el audio arrancó de
 * verdad y como mucho una vez cada 30 min (ver PlayCounter.astro); acá se valida
 * el origen, y el rate limit de Netlify corta ráfagas antes de que la función
 * llegue a ejecutarse. No es un contador auditable: alguien con curl puede sumar
 * hasta `windowLimit` por minuto desde su IP.
 *
 * El import lleva extensión `.ts` explícita porque las Edge Functions corren en
 * Deno, que no resuelve imports sin extensión.
 */
import { sumarReproduccion } from '../../src/lib/reproducciones.ts';

function json(datos: unknown, status = 200) {
  return Response.json(datos, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default async (req: Request) => {
  // Todo POST de navegador trae Origin, y una página de otro dominio no lo puede
  // falsificar: esto impide que otro sitio sume reproducciones con sus visitantes.
  if (req.headers.get('origin') !== new URL(req.url).origin) {
    return json({ error: 'origen no permitido' }, 403);
  }

  try {
    const total = await sumarReproduccion();
    return total === null ? json({ error: 'reintentar más tarde' }, 503) : json({ total });
  } catch (error) {
    console.error('No se pudo sumar la reproducción', error);
    return json({ error: 'no disponible' }, 503);
  }
};

export const config = {
  path: '/api/reproducciones/sumar',
  method: 'POST',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
