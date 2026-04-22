"""Backend tests for Pahadi Pharma Assistant API."""
import os
import base64
import requests
import pytest
from pathlib import Path

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://medicine-scanner-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


def _get_image_b64():
    # Use a real JPEG from expo assets if available; else fetch a paracetamol-like sample
    for p in [
        "/app/frontend/assets/images/icon.png",
        "/app/frontend/assets/images/adaptive-icon.png",
    ]:
        fp = Path(p)
        if fp.exists():
            data = fp.read_bytes()
            mime = "image/png" if p.endswith(".png") else "image/jpeg"
            return base64.b64encode(data).decode(), mime
    # Fallback: tiny JPEG (still not ideal but avoids network)
    return None, None


# ---- Health ----
def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert j["gemini_model"] == "gemini-flash-latest"
    assert j["has_gemini_key"] is True


# ---- Clear history to start clean ----
def test_clear_history_initial():
    r = requests.delete(f"{API}/history", timeout=15)
    assert r.status_code == 200
    assert "deleted" in r.json()


# ---- Medical query: English ----
def test_medical_query_english():
    r = requests.post(f"{API}/medical-query",
                      json={"query": "I have mild fever", "language": "en"}, timeout=90)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["language"] == "en"
    assert isinstance(j["summary"], str) and len(j["summary"]) > 0
    assert isinstance(j["safety_tips"], list)
    assert isinstance(j["disclaimer"], str) and len(j["disclaimer"]) > 0


# ---- Medical query: Hindi ----
def test_medical_query_hindi():
    r = requests.post(f"{API}/medical-query",
                      json={"query": "सिरदर्द है", "language": "hi"}, timeout=90)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["language"] == "hi"
    # Check for any Devanagari char
    text = (j["summary"] or "") + (j["disclaimer"] or "")
    assert any("\u0900" <= c <= "\u097F" for c in text), f"No Hindi text: {text[:200]}"


# ---- Red flag ----
def test_medical_query_red_flag():
    r = requests.post(f"{API}/medical-query",
                      json={"query": "I have severe chest pain and cannot breathe", "language": "en"},
                      timeout=90)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["red_flag"] is True, f"Expected red_flag=True, got {j}"
    assert j.get("red_flag_message"), "Expected red_flag_message populated"


# ---- Identify medicine (image) ----
def test_identify_medicine_image():
    b64, mime = _get_image_b64()
    if not b64:
        pytest.skip("No local image fixture available")
    r = requests.post(f"{API}/identify-medicine",
                      json={"image_base64": b64, "mime_type": mime, "language": "en"},
                      timeout=120)
    assert r.status_code == 200, r.text
    j = r.json()
    assert isinstance(j["summary"], str) and len(j["summary"]) > 0
    assert j["language"] == "en"


# ---- Transcribe audio (skip if no fixture) ----
def test_transcribe_audio_skip():
    pytest.skip("No audio fixture available; skipping per test plan")


# ---- History list ----
def test_history_list():
    r = requests.get(f"{API}/history", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 2, f"Expected history >=2 after prior calls, got {len(items)}"
    for it in items:
        assert "_id" not in it, "MongoDB _id leaked in history"
        assert "id" in it and "response" in it and "input_type" in it


# ---- Clear history end ----
def test_clear_history_end():
    r = requests.delete(f"{API}/history", timeout=15)
    assert r.status_code == 200
    # verify empty
    r2 = requests.get(f"{API}/history", timeout=15)
    assert r2.status_code == 200
    assert r2.json() == []
