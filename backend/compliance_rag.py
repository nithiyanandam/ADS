
import os
import shutil
import uuid
import chromadb
from chromadb.config import Settings
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Configuration
DB_DIR = "./chroma_db"
UPLOAD_DIR = "./rulebooks"

# Initialize Chroma Client
# We use a persistent client so the "Learned Rules" stick around across restarts if needed
# But for this "Advisory Sidecar", we might want to clear it or scope it by session. 
# For now, let's keep it simple: One global "Knowledge Base".
if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Initialize Embeddings (Local, CPU-friendly)
# 'all-MiniLM-L6-v2' is small and fast.
try:
    print("Loading Embedding Model...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    print("Embedding Model Loaded.")
except Exception as e:
    print(f"Failed to load embeddings: {e}")
    embeddings = None

client = chromadb.PersistentClient(path=DB_DIR)

# Helper: Ingest a Rulebook
def ingest_rulebook(file_path: str, filename: str):
    try:
        # 1. Load PDF
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # 2. Split Text (Larger chunks for broad context on small files)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000, 
            chunk_overlap=300
        )
        splits = text_splitter.split_documents(docs)

        # 3. Create Collection (or get existing)
        # We use one collection for all rules, or separate? 
        # One collection "rulebooks" is simpler for now.
        collection = client.get_or_create_collection("rulebooks")

        # 4. Embed and Store
        ids = [str(uuid.uuid4()) for _ in splits]
        documents = [doc.page_content for doc in splits]
        metadatas = [{"source": filename, "page": doc.metadata.get("page", 0)} for doc in splits]
        
        # Determine actual embeddings? Chroma can do it automatically if we don't pass them?
        # Actually Chroma's default is using ONNX/all-MiniLM-L6-v2 built-in if no embedding func provided.
        # But we already imported Langchain's wrapper. 
        # Let's use Chroma's default for simplicity if we can, to avoid "sentence-transformers" dependency issues?
        # Wait, I already installed `sentence-transformers`.
        # Let's compute them locally to be sure control is ours.
        
        if embeddings:
            print("DEBUG: Using HuggingFace Embeddings for Ingestion.")
            embedded_vectors = embeddings.embed_documents(documents)
            collection.add(
                ids=ids,
                documents=documents,
                embeddings=embedded_vectors,
                metadatas=metadatas
            )
        else:
            print("DEBUG: Using Chroma Default Embeddings for Ingestion.")
            collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )

        return {"status": "success", "chunks_added": len(splits)}

    except Exception as e:
        print(f"Ingestion Error: {e}")
        return {"status": "error", "message": str(e)}

# Helper: Query Rules
def query_rules(query_text: str, n_results=10):
    try:
        print(f"DEBUG: Querying rules for: '{query_text}'")
        collection = client.get_collection("rulebooks")
        
        if embeddings:
            try:
                query_vec = embeddings.embed_query(query_text)
                results = collection.query(
                    query_embeddings=[query_vec],
                    n_results=n_results
                )
            except Exception as emb_err:
                print(f"Embedding Query Failed: {emb_err}. Falling back to default.")
                results = collection.query(
                    query_texts=[query_text],
                    n_results=n_results
                )
        else:
            results = collection.query(
                query_texts=[query_text],
                n_results=n_results
            )
            
        print(f"DEBUG: Found {len(results['documents'][0])} matches.")
        
        # Format results
        rules = []
        if results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][i]
                rules.append({
                    "text": doc,
                    "source": f"{meta.get('source', 'Unknown')} (Page {meta.get('page', 0)})"
                })
        return rules

    except Exception as e:
        print(f"Query Error: {e}")
        return []

# Helper: Clear All Rulebooks
def clear_rulebooks():
    try:
        # Delete from Chroma
        try:
            client.delete_collection("rulebooks")
        except:
            pass # Collection might not exist
            
        # Delete files
        if os.path.exists(UPLOAD_DIR):
            for f in os.listdir(UPLOAD_DIR):
                os.remove(os.path.join(UPLOAD_DIR, f))
                
        return {"status": "success", "message": "All rulebooks cleared."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Helper: List Active Rulebooks
def list_rulebooks():
    # Chroma doesn't list unique metadata sources easily without iterating.
    # We will just scan the upload dir for file existence as a proxy.
    files = []
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            files.append(f)
    return files
