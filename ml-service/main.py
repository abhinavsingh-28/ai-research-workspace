# ============================================
# ML Service — FastAPI Application Entry Point
# ============================================
# This is the main file for the Python ML service.
# It starts a FastAPI web server on port 8000.
#
# CONCEPT: FastAPI
#
# FastAPI is a Python web framework, similar to Express in Node.js.
# The key differences:
#
#   Express (Node.js)                    FastAPI (Python)
#   ─────────────────                    ─────────────────
#   const app = express()                app = FastAPI()
#   app.get('/path', handler)            @app.get('/path')
#   app.listen(5001)                     uvicorn main:app --port 8000
#   req, res                             Uses Python type hints + auto-docs
#
# FastAPI automatically generates API documentation at /docs (Swagger UI)
# and validates request/response data using Python type hints.
#
# CONCEPT: Uvicorn
#
# FastAPI is just a framework — it needs a server to run it.
# Uvicorn is an ASGI server (Asynchronous Server Gateway Interface).
# It does the same job as Node's HTTP module — listens on a port,
# receives HTTP requests, and passes them to FastAPI for handling.
#
# To run this file:
#   cd ml-service
#   source venv/bin/activate
#   uvicorn main:app --reload --port 8000
#
# --reload: auto-restarts when you change code (like nodemon/--watch)
# --port 8000: listen on port 8000

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from vector_store import get_chroma_client

# ============================================
# Load Environment Variables
# ============================================
# load_dotenv() reads the .env file and makes the values available
# via os.getenv(). We point it to the parent directory's .env file
# because our .env lives at the project root, not inside ml-service/.
#
# This is equivalent to what the 'dotenv' npm package does in Node.js.

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# ============================================
# Create FastAPI Application
# ============================================
# FastAPI() creates the app instance, similar to express() in Node.js.
# The title and version appear in the auto-generated docs at /docs.

app = FastAPI(
    title="AI Research Workspace — ML Service",
    version="1.0.0",
)

# ============================================
# CORS Middleware
# ============================================
# Just like in Express, we need to allow cross-origin requests.
# The frontend (port 5173) and the Node backend (port 5001) both
# need to talk to this service (port 8000).
#
# In Express we used: app.use(cors())
# In FastAPI we use: app.add_middleware(CORSMiddleware, ...)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Startup Event
# ============================================
# @app.on_event("startup") runs ONCE when the server starts.
# We use it to initialize ChromaDB and verify our API key is set.
#
# This is similar to connecting to MongoDB in our Express server —
# we want to make sure the database is ready before serving requests.

@app.on_event("startup")
async def startup_event():
    """Initialize services when the server starts."""
    # Initialize ChromaDB
    client = get_chroma_client()
    print(f"✅ ChromaDB initialized — data stored at: chroma_data/")

    # Check if Gemini API key is configured
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("⚠️  WARNING: GEMINI_API_KEY not set in .env file!")
        print("   Get one free at: https://aistudio.google.com/app/apikey")
    else:
        print(f"✅ Gemini API key configured (starts with: {api_key[:8]}...)")

    print(f"✅ ML Service running on port {os.getenv('ML_SERVICE_PORT', 8000)}")
    print(f"   API docs: http://localhost:{os.getenv('ML_SERVICE_PORT', 8000)}/docs")

# ============================================
# Health Check Endpoint
# ============================================
# GET /health — Returns service status and ChromaDB info.
# Similar to the health check in our Express server.
#
# In Express:
#   router.get('/health', (req, res) => { res.json({...}) })
#
# In FastAPI:
#   @app.get('/health')
#   async def health(): return {...}
#
# FastAPI automatically:
#   1. Serializes the dict to JSON
#   2. Sets Content-Type: application/json
#   3. Returns 200 status code

@app.get("/health")
async def health_check():
    """Check if the ML service is running and ChromaDB is connected."""
    client = get_chroma_client()

    return {
        "status": "healthy",
        "service": "ml-service",
        "chromadb": {
            "connected": client is not None,
            "collections": len(client.list_collections()) if client else 0,
        },
        "gemini_configured": os.getenv("GEMINI_API_KEY", "").startswith("AI"),
    }

# ============================================
# Pydantic Models
# ============================================
# Pydantic is FastAPI's secret weapon. It enforces strict typing
# on incoming JSON requests. If the Node backend sends a request
# missing 'paperId' or 'fileName', FastAPI automatically returns a
# 422 Unprocessable Entity error — we don't have to write validation code!
from pydantic import BaseModel

class ProcessRequest(BaseModel):
    paperId: str
    fileName: str

from document_processor import process_paper

@app.post("/process-document")
async def process_document_endpoint(req: ProcessRequest):
    """
    Endpoint called by the Node.js backend when a new paper is uploaded.
    It triggers the extraction, chunking, and embedding pipeline.
    """
    try:
        # process_paper is a synchronous blocking function right now.
        # In a production app, we'd use BackgroundTasks or Celery here
        # so we don't block the FastAPI event loop. For simplicity,
        # we'll just run it directly.
        result = process_paper(req.paperId, req.fileName)
        return result
    except Exception as e:
        # If anything goes wrong, return a 500 error to the Node backend
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Query Endpoint — Ask Questions About Papers
# ============================================
from query_engine import query_paper

class QueryRequest(BaseModel):
    paperId: str
    question: str

@app.post("/query")
async def query_endpoint(req: QueryRequest):
    """
    Endpoint called by the Node.js backend when a user asks a question.
    It searches ChromaDB for relevant chunks and generates an answer with Gemini.
    """
    try:
        result = query_paper(req.paperId, req.question)
        return result
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
