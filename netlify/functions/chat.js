// netlify/functions/chat.js
// Backend del widget de WhatsApp con IA (WhatsAppChat.astro) — Netlify Functions v2.
// Protección (2026-09-24, mismo patrón que barraca-hefesto): origen permitido, validación de
// forma y largo del historial, rate limit nativo de Netlify (ver `config` al final) y errores
// genéricos hacia afuera. El systemPrompt NO se tocó: ver "No tocar sin avisar" en CLAUDE.md.

const ALLOWED_ORIGINS = ['https://santaisabelfm.com.uy', 'https://www.santaisabelfm.com.uy'];
const MAX_MENSAJES = 20;
const MAX_CONTENT_LENGTH = 2000;

function esOrigenValido(origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    if (origin.endsWith('.netlify.app')) return true; // previews y deploys de Netlify
    return origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'); // netlify dev
}

function origenPermitido(req) {
    const origin = req.headers.get('origin');
    if (origin) return esOrigenValido(origin);
    const referer = req.headers.get('referer');
    if (referer) {
        try {
            return esOrigenValido(new URL(referer).origin);
        } catch {
            return false;
        }
    }
    return true; // sin Origin ni Referer (ej. curl directo): lo frena el rate limit
}

// A diferencia de otros asistentes, acá un historial vacío es válido: es la primera llamada,
// cuando el widget se abre y el bot tiene que presentarse (ver `mensajesConInicio`).
function mensajesValidos(mensajes) {
    if (!Array.isArray(mensajes)) return null;
    const limpios = [];
    for (const m of mensajes) {
        if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
            return null;
        }
        limpios.push({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) });
    }
    return limpios.slice(-MAX_MENSAJES);
}

const json = (data, status) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    if (!origenPermitido(req)) {
        return json({ error: 'Origen no permitido' }, 403);
    }

    let messages = null;
    try {
        messages = mensajesValidos((await req.json()).messages);
    } catch {
        // body que no es JSON: cae en el 400 de abajo
    }
    if (!messages) {
        return json({ error: 'Solicitud inválida' }, 400);
    }

    const mensajesConInicio = messages.length === 0
        ? [{ role: 'user', content: 'inicio' }]
        : messages;
    const programas = [
        { from: 6, to: 9, name: 'Mañana Total', host: 'Horacio Costa' },
        { from: 9, to: 12, name: 'La Señal Camino', host: 'Leonardo Rodríguez' },
        { from: 12, to: 15, name: 'La Tarde Santa Isabel', host: 'Valentina Sosa' },
        { from: 15, to: 18, name: 'Tarde Libre', host: 'Martín Ibarra' },
        { from: 18, to: 20, name: 'El Cierre', host: 'Carolina Pérez' },
        { from: 20, to: 24, name: 'Noche de Verano', host: 'Diego Núñez' },
    ];

    const now = new Date();
    const horaUY = new Date(now.toLocaleString('en-US', { timeZone: 'America/Montevideo' }));
    const h = horaUY.getHours();
    const minutos = String(horaUY.getMinutes()).padStart(2, '0');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dia = diasSemana[horaUY.getDay()];
    const horaStr = `${h}:${minutos}`;

    const programaActual = programas.find(p => h >= p.from && h < p.to);
    const contextoAire = programaActual
        ? `Ahora mismo está al aire "${programaActual.name}" conducido por ${programaActual.host}.`
        : 'En este momento es madrugada, no hay programa específico al aire.';

    const systemPrompt = `Sos el asistente virtual de Santa Isabel FM, radio uruguaya en el 100.1 FM desde Paso de los Toros, desde 1995.

CONTEXTO ACTUAL:
- Día: ${dia}
- Hora en Uruguay: ${horaStr}
- ${contextoAire}

TU ROL:
Ayudás a los oyentes a enviar mensajes a la radio. Seguís este flujo en orden:
1.  Te presentás brevemente como el asistente de la radio y preguntás el nombre del oyente. Usá un tono cálido y cercano, como el de un locutor de radio amigo, no como un bot corporativo. No uses frases como "Soy tu asistente virtual".
2. Preguntás qué quiere hacer: saludar a alguien, dedicar una canción, avisar que está en sintonía, o consulta
3. Según respuesta: si saluda → preguntás a quién. Si dedica canción → preguntás cuál y a quién. Si consulta → escuchás.
4. Preguntás desde qué ciudad escucha
5. Con toda la info generás el mensaje entre etiquetas:

<MENSAJE_WHATSAPP>
[Santa Isabel FM · ${dia} ${horaStr} · ${programaActual ? programaActual.name : 'En vivo'}]
{mensaje personalizado y cálido, máximo 3 líneas}
</MENSAJE_WHATSAPP>

REGLAS:
- Español uruguayo, cálido y profesional. Usás "vos" naturalmente pero evitás modismos muy informales como "che". El tono es el de una radio local seria con 30 años de historia.
- Cálido, breve — máximo 2 oraciones por respuesta
- No saltés pasos
- Una vez generado el MENSAJE_WHATSAPP no seguís conversando`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                system: systemPrompt,
                messages: mensajesConInicio,
            }),
        });

        if (!response.ok) {
            console.error('Error de Anthropic en /api/chat:', response.status, await response.text());
            return json({ error: 'Error al procesar el mensaje' }, 502);
        }

        const data = await response.json();
        // El widget solo usa `content`: no se reenvía el resto de la respuesta de Anthropic.
        return json({ content: data.content }, 200);
    } catch (error) {
        console.error('Error en /api/chat:', error);
        return json({ error: 'Error al procesar el mensaje' }, 500);
    }
};

export const config = {
    path: '/api/chat',
    rateLimit: {
        windowLimit: 15,
        windowSize: 180, // segundos — 180 es el máximo que permite Netlify
        aggregateBy: ['ip', 'domain'],
    },
};
