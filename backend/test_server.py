import sys
print("Starting import...", flush=True)
import fastapi
import uvicorn
print("FastAPI imported.", flush=True)
try:
    from docling.document_converter import DocumentConverter
    print("Docling imported.", flush=True)
except Exception as e:
    print(f"Docling import failed: {e}", flush=True)

if __name__ == "__main__":
    print("Hello from test server", flush=True)
