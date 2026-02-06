import requests
import pytest


BASE_URL = "http://localhost:8000"
RETRIEVE_URL = f"{BASE_URL}/advisory/retrieve"


def _server_is_up() -> bool:
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=1.0)
        return resp.ok
    except requests.RequestException:
        return False


def test_retrieve_endpoint_contract_when_server_running():
    if not _server_is_up():
        pytest.skip("backend server not running on localhost:8000")

    payload = {"diff_text": "Invoice Header Purchase Order ID"}
    response = requests.post(RETRIEVE_URL, json=payload, timeout=5.0)

    assert response.status_code == 200
    body = response.json()
    assert "rules" in body
    assert isinstance(body["rules"], list)
