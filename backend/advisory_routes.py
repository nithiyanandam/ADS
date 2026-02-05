
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
import shutil
import os
from typing import List, Optional

# Import our RAG Engine
from compliance_rag import ingest_rulebook, query_rules, list_rulebooks, UPLOAD_DIR

router = APIRouter(prefix="/advisory", tags=["advisory"])

class AdvisoryRequest(BaseModel):
    diff_text: str
    context: Optional[str] = None

class Rule(BaseModel):
    text: str
    source: str

class AdvisoryResponse(BaseModel):
    relevant_rules: List[Rule]
    risk_assessment: Optional[str] = None # Placeholder for when we move logic here

@router.get("/rules")
async def get_active_rulebooks():
    """List all available/indexed rulebooks."""
    return {"rulebooks": list_rulebooks()}

@router.post("/upload")
async def upload_rulebook(file: UploadFile = File(...)):
    """Upload and Index a PDF Rulebook."""
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Trigger Ingestion
        result = ingest_rulebook(file_path, file.filename)
        
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
            
        return {"filename": file.filename, "status": "Indexed", "details": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve")
async def retrieve_context(request: AdvisoryRequest):
    """Retrieve relevant rules for a given difference text."""
    try:
        rules = query_rules(request.diff_text)
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear")
async def clear_all_rulebooks():
    """Clear all indexed rulebooks and files."""
    from compliance_rag import clear_rulebooks
    result = clear_rulebooks()
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result
