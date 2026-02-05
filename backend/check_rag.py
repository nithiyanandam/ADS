import chromadb
import os

DB_DIR = "./chroma_db"

def check_db():
    if not os.path.exists(DB_DIR):
        print(f"DB Directory {DB_DIR} does not exist.")
        return

    try:
        client = chromadb.PersistentClient(path=DB_DIR)
        collections = client.list_collections()
        print(f"Collections found: {[c.name for c in collections]}")

        if "rulebooks" in [c.name for c in collections]:
            coll = client.get_collection("rulebooks")
            count = coll.count()
            print(f"Count in 'rulebooks': {count}")
            
            if count > 0:
                peek = coll.peek(limit=3)
                print("--- Metadata Sample ---")
                print(peek['metadatas'])
                print("--- Document Sample (Truncated) ---")
                for doc in peek['documents']:
                    print(doc[:200] + "...")
        else:
            print("'rulebooks' collection NOT found.")

    except Exception as e:
        print(f"Error inspecting DB: {e}")

if __name__ == "__main__":
    check_db()
