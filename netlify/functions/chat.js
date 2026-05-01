exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const { messages } = JSON.parse(event.body);
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
Guardá, commitá:
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            system: systemPrompt,
            messages: mensajesConInicio,
        }),
    });

    const data = await response.json();

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    };
};