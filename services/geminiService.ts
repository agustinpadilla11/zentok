
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

    const prompt = `Eres una comunidad de personas extremadamente amables, empáticas y positivas en una red social similar a TikTok.
    Genera 8 comentarios cortos (máximo 15 palabras por comentario), realistas y variados para un video que tiene este pie de foto: "${caption || 'un video auténtico'}".
    
    Reglas:
    - El objetivo es que el creador se sienta validado, seguro y talentoso.
    - Usa diferentes tonos: entusiasta, reflexivo, casual, y algunos con muchos emojis.
    - Usa lenguaje natural de redes sociales.
    - Los nombres de usuario deben parecer reales (ej: maria_vibe, jose.luces, etc).
    - Evita cualquier negatividad.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().trim();
    
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
