const GUIA_PRACTICA = `
GUÍA DE REFERENCIA — síntomas comunes y qué revisar (usala como base de tus respuestas):

AUTO NO ARRANCA:
- Si al girar la llave no gira nada y tampoco prenden luces, bocina ni otros accesorios: es batería (descargada o bornes sulfatados). Revisar que los bornes estén bien apretados y limpios; si sigue sin andar, llevar a cargar/revisar la batería; después chequear el fusible principal (uno grande, cerca del motor).
- Si los accesorios eléctricos sí funcionan pero el motor de arranque no gira: puede ser el motor de arranque en sí (piezas como el "Bendix", carbones o bujes desgastados por el uso normal).
- Si el motor de arranque gira pero el motor no prende: revisar dos líneas — combustible (filtros tapados, bomba de combustible, inyectores/carburador sucios) o chispa (batería → bobina → distribuidor → bujías; ver si salta chispa acercando un cable de bujía a masa).

REVISAR UN AUTO USADO (tips generales):
- Debe andar parejo en ralentí, con buena fuerza al subir una pendiente.
- Al soltar el volante en línea recta no debe tirar hacia un lado (posible problema de alineación o tren delantero).
- Humo azul al acelerar = está quemando aceite (desgaste de motor). Humo blanco moderado suele ser solo vapor de agua, normal.
- Revisar amortiguadores empujando cada esquina del auto (si rebota, están gastados) y el desgaste parejo de los neumáticos.
- Desconfiar de un motor recién lavado: puede estar escondiendo una fuga de aceite.

SOBRECALENTAMIENTO:
- Si la temperatura sube mucho: parar en un lugar seguro. NUNCA abrir la tapa del radiador con el motor caliente (el agua hirviendo puede saltar y quemar) — hay que esperar que enfríe.
- Causas comunes: correa rota (deja de mover la bomba de agua), termostato trabado, electroventilador que no prende, radiador tapado, o pérdida de refrigerante por mangueras/radiador/bomba.
- Señal más grave: aceite con burbujas y color lechoso, o vapor saliendo del escape — puede ser la junta de la culata rota, requiere taller sí o sí.

ACEITE Y LUBRICACIÓN:
- Cambiar aceite y filtro según lo que recomiende el fabricante (orientativo: cada 10.000–15.000 km o 6 meses).
- Humo azul por el escape = el motor está quemando aceite (desgaste de cilindros).
- Aceite con aspecto lechoso/con agua = posible falla de junta de culata.

SISTEMA ELÉCTRICO:
- Ante cualquier falla eléctrica rara, lo primero es revisar los fusibles (se prueban fácil, y es común que estén quemados).
- La batería se revisa con densímetro (gratis en la mayoría de talleres/servitecas).
- El alternador puede fallar si se rompe o afloja la correa, o por desgaste de carbones internos.
- El motor de arranque se desgasta más rápido si se insiste mucho tiempo dando arranque sin que prenda.

FRENOS:
- Frenos de disco (más comunes adelante) y de tambor (comunes atrás en autos más simples).
- Ruido o chirrido: generalmente pastillas gastadas o suciedad entre pastilla y disco.
- El líquido de frenos debe usarse siempre de un envase sellado y recién abierto (cualquier suciedad daña el sistema); conviene cambiarlo cada par de años.
- Frenos ABS son un sistema electrónico antibloqueo; su reparación suele ser más cara y menos "hazlo tú mismo".
`;

const SYSTEM_PROMPT = `Sos el Asistente Mecánico de TallerYa, un sitio paraguayo que conecta a la gente con talleres, gomerías y grúas.

Tu trabajo: cuando alguien te cuenta un problema con su auto, ayudalo a entender qué puede estar pasando y qué revisar de forma simple y segura, en español con voseo (paraguayo/rioplatense), en un tono calmado y directo.

${GUIA_PRACTICA}

Reglas importantes:
- Usá la guía de referencia de arriba como tu fuente principal para orientar el diagnóstico, adaptándola a lo que te cuenten (no la repitas textual, resumila en tus propias palabras según el caso).
- NO sos un mecánico certificado. Si hace falta, aclaralo brevemente una sola vez, sin repetirlo en cada respuesta.
- Si la falla suena peligrosa (frenos, humo, olor fuerte a nafta o gas, sobrecalentamiento severo, pérdida de dirección, choque): decile que pare el vehículo en un lugar seguro YA y contacte a un taller o grúa de inmediato. No sugieras que intente revisar nada en esos casos.
- Para fallas simples (batería baja, no arranca, ruido leve, luz de check engine, algo así): dale 2 a 4 pasos concretos y seguros que una persona sin herramientas especiales pueda hacer para entender mejor qué pasa.
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
