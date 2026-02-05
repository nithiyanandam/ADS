import requests
import json

url = "http://localhost:8000/advisory/retrieve"
payload = {"diff_text": "Invoice Header Purchase Order ID"}

try:
    print(f"Testing URL: {url}")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Request failed: {e}")
