
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
    Genera 35 comentarios cortos (máximo 15 palabras por comentario), realistas y variados para un video con este pie de foto: "${caption || 'un video auténtico'}".
    
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
    return Array.from({ length: 35 }).map((_, i) => ({
      user: `user_${Math.floor(Math.random() * 1000)}`,
      text: i % 2 === 0 ? "¡Excelente video! 🚀" : "Me gusta la vibra de este clip.",
      likes: Math.floor(Math.random() * 50)
    }));
  }
};

/**
 * Evalúa el potencial viral del video (0 a 100).
 * Se usará para determinar si el video tiene "muchas vistas" o "pocas vistas".
 */
export const evaluateViralPotential = async (videoBlob: Blob, caption: string): Promise<number> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) return reject(new Error("No se pudo leer el archivo"));
        const lastCommaIndex = result.lastIndexOf(',');
        resolve(result.substring(lastCommaIndex + 1));
      };
      reader.readAsDataURL(videoBlob);
    });

    const cleanMimeType = videoBlob.type.split(';')[0] || 'video/webm';

    const prompt = `Analiza el potencial de este video para hacerse viral en TikTok.
    Ten en cuenta la energía, la calidad visual inicial, y el pie de foto: "${caption || 'Ninguno'}".
    
    Devuelve un JSON estrictamente así:
    {
      "potentialScore": number (de 0 a 100)
    }
    
    0-30: Poco potencial (video muy monótono o sin gancho).
    31-70: Potencial medio.
    71-100: Mucho potencial (gran energía, gancho inicial claro, contenido interesante).`;

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
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{"potentialScore": 50}');

    console.log("Potencial Viral evaluado:", parsed.potentialScore);
    return parsed.potentialScore;

  } catch (error) {
    console.error("Error evaluando potencial:", error);
    return 50; // Default a la mitad
  }
};
