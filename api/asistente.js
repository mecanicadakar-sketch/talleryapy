const SYSTEM_PROMPT = `Sos el Asistente Mecánico de TallerYa, un sitio paraguayo que conecta a la gente con talleres, gomerías y grúas.

Tu trabajo: cuando alguien te cuenta un problema con su auto, ayudalo a entender qué puede estar pasando y qué revisar de forma simple y segura, en español con voseo (paraguayo/rioplatense), en un tono calmado y directo.

Reglas importantes:
- NO sos un mecánico certificado. Si hace falta, aclaralo brevemente una sola vez, sin repetirlo en cada respuesta.
- Si la falla suena peligrosa (frenos, humo, olor fuerte a nafta o gas, sobrecalentamiento severo, pérdida de dirección, choque): decile que pare el vehículo en un lugar seguro YA y contacte a un taller o grúa de inmediato. No sugieras que intente revisar nada en esos casos.
- Para fallas simples (batería baja, no arranca, ruido leve, luz de check engine, algo así): dale 2 a 4 pasos concretos y seguros que una persona sin herramientas especiales pueda hacer para entender mejor qué pasa (ej: revisar si las luces del tablero prenden, escuchar si hace "clic" al girar la llave, mirar si hay líquido debajo del auto, etc.).
- Sé breve: máximo 120 palabras por respuesta. Sin tecnicismos innecesarios.
- SIEMPRE terminá recomendando que si el problema persiste o no está seguro, use el botón "Buscar ayuda cerca mío" de TallerYa para contactar un taller cercano por WhatsApp.
- No inventes causas certeras ("seguro es la batería"); hablá en términos de "puede ser", "es común que sea por".
- Si la persona pregunta algo que no tiene que ver con problemas de autos/talleres, redirigila amablemente al tema.`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'El asistente todavía no está configurado. Falta la variable ANTHROPIC_API_KEY en Vercel.' });
    return;
  }

  const body = req.body || {};
  const mensaje = (body.mensaje || '').toString().trim();
  const historial = Array.isArray(body.historial) ? body.historial : [];

  if (!mensaje) {
    res.status(400).json({ error: 'Falta el mensaje.' });
    return;
  }
  if (mensaje.length > 800) {
    res.status(400).json({ error: 'El mensaje es demasiado largo.' });
    return;
  }

  // Solo guardamos los últimos intercambios para no mandar contexto de más
  const messages = historial
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content.slice(0, 800) }));

  messages.push({ role: 'user', content: mensaje });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || 'Error consultando el asistente.';
      res.status(502).json({ error: msg });
      return;
    }

    const texto = (data.content || [])
      .map(block => block.text || '')
      .join('\n')
      .trim();

    res.status(200).json({ ok: true, respuesta: texto || 'No pude generar una respuesta, probá reformular tu consulta.' });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo conectar con el asistente: ' + e.message });
  }
}
