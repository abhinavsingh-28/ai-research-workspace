# ============================================
# Query Engine — Ask Questions About Papers
# ============================================
# This module handles the "retrieval + generation" phase of RAG.
# Given a user's question and a paper ID, it:
#   1. Converts the question into a vector (using the same embedding model)
#   2. Searches ChromaDB for the most similar text chunks
#   3. Builds a prompt with those chunks as context
#   4. Sends the prompt to Gemini to generate a natural language answer
#
# CONCEPT: RAG (Retrieval-Augmented Generation)
#
# The key insight of RAG is that LLMs (like Gemini) are great at language
# but don't know the content of YOUR specific documents. By retrieving
# relevant chunks and injecting them into the prompt, we give the LLM
# the context it needs to answer accurately.
#
# Without RAG:  "What is the GPA mentioned?" → "I don't know, I haven't read it."
# With RAG:     "What is the GPA mentioned?" → "The document mentions a GPA of 8.5."
#
# CONCEPT: Similarity Search
#
# When we search ChromaDB, we don't do keyword matching (like CTRL+F).
# Instead, we compare the MEANING of the question to the MEANING of each chunk.
# This is called "semantic search" — it finds relevant passages even if they
# don't contain the exact words from the question.
#
# Example:
#   Question: "What programming languages were used?"
#   Match: "The project was built with Python and JavaScript"
#   (No word overlap, but the meaning is related!)

import os
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from vector_store import get_or_create_collection


def query_paper(paper_id: str, question: str, conversation_history: list = None):
    """
    The main RAG query pipeline for a single paper.

    Args:
        paper_id: The MongoDB _id of the paper (string)
        question: The user's question (string)
        conversation_history: List of dicts with 'role' and 'content' for the branch context

    Returns:
        dict with 'answer' and 'sources' (the retrieved chunks)
    """
    print(f"\n--- Query for Paper {paper_id} ---")
    print(f"Question: {question}")

    api_key = os.getenv("GEMINI_API_KEY")

    # ============================================
    # Step 1: Embed the Question
    # ============================================
    # We convert the user's question into a vector using the SAME
    # embedding model we used during ingestion. This is critical —
    # if we used a different model, the vectors wouldn't be comparable.

    embeddings_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key
    )

    question_vector = embeddings_model.embed_query(question)

    # ============================================
    # Step 2: Search ChromaDB for Relevant Chunks
    # ============================================
    # collection.query() performs a "nearest neighbor" search.
    # It finds the chunks whose vectors are closest to the question vector.
    #
    # n_results=5 means: return the top 5 most relevant chunks.
    # More chunks = more context for the AI, but also more noise.
    # 5 is a good balance for research papers.

    collection = get_or_create_collection(paper_id)

    # Check if the collection has any documents
    if collection.count() == 0:
        return {
            "answer": "This paper hasn't been processed yet. Please wait a moment and try again.",
            "sources": []
        }

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=min(5, collection.count()),  # Don't request more than we have
    )

    # Extract the matched text chunks
    retrieved_chunks = results["documents"][0]  # [0] because we only sent 1 query
    print(f"Retrieved {len(retrieved_chunks)} relevant chunks from ChromaDB.")

    # ============================================
    # Step 3: Build the Prompt
    # ============================================
    # This is the "augmented" part of RAG. We inject the retrieved context
    # directly into the prompt so Gemini can use it to answer.
    #
    # The prompt has 3 parts:
    #   1. System instruction: tells Gemini its role and rules
    #   2. Context: the relevant text chunks from the paper
    #   3. Question: the user's actual question

    context = "\n\n---\n\n".join(retrieved_chunks)

    # Format the conversation history
    history_text = ""
    if conversation_history:
        history_text = "PRIOR CONVERSATION (Branch Context):\n"
        for msg in conversation_history:
            role = "USER" if msg.get("role") == "user" else "AI"
            history_text += f"{role}: {msg.get('content')}\n"
        history_text += "\n"

    prompt = f"""You are a helpful AI research assistant. You answer questions about research papers based ONLY on the provided context from the paper.

Rules:
- Answer based ONLY on the context provided below. Do not use external knowledge.
- If the context doesn't contain enough information to answer, say "I couldn't find information about that in this paper."
- Be concise and clear. Use bullet points when listing multiple items.
- Quote relevant passages when appropriate.
- Consider the prior conversation history to understand the context of the user's current question.

CONTEXT FROM THE PAPER:
{context}

{history_text}USER'S QUESTION:
{question}

ANSWER:"""

    # ============================================
    # Step 4: Call Gemini to Generate the Answer
    # ============================================
    # We use google.generativeai directly here (not LangChain) because
    # for simple generation, the native SDK is simpler and faster.
    #
    # gemini-2.5-flash is Google's latest fast model — great for
    # chat responses where speed matters more than deep reasoning.

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    response = model.generate_content(prompt)
    answer = response.text

    print(f"Generated answer ({len(answer)} chars).")
    print("--- Query Complete ---\n")

    return {
        "answer": answer,
        "sources": retrieved_chunks,
    }
