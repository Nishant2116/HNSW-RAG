import os
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from dotenv import load_dotenv
import uuid

load_dotenv()

# Configure Jina AI
JINA_API_KEY = os.getenv("JINA_API_KEY")
if not JINA_API_KEY:
    raise ValueError("JINA_API_KEY is not set in environment variables")

# Configure Qdrant
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))

class RAGService:
    def __init__(self, collection_name="rag_collection"):
        self.collection_name = collection_name
        
        if QDRANT_URL:
            # Connect to Qdrant Cloud or remote instance
            self.client = QdrantClient(
                url=QDRANT_URL, 
                api_key=QDRANT_API_KEY
            )
        else:
            # Fallback to local mode
            print("No QDRANT_URL found, using local mode/host.")
            self.client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        
        # Jina AI embedding configuration
        self.jina_url = "https://api.jina.ai/v1/embeddings"
        self.jina_model = "jina-embeddings-v3"
        self.vector_size = 1024  # jina-embeddings-v3 output dimension

        # Ensure collection exists
        self._ensure_collection()

    def _ensure_collection(self):
        collections = self.client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if self.collection_name in collection_names:
            # Check if dimensions match, delete and recreate if not
            try:
                collection_info = self.client.get_collection(self.collection_name)
                existing_size = collection_info.config.params.vectors.size
                if existing_size != self.vector_size:
                    print(f"Vector size mismatch: collection has {existing_size}, need {self.vector_size}. Recreating...")
                    self.client.delete_collection(self.collection_name)
                else:
                    print(f"Collection '{self.collection_name}' exists with correct dimensions.")
                    return
            except Exception as e:
                print(f"Error checking collection: {e}. Recreating...")
                self.client.delete_collection(self.collection_name)
        
        print(f"Creating collection '{self.collection_name}' with {self.vector_size} dimensions...")
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
        )
        print("Collection created successfully.")

    def generate_embedding(self, text: str):
        import json
        print(f"Generating embedding for text: {text[:30]}...")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {JINA_API_KEY}"
        }
        data = {
            "model": self.jina_model,
            "task": "text-matching",
            "truncate": True,
            "input": [text]
        }
        try:
            response = requests.post(self.jina_url, headers=headers, data=json.dumps(data))
            if response.status_code != 200:
                print(f"Jina API error: {response.status_code} - {response.text}")
            response.raise_for_status()
            emb = response.json()["data"][0]["embedding"]
            print(f"Embedding generated successfully. Length: {len(emb)}")
            return emb
        except Exception as e:
            print(f"Error generating embedding: {e}")
            raise e
    
    def generate_query_embedding(self, text: str):
        # ... (similar logging if needed, but let's stick to generate_embedding for now since they are identical logic)
        return self.generate_embedding(text)

    def _chunk_text(self, text: str, chunk_size: int = 300, overlap: int = 50):
        """
        Splits text into overlapping chunks of words.
        Args:
            text: The text to chunk
            chunk_size: Number of words per chunk
            overlap: Number of words to overlap between chunks
        """
        words = text.split()
        if not words:
            return []
        
        chunks = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk_words = words[start:end]
            chunks.append(" ".join(chunk_words))
            
            if end >= len(words):
                break
                
            start += (chunk_size - overlap)
            
        return chunks

    def ingest_document(self, content: str, filename: str):
        print(f"Ingesting document: {filename}, length: {len(content)}")
        
        # Use sliding window chunking instead of paragraph splitting
        paragraphs = self._chunk_text(content)
        print(f"Created {len(paragraphs)} chunks from document.")
        
        points = []
        for i, para in enumerate(paragraphs):
            print(f"Processing chunk {i+1}/{len(paragraphs)}")
            vector = self.generate_embedding(para)
            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=vector,
                payload={"filename": filename, "content": para, "chunk_index": i}
            ))

        if points:
            print(f"Upserting {len(points)} points to Qdrant...")
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            print("Upsert successful.")
        return len(points)

    def search(self, query: str, limit: int = 5):
        from qdrant_client.models import models
        query_vector = self.generate_query_embedding(query)
        search_result = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit
        )
        return search_result.points
