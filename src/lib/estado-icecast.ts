/**
 * Interpreta el `status-json.xsl` del Icecast de la radio y se queda con lo que usa
 * el sitio: oyentes conectados ahora y título del tema que suena.
 *
 * Puro (sin red ni dependencias), para poder probarlo solo. Lo usa la Netlify Function
 * `netlify/functions/estado.ts`, que es la que pide el JSON desde el servidor: el
 * navegador no puede, porque ese endpoint no manda `Access-Control-Allow-Origin`.
 *
 * Icecast devuelve `source` como objeto si hay un solo mountpoint, como array si hay
 * varios, y no lo incluye si no hay ninguna fuente transmitiendo.
 */

export interface EstadoRadio {
  /** Oyentes conectados ahora al stream. 0 si no hay nadie o la radio no transmite. */
  oyentes: number;
  /** Título del tema que suena, o null si la fuente no lo informa. */
  titulo: string | null;
}

// Mountpoint del stream (el mismo que `STREAM` en StickyPlayer.astro).
const MOUNT = '/san';
const MAX_TITULO = 200;

export function interpretarEstado(datos: unknown): EstadoRadio {
  const fuente = (datos as { icestats?: { source?: unknown } } | null | undefined)?.icestats?.source;
  const montajes = (Array.isArray(fuente) ? fuente : fuente ? [fuente] : []) as Array<Record<string, unknown> | null>;

  // Mismo criterio que usaba el player: el mountpoint de la radio, y si no aparece, el primero.
  const montaje =
    montajes.find((m) => typeof m?.listenurl === 'string' && m.listenurl.endsWith(MOUNT)) ?? montajes[0];
  if (!montaje) return { oyentes: 0, titulo: null };

  const { listeners } = montaje;
  const oyentes = typeof listeners === 'number' && Number.isFinite(listeners) && listeners > 0 ? Math.floor(listeners) : 0;

  const titulo = montaje.title ?? montaje['song-title'];
  const tituloLimpio = typeof titulo === 'string' ? titulo.trim().slice(0, MAX_TITULO) : '';

  return { oyentes, titulo: tituloLimpio || null };
}
