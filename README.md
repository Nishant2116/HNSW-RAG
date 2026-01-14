# HNSW RAG Visualization

A Retrieval-Augmented Generation (RAG) system featuring a high-performance 3D visualization of the Hierarchical Navigable Small World (HNSW) algorithm. This project demonstrates how vector search works under the hood with an interactive, beautiful interface.

## Features

-   **3D HNSW Visualization:** Interactive 3D view of HNSW layers, nodes, and connections using React Three Fiber.
-   **Real-time Search:** Visualize the search path through HNSW layers as you query documents.
-   **RAG Backend:** Fast API backend using Qdrant for vector storage and Jina AI for embeddings.
-   **Smart Chunking:** text processing with sliding window chunking to ensure relevant search results.
-   **Modern UI:** Sleek, dark-themed interface built with React, Tailwind CSS, and Framer Motion.

## Tech Stack

### Frontend
-   React 18
-   Vite
-   Three.js / React Three Fiber
-   Tailwind CSS
-   Framer Motion

### Backend
-   FastAPI
-   Qdrant (Vector Database)
-   Jina AI (Embeddings)
-   Python 3.10+

## Getting Started

### Prerequisites
-   Node.js 18+
-   Python 3.10+
-   Qdrant instance (local or cloud)
-   Jina AI API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Nishant2116/HNSW-RAG.git
    cd HNSW-RAG
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
    Create a `.env` file in `backend/` with:
    ```
    JINA_API_KEY=your_key_here
    QDRANT_HOST=localhost
    QDRANT_PORT=6333
    ```

3.  **Setup Frontend:**
    ```bash
    cd frontend
    npm install
    ```

### Running the App

1.  **Start Backend:**
    ```bash
    # In backend/ directory
    uvicorn main:app --reload
    ```

2.  **Start Frontend:**
    ```bash
    # In frontend/ directory
    npm run dev
    ```

## Usage
1.  Open the frontend (usually http://localhost:5173).
2.  Use the "Ingest" tab to upload documents (PDF, DOCX, TXT).
3.  Switch to "Search" and enter a query.
4.  Watch the 3D visualization show how the HNSW algorithm finds the nearest neighbors!

## License
MIT
