"""Backend tests for multi-medicine-query and regression on existing endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://medicine-scanner-3.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestHealth:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("has_gemini_key") is True


class TestMultiMedicineQuery:
    """POST /api/multi-medicine-query"""

    def test_two_medicines_en(self, client):
        payload = {"medicines": ["Paracetamol", "Ibuprofen"], "language": "en"}
        r = client.post(f"{BASE_URL}/api/multi-medicine-query", json=payload, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("medicines"), list)
        assert len(data["medicines"]) == 2
        for m in data["medicines"]:
            assert isinstance(m.get("name"), str) and m["name"]
            assert isinstance(m.get("summary"), str)
            assert isinstance(m.get("uses"), list)
            assert "dosage_note" in m
            assert isinstance(m.get("safety_tips"), list)
        assert isinstance(data.get("interactions"), list)
        assert isinstance(data.get("combined_safety"), list)
        assert isinstance(data.get("disclaimer"), str) and data["disclaimer"].strip()
        assert data.get("language") == "en"
        assert isinstance(data.get("red_flag"), bool)

    def test_four_medicines_rejected(self, client):
        payload = {"medicines": ["A", "B", "C", "D"], "language": "en"}
        r = client.post(f"{BASE_URL}/api/multi-medicine-query", json=payload, timeout=30)
        assert r.status_code == 400

    def test_empty_list_rejected(self, client):
        payload = {"medicines": [], "language": "en"}
        r = client.post(f"{BASE_URL}/api/multi-medicine-query", json=payload, timeout=30)
        assert r.status_code == 400

    def test_whitespace_only_rejected(self, client):
        payload = {"medicines": ["   ", ""], "language": "en"}
        r = client.post(f"{BASE_URL}/api/multi-medicine-query", json=payload, timeout=30)
        assert r.status_code == 400

    def test_hindi_response(self, client):
        payload = {"medicines": ["पैरासिटामोल"], "language": "hi"}
        r = client.post(f"{BASE_URL}/api/multi-medicine-query", json=payload, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("language") == "hi"
        assert len(data.get("medicines", [])) >= 1
        # Disclaimer should contain Devanagari characters
        disc = data.get("disclaimer", "")
        assert any("\u0900" <= ch <= "\u097F" for ch in disc), f"Expected Hindi text in disclaimer, got: {disc}"


class TestRegressionSingleEndpoints:
    def test_medical_query_en(self, client):
        payload = {"query": "I have mild fever", "language": "en"}
        r = client.post(f"{BASE_URL}/api/medical-query", json=payload, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("summary"), str) and data["summary"].strip()
        assert isinstance(data.get("disclaimer"), str)
        assert data.get("language") == "en"

    def test_medical_query_empty_rejected(self, client):
        payload = {"query": "   ", "language": "en"}
        r = client.post(f"{BASE_URL}/api/medical-query", json=payload, timeout=30)
        assert r.status_code == 400

    def test_identify_medicine_invalid_image(self, client):
        # Valid schema but garbage base64 – backend should not 500, it should 502 from Gemini or similar
        payload = {"image_base64": "AAAA", "mime_type": "image/jpeg", "language": "en"}
        r = client.post(f"{BASE_URL}/api/identify-medicine", json=payload, timeout=60)
        # Accept 200/400/502 — just ensure no 500 crash
        assert r.status_code in (200, 400, 502), r.text
