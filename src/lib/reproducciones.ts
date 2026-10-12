/**
 * Contador de reproducciones de la radio, guardado en Netlify Blobs.
 *
 * Solo para el lado servidor: lo usan las dos Edge Functions de
 * `netlify/edge-functions/` (`reproducciones-leer.ts` y `reproducciones-sumar.ts`).
 * Importa `@netlify/blobs`, así que nunca se importa desde un <script> de cliente
 * ni desde una página de Astro (el sitio sigue siendo SSG puro).
 *
 * ⚠️ Netlify Blobs no tiene incremento atómico, y su escritura condicional por
 * ETag (`onlyIfMatch`) tampoco lo es bajo concurrencia real (probado en
 * atalaias-rou el 2026-10-01: 4 escrituras simultáneas con el mismo ETag → entre
 * 1 y 3 se dieron por exitosas; en secuencia sí funciona bien). Por eso el total
 * se reparte en FRAGMENTOS blobs: cada suma cae en uno al azar y la lectura suma
 * todos, así que para perder una reproducción dos personas tienen que darle play
 * en el mismo instante *y* caer en el mismo fragmento. Riesgo aceptado: es un
 * contador indicativo, no auditable.
 */
import { getStore } from '@netlify/blobs';

const NOMBRE_STORE = 'reproducciones';
// Cada fragmento es un blob JSON con un número entero: 12.
const FRAGMENTOS = 8;
const CLAVES = Array.from({ length: FRAGMENTOS }, (_, n) => `conteo-${n}`);
// Reintentos si la escritura condicional detecta que otro escribió el fragmento
// entre nuestra lectura y nuestra escritura (el caso que sí detecta).
const MAX_INTENTOS = 5;
// Espera al azar (0 a N ms) entre reintentos: si varias sumas chocaron a la vez,
// reintentarlas todas juntas las haría chocar de nuevo.
const ESPERA_REINTENTO_MS = 80;

interface Fragmento {
  clave: string;
  total: number;
  existe: boolean;
  etag?: string;
}

// Consistencia fuerte: sin ella, una lectura puede devolver un valor de hasta
// ~60 s atrás.
function store() {
  return getStore({ name: NOMBRE_STORE, consistency: 'strong' });
}

async function leerFragmentos(blobs: ReturnType<typeof store>): Promise<Fragmento[]> {
  return Promise.all(
    CLAVES.map(async (clave) => {
      const actual = await blobs.getWithMetadata(clave, { type: 'json' });
      const dato: unknown = actual?.data;
      // Cualquier cosa que no sea un entero positivo cuenta como 0.
      const total = typeof dato === 'number' && Number.isSafeInteger(dato) && dato > 0 ? dato : 0;
      return { clave, total, existe: actual !== null, etag: actual?.etag };
    }),
  );
}

function sumarFragmentos(fragmentos: Fragmento[]): number {
  return fragmentos.reduce((acumulado, { total }) => acumulado + total, 0);
}

export async function leerTotal(): Promise<number> {
  return sumarFragmentos(await leerFragmentos(store()));
}

/** Suma 1 y devuelve el total nuevo, o `null` si no se pudo escribir. */
export async function sumarReproduccion(): Promise<number | null> {
  const blobs = store();

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (intento > 0) await new Promise((r) => setTimeout(r, Math.random() * ESPERA_REINTENTO_MS));
    const fragmentos = await leerFragmentos(blobs);
    const elegido = fragmentos[Math.floor(Math.random() * FRAGMENTOS)];
    const nuevo = elegido.total + 1;

    // Con ETag la escritura detecta que otro pisó el fragmento (onlyIfMatch); si
    // no existe, que nadie lo haya creado entre tanto (onlyIfNew). Un fragmento
    // que existe pero vino sin ETag no se puede condicionar: va una escritura
    // común. Pasa en el sandbox local de `netlify dev`, cuya lectura no devuelve
    // ETag; tratarlo como "no existe" (onlyIfNew) fallaría siempre.
    const condicion = elegido.etag ? { onlyIfMatch: elegido.etag } : elegido.existe ? {} : { onlyIfNew: true };
    const { modified } = await blobs.setJSON(elegido.clave, nuevo, condicion);
    if (modified) return sumarFragmentos(fragmentos) + 1;
  }

  return null;
}
