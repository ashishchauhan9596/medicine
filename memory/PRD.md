# Pahadi Pharma Assistant — PRD

## Overview
AI-powered multi-modal medical assistant mobile app (Expo React Native) for rural & semi-urban users in India. Acts as a safe first-level guidance tool — NOT a replacement for a doctor.

## Problem
Rural/semi-urban users with limited medical knowledge or literacy cannot easily understand medicine packaging or know what to do for common symptoms. They need simple, multilingual, safe first-level guidance.

## Users
- Rural & semi-urban population in India
- Non-English speakers (Hindi support)
- Users with limited medical literacy

## Tech Stack
- **Frontend**: Expo SDK 54 (React Native + TypeScript), expo-router, zustand, react-native-reanimated, lucide-react-native, expo-image-picker, expo-camera, expo-av, expo-haptics
- **Backend**: FastAPI (Python), MongoDB (motor), httpx
- **AI**:
  - Medicine image identification & medical guidance — **Google Gemini `gemini-flash-latest`** (user-provided API key, direct REST API)
  - Voice transcription — **OpenAI Whisper `whisper-1`** via `emergentintegrations` (Emergent Universal LLM Key)

## Features
### Inputs
1. **Image** — camera or gallery → base64 → Gemini → medicine identification
2. **Voice** — record via expo-av → base64 → Whisper transcription → editable text → Gemini query
3. **Text** — typed symptom or medicine name → Gemini medical guidance

### Outputs (structured JSON from Gemini)
- Medicine name (if identifiable)
- Plain-language summary (1–3 lines)
- Common uses, safety tips, possible side effects
- Safe dosage note (defers to packaging/doctor for prescription drugs)
- When to see a doctor
- **RED FLAG alert** for serious symptoms (chest pain, stroke signs, severe bleeding, breathing difficulty, etc.)
- Mandatory disclaimer banner in user's language

### Screens
- `/` Home — brand header, language toggle, hero card, big Scan/Voice buttons, text input + ask, history link
- `/result` Result — query chip, full ResultCard with red-flag & disclaimer banners
- `/history` History — list of past queries stored in MongoDB, open / clear

### Languages
- English (default) and Hindi (हिंदी) — full UI translation + AI responses in selected language

### Safety System
- Strict system prompt: General Physician persona, never prescribes strong drugs, never invents names
- Red-flag detection with large warning banner + haptic feedback
- Always-visible disclaimer ("Not a confirmed diagnosis. Please consult a qualified doctor.")

### Permissions
- Camera, Microphone, Photo Library — declared in `app.json` (iOS `infoPlist`, Android `permissions`)

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET  | /api/health | Service + model status |
| POST | /api/identify-medicine | Image → medicine info |
| POST | /api/medical-query | Text → medical guidance |
| POST | /api/transcribe-audio | Audio (base64) → text |
| GET  | /api/history | List past queries |
| DELETE | /api/history | Clear history |

## Environment
Backend `.env` keys: `MONGO_URL`, `DB_NAME`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `EMERGENT_LLM_KEY`.

## Testing
Full E2E pass (backend + frontend). Whisper live audio transcription not verified with a real audio fixture but integration is wired.

## Future
- Add more Indian languages (Marathi, Bengali, Telugu, Tamil)
- On-device OCR fallback for offline use
- Pharmacy / telemedicine referral
