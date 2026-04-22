from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
import base64
import logging
import uuid
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---- Config ----
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# ---- Mongo ----
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Pahadi Pharma Assistant API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("pahadi")

# =========================================================
# Models
# =========================================================
Language = Literal["en", "hi"]

LANG_NAME = {"en": "English", "hi": "Hindi (हिंदी)"}


class MedicalResponse(BaseModel):
    medicine_name: Optional[str] = None
    summary: str
    uses: List[str] = []
    common_dosage_note: str = ""
    safety_tips: List[str] = []
    side_effects: List[str] = []
    when_to_see_doctor: List[str] = []
    red_flag: bool = False
    red_flag_message: Optional[str] = None
    disclaimer: str
    language: Language = "en"


class ImageIdentifyRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    language: Language = "en"


class TextQueryRequest(BaseModel):
    query: str
    language: Language = "en"


class MultiMedicineRequest(BaseModel):
    medicines: List[str] = Field(default_factory=list)
    language: Language = "en"


class MedicineEntry(BaseModel):
    name: str
    summary: str
    uses: List[str] = []
    dosage_note: str = ""
    safety_tips: List[str] = []


class MultiMedicineResponse(BaseModel):
    medicines: List[MedicineEntry]
    interactions: List[str] = []
    combined_safety: List[str] = []
    when_to_see_doctor: List[str] = []
    red_flag: bool = False
    red_flag_message: Optional[str] = None
    disclaimer: str
    language: Language = "en"


class AudioTranscribeRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/m4a"


class HistoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    input_type: Literal["image", "voice", "text"]
    query_text: Optional[str] = None
    medicine_name: Optional[str] = None
    response: MedicalResponse
    language: Language = "en"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =========================================================
# Gemini helpers
# =========================================================
SYSTEM_PROMPT = """You are "Pahadi Pharma Assistant" - a safe, friendly General Physician (MBBS / MD Medicine) with 15+ years experience. You are the first point of contact for people in rural and semi-urban areas of India (especially Himachal and North India). 

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
"""


def _build_user_instruction(task: str, language: Language) -> str:
    lang_line = f"Respond in {LANG_NAME[language]}. Set language field to '{language}'."
    return f"{task}\n\n{lang_line}\n\nReturn ONLY the JSON object."


async def _post_gemini(payload: dict) -> dict:
    """POST to Gemini with 2 retries on 5xx."""
    headers = {"Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY}
    last_err = None
    async with httpx.AsyncClient(timeout=60.0) as hc:
        for attempt in range(3):
            r = await hc.post(GEMINI_URL, headers=headers, json=payload)
            if r.status_code == 200:
                return r.json()
            last_err = (r.status_code, r.text[:500])
            if 500 <= r.status_code < 600 and attempt < 2:
                await asyncio.sleep(0.8 * (attempt + 1))
                continue
            break
    logger.error("Gemini error after retries: %s", last_err)
    raise HTTPException(status_code=502, detail=f"Gemini API error: {last_err[0] if last_err else 'unknown'}")


async def _call_gemini(parts: list) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "response_mime_type": "application/json",
        },
    }
    data = await _post_gemini(payload)
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        logger.error("Bad Gemini response: %s", str(data)[:500])
        raise HTTPException(status_code=502, detail="Unexpected Gemini response")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        cleaned = text.strip().strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
        return json.loads(cleaned)


def _coerce_response(raw: dict, language: Language) -> MedicalResponse:
    default_disclaimer = (
        "यह पुष्ट निदान नहीं है। कृपया किसी योग्य डॉक्टर से परामर्श करें।"
        if language == "hi"
        else "This is not a confirmed diagnosis. Please consult a qualified doctor."
    )
    return MedicalResponse(
        medicine_name=raw.get("medicine_name"),
        summary=raw.get("summary", ""),
        uses=raw.get("uses", []) or [],
        common_dosage_note=raw.get("common_dosage_note", "") or "",
        safety_tips=raw.get("safety_tips", []) or [],
        side_effects=raw.get("side_effects", []) or [],
        when_to_see_doctor=raw.get("when_to_see_doctor", []) or [],
        red_flag=bool(raw.get("red_flag", False)),
        red_flag_message=raw.get("red_flag_message"),
        disclaimer=raw.get("disclaimer") or default_disclaimer,
        language=raw.get("language", language) if raw.get("language") in ("en", "hi") else language,
    )


# =========================================================
# Endpoints
# =========================================================
@api_router.get("/")
async def root():
    return {"app": "Pahadi Pharma Assistant", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "gemini_model": GEMINI_MODEL, "has_gemini_key": bool(GEMINI_API_KEY)}


@api_router.post("/identify-medicine", response_model=MedicalResponse)
async def identify_medicine(req: ImageIdentifyRequest):
    task = (
        "The user uploaded a photograph of a medicine (tablet strip, bottle, syrup, ointment, or package). "
        "1) Identify the medicine name and brand if visible on the packaging. "
        "2) If you cannot read the name clearly, set medicine_name to null and explain in summary. "
        "3) Explain in simple words what this medicine is commonly used for, safety tips, common mild side effects. "
        "4) Do NOT invent a name. Do NOT give specific dosages for prescription drugs."
    )
    parts = [
        {"inline_data": {"mime_type": req.mime_type, "data": req.image_base64}},
        {"text": _build_user_instruction(task, req.language)},
    ]
    raw = await _call_gemini(parts)
    resp = _coerce_response(raw, req.language)

    await db.history.insert_one(
        HistoryItem(
            input_type="image",
            medicine_name=resp.medicine_name,
            response=resp,
            language=req.language,
        ).model_dump()
    )
    return resp


@api_router.post("/medical-query", response_model=MedicalResponse)
async def medical_query(req: TextQueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is empty")

    task = (
        "The user is asking about a medicine or describing a symptom. "
        f'User query: "{req.query.strip()}". '
        "If they mentioned a medicine name, explain what it is and safe usage. "
        "If they described a symptom, give simple first-level advice (home care + when to see a doctor). "
        "Check for RED FLAG symptoms carefully."
    )
    parts = [{"text": _build_user_instruction(task, req.language)}]
    raw = await _call_gemini(parts)
    resp = _coerce_response(raw, req.language)

    await db.history.insert_one(
        HistoryItem(
            input_type="text",
            query_text=req.query.strip(),
            medicine_name=resp.medicine_name,
            response=resp,
            language=req.language,
        ).model_dump()
    )
    return resp


MULTI_SYSTEM_PROMPT = SYSTEM_PROMPT + """

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
"""


def _coerce_multi_response(raw: dict, language: Language) -> MultiMedicineResponse:
    default_disclaimer = (
        "यह पुष्ट निदान नहीं है। कृपया किसी योग्य डॉक्टर से परामर्श करें।"
        if language == "hi"
        else "This is not a confirmed diagnosis. Please consult a qualified doctor."
    )
    meds_raw = raw.get("medicines") or []
    meds: List[MedicineEntry] = []
    for m in meds_raw:
        if not isinstance(m, dict):
            continue
        meds.append(
            MedicineEntry(
                name=m.get("name", "") or "",
                summary=m.get("summary", "") or "",
                uses=m.get("uses", []) or [],
                dosage_note=m.get("dosage_note", "") or "",
                safety_tips=m.get("safety_tips", []) or [],
            )
        )
    return MultiMedicineResponse(
        medicines=meds,
        interactions=raw.get("interactions", []) or [],
        combined_safety=raw.get("combined_safety", []) or [],
        when_to_see_doctor=raw.get("when_to_see_doctor", []) or [],
        red_flag=bool(raw.get("red_flag", False)),
        red_flag_message=raw.get("red_flag_message"),
        disclaimer=raw.get("disclaimer") or default_disclaimer,
        language=raw.get("language", language) if raw.get("language") in ("en", "hi") else language,
    )


@api_router.post("/multi-medicine-query", response_model=MultiMedicineResponse)
async def multi_medicine_query(req: MultiMedicineRequest):
    names = [m.strip() for m in req.medicines if m and m.strip()]
    if not names:
        raise HTTPException(status_code=400, detail="No medicines provided")
    if len(names) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 medicines allowed")

    bullet_list = "\n".join(f"- {n}" for n in names)
    task = (
        "The user has provided the following medicine(s) and wants to know what they are and how to use them. "
        "If more than one is given, ALSO analyse potential interactions and combined safety concerns.\n\n"
        f"Medicines:\n{bullet_list}\n\n"
        "Return the multi-medicine JSON schema."
    )
    parts = [{"text": _build_user_instruction(task, req.language)}]

    # Use the extended multi-medicine system prompt
    payload = {
        "system_instruction": {"parts": [{"text": MULTI_SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "response_mime_type": "application/json",
        },
    }
    data = await _post_gemini(payload)
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        raw = json.loads(text)
    except Exception as e:
        logger.error("Parse failed: %s / %s", e, str(data)[:500])
        raise HTTPException(status_code=502, detail="Unexpected Gemini response")

    resp = _coerce_multi_response(raw, req.language)
    return resp


@api_router.post("/transcribe-audio")
async def transcribe_audio(req: AudioTranscribeRequest):
    """Transcribe short audio (voice → medicine name / query) via OpenAI Whisper."""
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"STT library not available: {e}")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    # File extension from mime
    ext = "m4a"
    if "wav" in req.mime_type:
        ext = "wav"
    elif "mp3" in req.mime_type or "mpeg" in req.mime_type:
        ext = "mp3"
    elif "webm" in req.mime_type:
        ext = "webm"

    buf = io.BytesIO(audio_bytes)
    buf.name = f"audio.{ext}"

    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    try:
        response = await stt.transcribe(
            file=buf,
            model="whisper-1",
            response_format="json",
            prompt="The user is naming a medicine or describing a symptom.",
        )
        text = getattr(response, "text", "") or ""
    except Exception as e:
        logger.error("Whisper failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}")

    return {"text": text.strip()}


@api_router.get("/history", response_model=List[HistoryItem])
async def get_history(limit: int = 50):
    cursor = db.history.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return [HistoryItem(**i) for i in items]


@api_router.delete("/history")
async def clear_history():
    result = await db.history.delete_many({})
    return {"deleted": result.deleted_count}


# Register router and middleware
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
