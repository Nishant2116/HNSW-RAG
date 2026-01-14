from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from rag_service import RAGService
import uvicorn
import os

app = FastAPI(title="HNSW RAG API")

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = RAGService()

class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 5

class SearchResult(BaseModel):
    score: float
    content: str
    filename: str

class IngestResponse(BaseModel):
    message: str
    chunks_added: int

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "HNSW RAG System"}

@app.post("/ingest", response_model=IngestResponse)
async def ingest_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    try:
        content_bytes = await file.read()
        filename_lower = file.filename.lower()
        
        # Handle different file types
        if filename_lower.endswith('.pdf'):
            # Extract text from PDF
            from PyPDF2 import PdfReader
            import io
            pdf_reader = PdfReader(io.BytesIO(content_bytes))
            content = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    content += page_text + "\n\n"
            print(f"Extracted {len(content)} characters from PDF ({len(pdf_reader.pages)} pages)")
            
        elif filename_lower.endswith('.docx'):
            # Extract text from Word document
            from docx import Document
            import io
            doc = Document(io.BytesIO(content_bytes))
            content = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            print(f"Extracted {len(content)} characters from DOCX")
            
        else:
            # Try to decode as text file
            content = None
            for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    content = content_bytes.decode(encoding)
                    print(f"Successfully decoded file with {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                raise HTTPException(status_code=400, detail="Could not decode file. Supported formats: .txt, .pdf, .docx")
        
        if not content or not content.strip():
            raise HTTPException(status_code=400, detail="No text content could be extracted from the file")
            
        chunks = rag_service.ingest_document(content, file.filename)
        return {"message": f"Successfully ingested {file.filename}", "chunks_added": chunks}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=List[SearchResult])
def search_documents(query: SearchQuery):
    try:
        results = rag_service.search(query.query, query.limit)
        response = []
        for hit in results:
            response.append(SearchResult(
                score=hit.score,
                content=hit.payload.get("content", ""),
                filename=hit.payload.get("filename", "unknown")
            ))
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
