
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Comment } from "../types";

// Get API Key from Vite environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateSupportiveComments = async (caption: string): Promise<Partial<Comment>[]> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Convert Blob to base64
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(videoBlob);
    });

    const prompt = `Analiza este video de un usuario que está practicando para perder el miedo a hablar en público/redes sociales.
    El pie de foto es: "${caption}".
    
    Devuelve un JSON con la siguiente estructura:
    {
      "fillerWords": [{"word": string, "count": number, "timestamp": string}],
      "toneOfVoice": string (breve descripción),
      "naturalness": string (breve descripción),
      "messageClarity": string (breve descripción),
      "audienceRetention": string (breve descripción de qué tan bien retendría a la audiencia),
      "advice": [string] (lista de 3-4 consejos específicos),
      "score": number (0-100)
    }
    
    Sé honesto pero constructivo. El puntaje debe reflejar la calidad real del video para ser subido a TikTok.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: videoBlob.type
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    let jsonStr = response.text().trim();

    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error analyzing video with Gemini:", error);
    // Return a default/error object if analysis fails
    return {
      fillerWords: [],
      toneOfVoice: "No se pudo analizar",
      naturalness: "No se pudo analizar",
      messageClarity: "No se pudo analizar",
      audienceRetention: "No se pudo analizar",
      advice: ["Hubo un error al analizar el video. Intenta de nuevo."],
      score: 50
    };
  }
};
