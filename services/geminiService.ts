
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Comment } from "../types";

// Get API Key from Vite environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateSupportiveComments = async (caption: string): Promise<Partial<Comment>[]> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              user: { type: SchemaType.STRING },
              text: { type: SchemaType.STRING },
              likes: { type: SchemaType.NUMBER }
            },
            required: ["user", "text", "likes"]
          }
        }
      }
    });

    const prompt = `Eres un grupo de usuarios diversos en una red social similar a TikTok.
    Genera 20 comentarios cortos (máximo 15 palabras por comentario), realistas y variados para un video con este pie de foto: "${caption || 'un video auténtico'}".
    
    Distribución de comentarios SOLICITADA:
    - 40%: Muy positivos, fans y entusiastas (ej: "¡Esto es fuego! 🔥", "Mi video favorito del día", "Necesitaba ver esto ✨").
    - 30%: Críticas, comentarios negativos o "haters" realistas pero no tóxicos (ej: "No me gusta nada", "Qué cringe...", "Por qué subes esto?", "Aburridooo", "No entendí nada").
    - 20%: Neutrales o casuales (ej: "Ok", "Qué filtro es?", "Interesante", "Llegué tarde?").
    - 10%: Spam o comentarios aleatorios típicos (ej: "Síganme para más", "Vendo pan 🥖", "Primer comentario!").
    
    Reglas:
    - Usa lenguaje natural de redes sociales: emojis, abreviaturas (ptm, vdd, xq), errores de ortografía menores.
    - Los nombres de usuario deben parecer reales y variados.
    - Los comentarios negativos NO deben ser insultos graves, sino desprecio o crítica típica de internet.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonStr = response.text().trim();

    // Clean JSON if Gemini returns markdown blocks
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating comments with Gemini:", error);
    // Fallback comments if AI fails - More varied mix
    return [
      { user: "fan_numero1", text: "¡Increíble video! ✨", likes: 45 },
      { user: "hater404", text: "No me gustó para nada, borra eso", likes: 2 },
      { user: "curioso_99", text: "Qué filtro usaste?", likes: 7 },
      { user: "critico_pro", text: "Siento que le faltó edición", likes: 11 },
      { user: "vibra_ok", text: "Me gusta pero no me encanta", likes: 5 },
      { user: "random_user", text: "Vendo empanadas 🥐", likes: 20 },
      { user: "luis_dev", text: "Buen intento pero nqv", likes: 4 }
    ];
  }
};

export const analyzeVideo = async (videoBlob: Blob, caption: string): Promise<any> => {
  try {
    console.log("Iniciando análisis de video...", { type: videoBlob.type, size: videoBlob.size, caption });

    if (!API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY no está configurada en .env.local");
    }

    // Usamos 'gemini-1.5-flash-latest' para máxima compatibilidad multimodal
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Convert Blob to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) return reject(new Error("No se pudo leer el archivo"));

        // CORRECCIÓN FINAL: Usamos lastIndexOf(',') para ser inmunes a cualquier codec en el mimetype
        const lastCommaIndex = result.lastIndexOf(',');
        if (lastCommaIndex === -1) return reject(new Error("Formato Base64 no encontrado"));

        resolve(result.substring(lastCommaIndex + 1));
      };
      reader.onerror = () => reject(new Error("Error de lectura del archivo"));
      reader.readAsDataURL(videoBlob);
    });

    const cleanMimeType = videoBlob.type.split(';')[0] || 'video/webm';

    const prompt = `Analiza este video de un usuario que está practicando para perder el miedo a hablar en público/redes sociales.
    El pie de foto proporcionado por el usuario es: "${caption || 'Ninguno'}".
    
    Devuelve un JSON estrictamente con la siguiente estructura:
    {
      "fillerWords": [{"word": string, "count": number, "timestamp": string}],
      "toneOfVoice": string,
      "naturalness": string,
      "messageClarity": string,
      "audienceRetention": string,
      "advice": [string],
      "score": number
    }
    
    Instrucciones:
    1. fillerWords: Detecta muletillas (eh, mm, este, o sea, etc.) y di en qué momento ocurren.
    2. toneOfVoice: Evalúa el tono (entusiasta, nervioso, monótono).
    3. naturalness: Evalúa qué tan natural se ve.
    4. messageClarity: Evalúa si se entiende la idea central.
    5. audienceRetention: Evalúa el enganche inicial.
    6. advice: Da 3 consejos.
    7. score: Puntaje de 0 a 100.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: cleanMimeType.includes('webm') ? 'video/webm' : cleanMimeType
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    let text = response.text().trim();

    // Buscar el JSON dentro del texto
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const parsedResult = JSON.parse(text);
    console.log("Análisis completado:", parsedResult);
    return parsedResult;

  } catch (error: any) {
    console.error("Error en analyzeVideo:", error);
    return {
      fillerWords: [],
      toneOfVoice: "Error técnico",
      naturalness: "No se pudo procesar el video",
      messageClarity: "Error en la conexión con la IA",
      audienceRetention: "Prueba con un video más corto",
      advice: [
        "Asegúrate de que el video no supere los 20MB.",
        `Error: ${error.message || 'Error desconocido'}`
      ],
      score: 50
    };
  }
};
