
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
    console.log("Iniciando análisis de video...", { type: videoBlob.type, size: videoBlob.size, caption });

    if (!API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY no está configurada en .env.local");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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

        // CORRECCIÓN DEFINITIVA: 
        // El formato es data:video/webm;codecs=vp9,opus;base64,DATOS...
        // Si usamos indexOf(',') toma la coma de los codecs.
        // Usamos split(';base64,') y tomamos la parte de los DATOS.
        const parts = result.split(';base64,');
        if (parts.length < 2) return reject(new Error("Formato Base64 no encontrado"));

        resolve(parts.pop() || "");
      };
      reader.onerror = () => reject(new Error("Error de lectura"));
      reader.readAsDataURL(videoBlob);
    });

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
    
    Instrucciones de análisis:
    1. fillerWords: Detecta muletillas (eh, mm, este, o sea, etc.) y di en qué momento ocurren aprox.
    2. toneOfVoice: Evalúa si es monótono, entusiasta, nervioso, etc.
    3. naturalness: Evalúa si se ve forzado o natural.
    4. messageClarity: ¿Se entiende lo que quiere transmitir?
    5. audienceRetention: ¿El inicio es ganchero? ¿Mantiene el ritmo?
    6. advice: Da 3 consejos prácticos.
    7. score: Puntaje del 0 al 100 basado en lo listo que está para TikTok.`;

    // Gemini prefiere mimetypes limpios como "video/webm" o "video/mp4"
    let cleanMimeType = videoBlob.type.split(';')[0];
    if (cleanMimeType.includes('webm')) cleanMimeType = 'video/webm';
    if (!cleanMimeType) cleanMimeType = 'video/webm';

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: cleanMimeType
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    let text = response.text().trim();

    // Buscar el JSON dentro del texto por si Gemini añade explicaciones
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const parsedResult = JSON.parse(text);
    console.log("Análisis completado exitosamente:", parsedResult);
    return parsedResult;
  } catch (error: any) {
    console.error("Error detallado en analyzeVideo:", error);

    // Retornar un objeto de error estructurado para que la UI no se rompa
    return {
      fillerWords: [],
      toneOfVoice: "Error técnico",
      naturalness: "No se pudo procesar el video",
      messageClarity: "Revisa tu conexión o el archivo",
      audienceRetention: "El modelo de IA no respondió correctamente",
      advice: [
        "Asegúrate de que el video no sea demasiado largo (máximo 1-2 min).",
        `Detalle técnico: ${error.message || 'Error desconocido'}`
      ],
      score: 50
    };
  }
};
