# PROCESSO.md - Documentação Técnica do Desenvolvimento

> Este documento registra todas as decisões técnicas, arquitetura, raciocínio e dificuldades encontradas durante o desenvolvimento do ChatIARAG.


### Arquitetura Planejada

```
┌─────────────┐
│   Cliente   │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Next.js App   │
│  (Frontend)     │
│  - React UI     │
│  - API Routes   │
└────────┬────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────┐
│  FastAPI Backend │◄────►│  PostgreSQL  │
│  - RAG Engine    │      │  (Supabase)  │
│  - LangChain     │      └──────────────┘
│  - FAISS Store   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   OpenAI API     │
│  - Embeddings    │
│  - GPT-4         │
└──────────────────┘
```

### Fluxo de Dados RAG

1. **Upload de Documento**
   - Frontend → Backend (multipart/form-data)
   - Parsing (PDF/DOCX/TXT)
   - Text splitting (chunks de ~500 tokens)
   - Geração de embeddings (OpenAI)
   - Armazenamento em FAISS + metadata no PostgreSQL

2. **Query do Usuário**
   - Frontend envia pergunta → Backend
   - Embedding da pergunta (OpenAI)
   - Busca semântica no FAISS (top-k documentos)
   - Construção do prompt com contexto
   - Envio para GPT-4 (LangChain)
   - Resposta + fontes → Frontend

## 📊 Métricas de Qualidade

- **Cobertura de Testes**: Meta 70%+
- **Tempo de Resposta RAG**: < 3s
- **Precisão de Retrieval**: Top-3 relevância > 80%
