import { GoogleGenAI } from '@google/genai';

// Inicializa el cliente usando la clave guardada en las variables de entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Eres el asistente virtual experto en auxilio mecánico y talleres para la plataforma TallerYa en Paraguay. 
        Tu objetivo es ofrecer diagnósticos preventivos rápidos y recomendar a los usuarios consultar los talleres disponibles en la plataforma (como Mecánica Dakar, Mecánica Cáceres, Taller Hugo, etc.) según su necesidad.`
      }
    });

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Error al conectar con Gemini:', error);
    return res.status(500).json({ error: 'Ocurrió un error al procesar la consulta.' });
  }
}
