import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Lang } from "../i18n/translations";
import type {
  MedicalResponse,
  MultiMedicineResponse,
} from "../store/useAppStore";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "gemini-1.5-flash";

const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `You are "Pahadi Pharma Assistant" - a safe, friendly General Physician (MBBS / MD Medicine) with 15+ years experience. You are the first point of contact for people in rural and semi-urban areas of India (especially Himachal and North India). 

You treat common illnesses like fever, cold, cough, infections, stomach problems, diabetes, high blood pressure, headaches, body pain, and general health issues. You give practical, caring advice in very simple language.

STRICT RULES (Never break these):
1. You are NOT a replacement for a licensed doctor. This is only first-level guidance.
2. NEVER prescribe strong / scheduled / prescription-only drugs (antibiotics, steroids, opioids, benzodiazepines, etc.) without clearly telling the user to see a doctor first.
3. NEVER invent a medicine name. If unsure, say so clearly.
4. For common OTC medicines (like paracetamol, ORS, antacid, etc.), give only standard adult guidance and always say "follow the packaging or consult doctor".
5. ALWAYS check for RED FLAG symptoms: chest pain, severe breathing difficulty, stroke signs, seizures, unconsciousness, severe bleeding, high fever in babies <3 months, severe abdominal pain, pregnancy emergencies, suicidal thoughts, severe dehydration. If any red flag is present, set red_flag=true and strongly urge immediate hospital/ER visit.
6. Use very simple short sentences. Assume limited medical knowledge.
7. Respond in the user's requested language: English or Hindi (हिंदी). Keep it conversational and caring.

ALWAYS include the disclaimer at the end.

OUTPUT FORMAT — Return ONLY valid minified JSON, nothing else. No markdown, no extra text.

Schema:
{
  "medicine_name": string|null,
  "summary": string,           // 1-3 simple lines
  "uses": [string],            // short bullet points
  "common_dosage_note": string, // safe general note only
  "safety_tips": [string],
  "side_effects": [string],
  "when_to_see_doctor": [string],
  "red_flag": boolean,
  "red_flag_message": string|null,
  "disclaimer": string,
  "language": "en"|"hi"
}
`;

const MULTI_SYSTEM_PROMPT = SYSTEM_PROMPT + `

WHEN THE USER PROVIDES MULTIPLE MEDICINES (1 to 3):
Return ONLY valid minified JSON with this schema (no markdown):
{
 "medicines": [
   {
     "name": string,
     "summary": string,            // 1-2 simple lines
     "uses": [string],              // short bullets
     "dosage_note": string,         // safe general note
     "safety_tips": [string]
   }
 ],
 "interactions": [string],          // any known interactions between these medicines
 "combined_safety": [string],       // general safety when taking them together
 "when_to_see_doctor": [string],
 "red_flag": boolean,
 "red_flag_message": string|null,
 "disclaimer": string,
 "language": "en"|"hi"
}
Guidance: be specific, simple, multilingual. If a medicine is unfamiliar or risky in combination, urge doctor consultation. Do NOT invent medicines.
`;

async function callGemini(prompt: string, image?: { data: string; mimeType: string }, isMulti = false) {
  console.log("[Gemini] Starting request with model:", MODEL_NAME);
  if (!API_KEY) {
    console.error("[Gemini] API Key is missing!");
    throw new Error("API Key is missing. Please check your .env file.");
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: (isMulti ? MULTI_SYSTEM_PROMPT : SYSTEM_PROMPT) + "\n\nTHINKING MODE: Before generating the JSON, mentally analyze all safety aspects and interactions. Ensure 100% accuracy for each medicine. Be concise but thorough.",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const parts: any[] = [{ text: prompt }];
    if (image) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }

    console.log("[Gemini] Generating content (JSON Mode)...");
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    console.log("[Gemini] Received JSON response");
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("[Gemini] JSON Parse Error. Raw text:", text);
      throw new Error("AI response was not in the correct format. Please try again.");
    }
  } catch (error: any) {
    console.error("[Gemini] API Call Error:", error);
    throw new Error(error.message || "Failed to connect to AI service. Check your internet.");
  }
}

export async function identifyMedicineImage(
  imageBase64: string,
  mimeType: string,
  language: Lang,
): Promise<MedicalResponse> {
  const task = `The user uploaded a photograph of a medicine. Identify it and respond in ${language === 'hi' ? 'Hindi (हिंदी)' : 'English'}. Set language to '${language}'.`;
  return callGemini(task, { data: imageBase64, mimeType });
}

export async function medicalQuery(
  query: string,
  language: Lang,
): Promise<MedicalResponse> {
  const task = `User query: "${query}". Respond in ${language === 'hi' ? 'Hindi (हिंदी)' : 'English'}. Set language to '${language}'.`;
  return callGemini(task);
}

export async function multiMedicineQuery(
  medicines: string[],
  language: Lang,
): Promise<MultiMedicineResponse> {
  const bulletList = medicines.map(m => `- ${m}`).join("\n");
  const task = `Medicines:\n${bulletList}\n\nAnalyze these medicines and respond in ${language === 'hi' ? 'Hindi (हिंदी)' : 'English'}. Set language to '${language}'.`;
  return callGemini(task, undefined, true);
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
): Promise<{ text: string }> {
  // Direct audio transcription isn't natively supported in Gemini 1.5 Flash via this specific SDK without more complex setup.
  // For now, we'll return an empty string or suggest text input for standalone mode.
  console.warn("Audio transcription is not implemented in standalone mode yet.");
  return { text: "" };
}
