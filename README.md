# 🤖 ChatIA RAG

Sistema inteligente de conversação com IA utilizando RAG (Retrieval-Augmented Generation) para respostas contextualizadas baseadas em documentos.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-v18+-green.svg)
![React](https://img.shields.io/badge/react-v18-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-v5.6-blue.svg)

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Credenciais do Banco](#credenciais-do-banco)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Deploy](#deploy)

## 🎯 Sobre o Projeto

O **ChatIA RAG** é uma plataforma completa de conversação inteligente que combina a potência de modelos de linguagem avançados (LLMs) com a técnica de RAG para fornecer respostas precisas e contextualizadas baseadas em documentos específicos.

### Principais Diferenciais

- 📚 **RAG (Retrieval-Augmented Generation)**: Respostas baseadas em documentos enviados
- 💬 **Conversas Persistentes**: Histórico completo de conversas com gerenciamento de estado
- 📄 **Upload de Documentos**: Suporte para PDF, TXT e Markdown com embeddings vetoriais
- 🔐 **Sistema de Autenticação**: JWT com gerenciamento de usuários
- 📊 **Dashboard de Métricas**: Visualização de uso, documentos e avaliações


## ✨ Funcionalidades

### Para Usuários

- ✅ Autenticação segura (registro e login)
- ✅ Upload de documentos (PDF, TXT, MD)
- ✅ Chat com IA usando contexto dos documentos
- ✅ Avaliação de respostas (thumbs up/down)
- ✅ Seleção de documentos por conversa
- ✅ Dashboard com métricas de uso
- ✅ Configuração de modelos de IA
- ✅ System prompts personalizados

### Recursos Técnicos

- 🔍 Busca semântica vetorial (Supabase pgvector)
- 🧠 Múltiplos modelos de IA (OpenAI, Claude, Llama, Gemini)
- 📈 Métricas em tempo real
- 🔄 Auto-atualização de estatísticas
- 💾 Armazenamento persistente
- 🚀 Deploy otimizado para Vercel

## 🛠️ Tecnologias

### Backend

- **Node.js** v18+
- **Express** v5.1 - Framework web
- **TypeScript** v5.6 - Tipagem estática
- **Supabase** - PostgreSQL com pgvector
- **OpenRouter** - Gateway para múltiplos LLMs
- **JWT** - Autenticação
- **Multer** - Upload de arquivos
- **pdf-parse** - Parser de PDFs

### Frontend

- **React** v18 - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **TailwindCSS** - Estilização
- **React Router** - Navegação
- **Axios** - Requisições HTTP
- **Lucide React** - Ícones

### Database

- **PostgreSQL** (Supabase)
- **pgvector** - Extensão para embeddings
- **Triggers** - Auto-atualização de stats

## 🏗️ Arquitetura

```
┌─────────────────┐
│   React SPA     │  ← Frontend (Vite + React + TS)
│  (TailwindCSS)  │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Express API    │  ← Backend (Node.js + TypeScript)
│   (server.js)   │
└────┬────────────┘
     │
     ├─► OpenRouter API (LLMs)
     │
     └─► Supabase (PostgreSQL + pgvector)
              │
              ├─► users
              ├─► conversations
              ├─► messages
              ├─► documents
              ├─► embeddings (VECTOR)
              └─► configs
```

## 📦 Instalação

### Pré-requisitos

- Node.js v18 ou superior
- npm ou yarn
- Conta Supabase (gratuita)
- Chave API OpenRouter

### Passo a Passo

1. **Clone o repositório**

```bash
git clone https://github.com/Lleooli/ChatIARAG.git
cd ChatIARAG
```

2. **Instale as dependências do backend**

```bash
npm install
```

3. **Instale as dependências do frontend**

```bash
cd frontend
npm install
cd ..
```

4. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
SUPABASE_URL=sua-url-supabase
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# JWT
JWT_SECRET=seu-secret-jwt-super-seguro

# OpenRouter
OPENROUTER_API_KEY=sua-chave-openrouter

# Optional: WhatsApp (Evolution API)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-evolution
```

5. **Configure o banco de dados**

Execute o schema SQL no Supabase:

```bash
# Acesse o SQL Editor no Supabase Dashboard
# Cole e execute o conteúdo de: supabase-schema-updated.sql
```

6. **Inicie o projeto**

```bash
# Terminal 1 - Backend
npm run dev
# ou
node server.js

# Terminal 2 - Frontend
cd frontend
npm run dev
```

7. **Acesse a aplicação**

- Frontend: http://localhost:5174
- Backend: http://localhost:3000

## 🔧 Configuração

### OpenRouter API

1. Acesse [OpenRouter](https://openrouter.ai)
2. Crie uma conta
3. Gere uma API Key
4. Configure no sistema em **Configurações**

### Modelos Disponíveis

- OpenAI GPT-4 Turbo
- OpenAI GPT-4
- OpenAI GPT-3.5 Turbo
- Claude 3.5 Sonnet
- Claude 3 Opus
- Llama 3 70B
- Google Gemini Pro

## 🔐 Credenciais do Banco

### Supabase Database

```
URL: https://oaajzlwfbuxeottcydgi.supabase.co
```

**Service Role Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYWp6bHdmYnV4ZW90dGN5ZGdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODMzODE0OCwiZXhwIjoyMDQzOTE0MTQ4fQ.G-V0M4Nqq4qIpUIFVpvH4o-JzWt3oLbZLSAL5Y9hpkY
```

> ⚠️ **Nota de Segurança**: A Anon Key foi removida do README por segurança. Para obter as credenciais completas, consulte o arquivo `.env.local` ou acesse o dashboard do Supabase.

### Estrutura de Tabelas

- **users** - Usuários do sistema
- **conversations** - Histórico de conversas
- **messages** - Mensagens individuais
- **documents** - Documentos enviados
- **embeddings** - Vetores para busca semântica
- **configs** - Configurações por usuário

### Acessar Database

1. Acesse: https://supabase.com/dashboard
2. Login: leonardop.oliveira9753@gmail.com
3. Projeto: ChatIARAG
4. Table Editor ou SQL Editor

## 🚀 Uso

### 1. Criar Conta

Acesse `/register` e crie sua conta

### 2. Configurar API

1. Vá em **Configurações**
2. Adicione sua chave OpenRouter
3. Escolha o modelo de IA
4. (Opcional) Personalize o system prompt

### 3. Upload de Documentos

1. Vá em **Documentos**
2. Arraste ou clique para fazer upload
3. Suporta: PDF, TXT, MD (até 10MB)

### 4. Iniciar Conversa

1. Vá em **Chat**
2. Selecione documentos (opcional)
3. Digite sua pergunta
4. A IA responderá usando o contexto dos documentos

### 5. Gerenciar Conversas

- **Nova Conversa**: Clique no botão "Nova Conversa"
- **Arquivar**: Clique em "Encerrar Conversa"
- **Deletar**: Clique no ícone de lixeira
- **Visualizar**: Clique na conversa na barra lateral

## 📁 Estrutura do Projeto

```
ChatIARAG/
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── contexts/        # Context API (Auth)
│   │   ├── lib/            # APIs e utilitários
│   │   ├── pages/          # Páginas da aplicação
│   │   └── index.css       # Estilos globais
│   ├── package.json
│   └── vite.config.ts
│
├── lib/                     # Backend Libraries
│   ├── openrouter.ts       # Cliente OpenRouter
│   ├── rag.ts              # Sistema RAG
│   ├── supabase.ts         # Cliente Supabase
│   └── evolution.js        # WhatsApp Integration
│
├── server.js               # Express Server
├── package.json
├── tsconfig.json
├── supabase-schema-updated.sql
└── README.md
```

## 🔌 API Endpoints

### Autenticação

- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Conversas

- `GET /api/conversations` - Listar conversas
- `POST /api/conversations` - Criar conversa
- `PATCH /api/conversations/:id` - Atualizar status
- `DELETE /api/conversations/:id` - Deletar conversa
- `GET /api/conversations/:id/messages` - Mensagens da conversa

### Chat

- `POST /api/chat` - Enviar mensagem
- `POST /api/messages/:id/rate` - Avaliar resposta

### Documentos

- `GET /api/documents` - Listar documentos
- `POST /api/documents/upload` - Upload de documento
- `DELETE /api/documents/:id` - Deletar documento

### Configurações

- `GET /api/config` - Buscar configurações
- `POST /api/config` - Salvar configurações

### Métricas

- `GET /api/metrics?range=7d` - Métricas do usuário

### WhatsApp (Opcional)

- `POST /api/webhook/whatsapp` - Webhook Evolution API
- `GET /api/webhook/status` - Status do webhook

## 👨‍💻 Autor

**Leonardo Paulino de Oliveira**

- GitHub: [@Lleooli](https://github.com/Lleooli)
- Email: leonardop.oliveira9753@gmail.com

## 🙏 Agradecimentos

- [OpenRouter](https://openrouter.ai) - Gateway para LLMs
- [Supabase](https://supabase.com) - Backend as a Service
- [Vercel](https://vercel.com) - Hosting
- [React](https://react.dev) - Framework UI
- [TailwindCSS](https://tailwindcss.com) - Estilização
