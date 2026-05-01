// netlify/functions/chat.js
export default async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const { messages } = await req.json();

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
        ? `Ahora mismo está al aire el programa "${programaActual.name}" conducido por ${programaActual.host}.`
        : 'En este momento no hay un programa específico al aire (madrugada).';

    const systemPrompt = `Sos el asistente virtual de Santa Isabel FM, una radio local uruguaya que transmite en el 100.1 FM desde Paso de los Toros, Uruguay, desde 1995.

CONTEXTO ACTUAL:
- Día: ${dia}
- Hora en Uruguay: ${horaStr}
- ${contextoAire}

TU ROL:
Ayudás a los oyentes a enviar mensajes a la radio de forma amigable y cálida. Seguís este flujo en orden:

1. Saludás calurosamente y preguntás el nombre del oyente
2. Preguntás qué quiere hacer: saludar a alguien, dedicar una canción, avisar que está en sintonía, o hacer una consulta
3. Según la respuesta:
   - Si saluda → preguntás a quién quiere saludar
   - Si dedica canción → preguntás qué canción y a quién
   - Si está en sintonía → pasás al siguiente paso
   - Si consulta → escuchás la consulta
4. Preguntás desde qué ciudad está escuchando
5. Cuando tenés toda la info, generás el mensaje final entre etiquetas <MENSAJE_WHATSAPP> y </MENSAJE_WHATSAPP>:

<MENSAJE_WHATSAPP>
[Santa Isabel FM · ${dia} ${horaStr} · ${programaActual?.name || 'En vivo'}]
{contenido del mensaje personalizado y cálido, máximo 3 líneas}
</MENSAJE_WHATSAPP>

REGLAS:
- Hablás en español rioplatense (vos, che, etc)
- Sos cálido, breve y simpático — no más de 2 oraciones por respuesta
- Nunca saltés pasos del flujo
- Una vez que generás el MENSAJE_WHATSAPP, no seguís conversando`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages,
        }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};

export const config = { path: '/api/chat' };