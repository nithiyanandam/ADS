from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import tempfile
from docling.document_converter import DocumentConverter
from advisory_routes import router as advisory_router

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(advisory_router)

# Lazy load converter to allow server to start immediately
converter = None

def get_converter():
    global converter
    if converter is None:
        print("Initializing Docling Converter (this may take a while)...")
        from docling.document_converter import DocumentConverter
        converter = DocumentConverter()
        print("Docling Converter Initialized.")
    return converter

from fastapi import Form

@app.post("/parse")
async def parse_pdf(
    file: UploadFile = File(...),
    output_format: str = Form("markdown") # markdown, json, html, text
):
    try:
        # Save uploaded file temporarily
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_path = tmp_file.name

        try:
            # Process with Docling
            doc_converter = get_converter()
            result = doc_converter.convert(tmp_path)
            
            content = ""
            if output_format == "markdown":
                content = result.document.export_to_markdown()
            elif output_format == "json":
                content = result.document.export_to_dict()
            elif output_format == "html":
                content = result.document.export_to_html()
            elif output_format == "text":
                content = result.document.export_to_text()
            elif output_format == "doctags":
                content = result.document.export_to_doctags()
            elif output_format == "document_tokens":
                 # Tokens are likely an iterator or generator, need check or listify
                 # Inspection showed 'export_to_document_tokens', assuming it returns serializable or we listify
                 tokens = result.document.export_to_document_tokens()
                 # Generators are not JSON serializable, so force list
                 content = list(tokens)
            elif output_format == "xml" or output_format == "element_tree":
                 # XML ElementTree
                 # Verify import
                 import xml.etree.ElementTree as ET
                 elem = result.document.export_to_element_tree()
                 if elem is not None:
                     content = ET.tostring(elem, encoding='unicode')
                 else:
                     content = "<error>No XML content</error>"
            else:
                content = f"Unsupported format: {output_format}"

            return {
                "filename": file.filename,
                "content": content,
                "structure": result.document.export_to_dict() # Always return full structure for debugging
            }
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        print(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "Docling Server Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
