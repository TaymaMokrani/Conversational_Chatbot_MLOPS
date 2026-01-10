# Conversational Chatbot with RAG (MLOPS Project)

<div align="center">

**An intelligent RAG-powered chatbot that answers questions about university programs using official PDF documents**
 • [Report](./report.pdf) •

</div>

## Overview

This project implements a **Retrieval-Augmented Generation (RAG) chatbot** that answers natural language questions about university programs by analyzing official PDF documents. The system provides **concise, accurate answers with source citations** while maintaining conversational context across multiple turns.

## Features

- **Hybrid Retrieval**: BM25 + Vector similarity with RRF fusion
- **Multi-PDF Support**: Process documents from multiple universities(FSB , OXFORD , HARVARD , MIT)
- **Conversational AI**: Maintains context throughout discussions
- **Smart Caching**: faster startup with intelligent embedding cache
- **MLOPS Configuration**: Version-controlled parameters for reproducibility
- **Docker Support**: Easy deployment with containerization

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/TaymaMokrani/Conversational_Chatbot_MLOPS.git
cd Conversational_Chatbot_MLOPS

# 2. Install dependencies
bun install

# 3. Add your OpenRouter API key

# 4. Add your PDF documents under Data/files
# Place university PDFs here (FSB.pdf, MIT.pdf, harvard.pdf, etc.)

# 5. Start the backend server
bun run dev

# 7. Open your browser
# http://localhost:3000
