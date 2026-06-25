# 🔬 AI Research Workspace

A full-stack platform for reading research papers, asking AI-powered questions, and exploring ideas through branched conversations.

## What It Does

- **Upload & Read PDFs** — Upload research papers and view them in-browser
- **AI-Powered Q&A** — Ask questions about papers and get accurate answers with citations, powered by RAG (Retrieval-Augmented Generation)
- **Branched Conversations** — Explore multiple research threads simultaneously without context pollution. Each branch maintains its own isolated conversation history.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| Backend | Node.js + Express.js |
| ML/RAG Service | Python + FastAPI |
| Database | MongoDB (Mongoose) |
| Vector Store | ChromaDB |
| LLM | Google Gemini API |
| RAG Framework | LangChain |
| Auth | JWT + bcrypt |
| PDF Parsing | PyMuPDF |

## Project Structure

```
ai-research-workspace/
├── client/          # React frontend
├── server/          # Node.js + Express backend
├── ml-service/      # Python + FastAPI ML service
├── .env.example     # Environment variable template
└── .gitignore       # Git ignore rules
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.10+
- MongoDB Community Edition

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/ai-research-workspace.git
cd ai-research-workspace

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your actual values (Gemini API key, JWT secret, etc.)

# 3. Install backend dependencies
cd server && npm install

# 4. Install frontend dependencies
cd ../client && npm install

# 5. Set up Python ML service
cd ../ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 6. Start MongoDB (if not already running)
brew services start mongodb-community

# 7. Start all three services (in separate terminal tabs):
# Tab 1 — Backend:
cd server && npm run dev
# Tab 2 — Frontend:
cd client && npm run dev
# Tab 3 — ML Service:
cd ml-service && source venv/bin/activate && uvicorn main:app --reload --port 8000
```

## Architecture

The project runs 3 independent services:

1. **React Frontend** (port 5173) — The UI the user interacts with
2. **Node.js Backend** (port 5000) — REST API, auth, data management
3. **Python ML Service** (port 8000) — PDF parsing, RAG pipeline, AI queries

The backend acts as a gateway — the frontend talks to the backend, and the backend talks to the ML service. MongoDB stores application data; ChromaDB stores document embeddings for vector similarity search.

## License

MIT
