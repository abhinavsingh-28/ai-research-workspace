# ============================================
# Vector Store — ChromaDB Setup
# ============================================
# This module initializes and manages our ChromaDB connection.
#
# CONCEPT: What is a Vector Database?
#
# A normal database (like MongoDB) stores data and lets you search by
# exact field values:  "Find all papers with title = 'Attention Is All You Need'"
#
# A vector database stores "embeddings" — numerical representations of text —
# and lets you search by MEANING:  "Find paragraphs similar to 'how do transformers work?'"
#
# Here's how it works:
#
#   1. We take a chunk of text (e.g., a paragraph from a paper)
#   2. We pass it through an "embedding model" (like Gemini's text-embedding)
#   3. The model converts the text into a list of numbers (a "vector")
#      Example: "Transformers use self-attention" → [0.12, -0.34, 0.56, ...]
#   4. We store this vector in ChromaDB along with the original text
#   5. When a user asks a question, we convert their question to a vector too
#   6. ChromaDB finds the stored vectors that are closest (most similar) to the question
#   7. We return the corresponding text chunks — these are the most relevant passages
#
# This is the "R" in RAG: Retrieval. We RETRIEVE relevant context from our
# papers before sending it to the AI for answering.
#
# CONCEPT: ChromaDB
#
# ChromaDB is an open-source vector database that:
#   - Runs locally (no cloud account needed)
#   - Stores data on disk (PersistentClient → data survives restarts)
#   - Organizes data into "collections" (like MongoDB collections)
#   - Supports different embedding functions (we'll use Gemini's)
#
# CONCEPT: Singleton Pattern
#
# We only want ONE ChromaDB client instance for the entire app.
# The get_chroma_client() function creates it on first call and
# returns the same instance on subsequent calls. This is called
# the "singleton" pattern — there's only ever one instance.

import os
import chromadb

# Module-level variable to store our single ChromaDB client instance.
# None means it hasn't been created yet.
_chroma_client = None

def get_chroma_client():
    """
    Get or create the ChromaDB persistent client.

    Returns the same client instance every time (singleton pattern).
    Data is stored in the 'chroma_data/' directory inside ml-service/.
    This directory is in .gitignore because it contains generated data.
    """
    global _chroma_client

    if _chroma_client is None:
        # Construct the path to chroma_data/ inside the ml-service directory.
        # os.path.dirname(__file__) gives us the directory this file lives in.
        chroma_path = os.path.join(os.path.dirname(__file__), "chroma_data")

        # PersistentClient stores data on disk so it survives server restarts.
        # Without this, all embeddings would disappear when you stop the server.
        _chroma_client = chromadb.PersistentClient(path=chroma_path)

    return _chroma_client


def get_or_create_collection(paper_id):
    """
    Get or create a ChromaDB collection for a specific paper.

    Each paper gets its own collection, named 'paper_{paper_id}'.
    This keeps embeddings organized and lets us delete a paper's
    embeddings easily when the paper is deleted.

    Args:
        paper_id: The MongoDB _id of the paper (string)

    Returns:
        A ChromaDB Collection object
    """
    client = get_chroma_client()

    # get_or_create_collection: returns the collection if it exists,
    # or creates a new one if it doesn't. This is idempotent — safe
    # to call multiple times with the same name.
    collection = client.get_or_create_collection(
        name=f"paper_{paper_id}",
        metadata={"description": f"Embeddings for paper {paper_id}"},
    )

    return collection
