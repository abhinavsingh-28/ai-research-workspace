# ============================================
# Document Processor — PDF to ChromaDB Pipeline
# ============================================
# This module handles the "ingestion" phase of RAG.
# It takes a raw PDF file and prepares it for AI search.
#
# CONCEPT: The Ingestion Pipeline
#
# 1. Load: Read the PDF file from disk and extract raw text (PyMuPDF).
# 2. Split: Large texts exceed AI limits and dilute search quality.
#           We break the text into smaller, overlapping "chunks" (LangChain).
# 3. Embed: We send each chunk to Gemini to get its vector representation.
# 4. Store: We save the text chunks and their vectors into ChromaDB.
#
# CONCEPT: RecursiveCharacterTextSplitter
#
# We don't just split blindly at exactly 1000 characters (which might cut
# a word or sentence in half). The "Recursive" splitter tries to split
# at natural boundaries:
#   1st try: double newlines (paragraphs)
#   2nd try: single newlines (lines)
#   3rd try: spaces (words)
#
# chunk_overlap is crucial! It means the end of chunk A overlaps with the
# beginning of chunk B. This ensures that concepts spanning across a split
# aren't lost (e.g., if a sentence explaining a term is split).

import os
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from vector_store import get_or_create_collection

def extract_text_from_pdf(filepath):
    """
    Extracts raw text from a PDF file using PyMuPDF (fitz).
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"PDF file not found: {filepath}")

    doc = fitz.open(filepath)
    text = ""
    # Iterate through every page and append the text
    for page in doc:
        text += page.get_text() + "\n"
    
    doc.close()
    return text

def process_paper(paper_id, filename):
    """
    The main ingestion pipeline for a single research paper.
    Reads the PDF from the Node server's upload directory, chunks it,
    embeds it using Gemini, and stores it in ChromaDB.
    """
    print(f"\n--- Starting Processing for Paper {paper_id} ---")
    
    # 1. Locate the file
    # The Python service runs in /ml-service.
    # The uploads are in /uploads (sibling directory).
    base_dir = os.path.dirname(os.path.dirname(__file__))
    filepath = os.path.join(base_dir, 'uploads', filename)
    
    print(f"Loading PDF: {filepath}")
    
    # 2. Extract Text
    try:
        raw_text = extract_text_from_pdf(filepath)
        print(f"Extracted {len(raw_text)} characters of text.")
    except Exception as e:
        print(f"Failed to read PDF: {str(e)}")
        raise e

    if not raw_text.strip():
        raise ValueError("PDF contains no extractable text (might be a scanned image).")

    # 3. Split Text into Chunks
    # chunk_size: ~1000 characters per chunk
    # chunk_overlap: ~200 characters overlap between chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    chunks = text_splitter.split_text(raw_text)
    print(f"Created {len(chunks)} overlapping text chunks.")

    # 4. Initialize Gemini Embeddings
    # This uses the GEMINI_API_KEY from the environment.
    # "models/text-embedding-004" is Google's latest embedding model.
    print("Initializing Gemini embeddings model...")
    api_key = os.getenv("GEMINI_API_KEY")
    embeddings_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key
    )

    # 5. Connect to ChromaDB Collection
    collection = get_or_create_collection(paper_id)
    
    # 6. Generate Embeddings & Store in ChromaDB
    print("Generating embeddings and saving to ChromaDB... (this may take a moment)")
    
    # We prepare the data in the format ChromaDB expects:
    # documents: the raw text strings
    # metadatas: extra info (we store the paper_id and chunk index)
    # ids: a unique string ID for every chunk (e.g., "paper123_chunk5")
    
    documents = []
    metadatas = []
    ids = []
    
    for i, chunk in enumerate(chunks):
        documents.append(chunk)
        metadatas.append({"paper_id": str(paper_id), "chunk_index": i})
        ids.append(f"{paper_id}_chunk_{i}")
        
    # We use embeddings_model.embed_documents() to convert the text to vectors.
    vectors = embeddings_model.embed_documents(documents)
    
    # Add everything to the ChromaDB collection
    collection.add(
        documents=documents,
        embeddings=vectors,
        metadatas=metadatas,
        ids=ids
    )
    
    print(f"✅ Successfully stored {len(chunks)} vectorized chunks in ChromaDB!")
    print("--- Processing Complete ---\n")
    
    return {
        "success": True, 
        "chunks": len(chunks),
        "message": "Paper processed and embedded successfully"
    }
