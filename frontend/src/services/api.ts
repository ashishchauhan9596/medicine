import type { Lang } from "../i18n/translations";
import type {
  MedicalResponse,
  MultiMedicineResponse,
} from "../store/useAppStore";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as T;
}

export async function identifyMedicineImage(
  imageBase64: string,
  mimeType: string,
  language: Lang,
): Promise<MedicalResponse> {
  return postJson<MedicalResponse>("/identify-medicine", {
    image_base64: imageBase64,
    mime_type: mimeType,
    language,
  });
}

export async function medicalQuery(
  query: string,
  language: Lang,
): Promise<MedicalResponse> {
  return postJson<MedicalResponse>("/medical-query", { query, language });
}

export async function multiMedicineQuery(
  medicines: string[],
  language: Lang,
): Promise<MultiMedicineResponse> {
  return postJson<MultiMedicineResponse>("/multi-medicine-query", {
    medicines,
    language,
  });
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
): Promise<{ text: string }> {
  return postJson<{ text: string }>("/transcribe-audio", {
    audio_base64: audioBase64,
    mime_type: mimeType,
  });
}
