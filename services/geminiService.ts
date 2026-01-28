
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
    Genera 10 comentarios cortos (máximo 12 palabras por comentario), realistas y variados para un video con este pie de foto: "${caption || 'un video auténtico'}".
    
    Distribución de comentarios:
    - 60%: Muy positivos y entusiastas (ej: "¡Esto es increíble!", "Necesitaba ver esto hoy ✨").
    - 25%: Neutrales, curiosos o casuales (ej: "¿Qué filtro usaste?", "Interesante perspectiva", "Ok, me gusta").
    - 15%: Críticas constructivas mansas o comentarios "no tan buenos" pero sin ser tóxicos (ej: "Siento que le faltó luz", "No entendí muy bien el mensaje", "Un poco largo el video").
    
    Reglas:
    - Usa lenguaje natural de redes sociales con errores menores, abreviaturas y emojis.
    - Los nombres de usuario deben parecer reales (ej: lucia.99, x_pablo_x, dev_master).
    - Evita que todos suenen igual.`;

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
    // Fallback comments if AI fails
    return [
      { user: "amigo_virtual", text: "¡Increíble video! Me encantó la vibra ✨", likes: 12 },
      { user: "vibra_positiva", text: "Sigue así, tienes mucho talento ❤️", likes: 8 },
      { user: "ser_luz", text: "Este video me alegró el día, gracias por compartir", likes: 25 },
      { user: "camino_paz", text: "Qué valiente eres al subir esto, te felicito", likes: 15 },
      { user: "mundo_fiel", text: "Me encanta tu autenticidad", likes: 19 }
    ];
  }
};
