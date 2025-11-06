# 📝 Processo de Desenvolvimento - ChatIA RAG

Documentação completa do processo de desenvolvimento do sistema ChatIA RAG, desde a concepção até o deploy.

---

## 📋 Índice

1. [Planejamento](#1-planejamento)
2. [Configuração do Ambiente](#2-configuração-do-ambiente)
3. [Estrutura do Banco de Dados](#3-estrutura-do-banco-de-dados)
4. [Backend Development](#4-backend-development)
5. [Frontend Development](#5-frontend-development)
6. [Sistema RAG](#6-sistema-rag)
7. [Sistema de Autenticação](#7-sistema-de-autenticação)
8. [UI/UX e Responsividade](#8-uiux-e-responsividade)
9. [Testes e Validação](#9-testes-e-validação)
10. [Deploy](#10-deploy)

---

## 1. Planejamento

### 1.1 Definição de Requisitos

**Objetivo Principal:** Criar um sistema de chat inteligente com IA que utiliza RAG para fornecer respostas contextualizadas baseadas em documentos.

**Funcionalidades Core:**
- ✅ Sistema de autenticação de usuários
- ✅ Upload e processamento de documentos (PDF, TXT, MD)
- ✅ Chat com IA usando contexto de documentos
- ✅ Gerenciamento de conversas
- ✅ Dashboard de métricas
- ✅ Avaliação de respostas

**Tecnologias Escolhidas:**
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Database:** Supabase (PostgreSQL + pgvector)
- **IA:** OpenRouter (gateway para múltiplos LLMs)
- **Deploy:** Vercel

### 1.2 Arquitetura Definida

```
Frontend (React SPA)
    ↓ HTTP/REST
Backend (Express API)
    ↓
    ├─► OpenRouter (LLMs)
    └─► Supabase (PostgreSQL + Embeddings)
```

---

## 2. Configuração do Ambiente

### 2.1 Inicialização do Projeto Backend

```bash
# Criar diretório do projeto
mkdir ChatIARAG
cd ChatIARAG

# Inicializar package.json
npm init -y

# Instalar dependências principais
npm install express cors dotenv
npm install @supabase/supabase-js
npm install axios jsonwebtoken bcryptjs
npm install multer pdf-parse markdown-it
npm install openai tiktoken

# Instalar dependências de desenvolvimento
npm install -D typescript @types/node @types/express
npm install -D @types/cors @types/bcryptjs
npm install -D @vercel/node
```

### 2.2 Configuração TypeScript

Criar `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### 2.3 Inicialização do Frontend

```bash
# Criar projeto Vite com React + TypeScript
npm create vite@latest frontend -- --template react-ts

cd frontend

# Instalar dependências
npm install react-router-dom axios
npm install lucide-react
npm install react-dropzone

# TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2.4 Variáveis de Ambiente

Criar `.env.local`:

```env
SUPABASE_URL=https://oaajzlwfbuxeottcydgi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=meu-secret-super-seguro-jwt-2024
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## 3. Estrutura do Banco de Dados

### 3.1 Criação da Conta Supabase

1. Acessar https://supabase.com
2. Criar novo projeto "ChatIARAG"
3. Anotar URL e Service Role Key

### 3.2 Schema do Banco

Criar arquivo `supabase-schema-updated.sql` com:

**Tabelas Principais:**

```sql
-- 1. Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  message_count INTEGER DEFAULT 0,
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  rating VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Documentos
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  filetype VARCHAR(100) NOT NULL,
  filesize INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Embeddings (Vetores)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Configurações
CREATE TABLE configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  openrouter_api_key VARCHAR(255),
  model VARCHAR(100) DEFAULT 'openai/gpt-4-turbo',
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Triggers e Funções:**

```sql
-- Atualizar contador de mensagens
CREATE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET message_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = NEW.conversation_id),
      last_message = NEW.content,
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_trigger 
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- Busca semântica vetorial
CREATE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  filename VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.document_id,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    d.filename
  FROM embeddings e
  JOIN documents d ON e.document_id = d.id
  WHERE 
    1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR d.user_id = filter_user_id)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3.3 Execução do Schema

1. Acessar Supabase Dashboard → SQL Editor
2. Colar conteúdo de `supabase-schema-updated.sql`
3. Executar
4. Verificar tabelas criadas

---

## 4. Backend Development

### 4.1 Estrutura de Arquivos

```
lib/
├── supabase.ts      # Cliente Supabase
├── openrouter.ts    # Cliente OpenRouter
├── rag.ts           # Sistema RAG
└── evolution.js     # WhatsApp (opcional)

server.js            # Express Server
```

### 4.2 Cliente Supabase (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})
```

### 4.3 Cliente OpenRouter (`lib/openrouter.ts`)

```typescript
import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://chatiarag.vercel.app',
    'X-Title': 'ChatIA RAG'
  }
})
```

### 4.4 Sistema RAG (`lib/rag.ts`)

Implementação das funções principais:

1. **Chunking de Texto**
```typescript
function chunkText(text: string, maxTokens = 500): string[] {
  // Dividir texto em chunks menores
}
```

2. **Geração de Embeddings**
```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openrouter.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text
  })
  return response.data[0].embedding
}
```

3. **Busca Vetorial**
```typescript
async function searchRelevantChunks(
  query: string,
  userId: string,
  documentIds?: string[]
): Promise<Chunk[]> {
  const queryEmbedding = await generateEmbedding(query)
  const { data } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
    filter_user_id: userId
  })
  return data
}
```

### 4.5 Express Server (`server.js`)

Endpoints implementados:

**Autenticação:**
- `POST /api/auth/register` - Criar usuário (bcrypt hash)
- `POST /api/auth/login` - Login (JWT)
- `GET /api/auth/me` - Usuário atual

**Conversas:**
- `GET /api/conversations` - Listar
- `POST /api/conversations` - Criar
- `PATCH /api/conversations/:id` - Atualizar status
- `DELETE /api/conversations/:id` - Deletar
- `GET /api/conversations/:id/messages` - Mensagens

**Chat:**
- `POST /api/chat` - Enviar mensagem e receber resposta
  1. Buscar chunks relevantes (RAG)
  2. Criar contexto
  3. Chamar LLM
  4. Salvar mensagens
  5. Retornar resposta + fontes

**Documentos:**
- `POST /api/documents/upload` - Upload + Parse + Embeddings
- `GET /api/documents` - Listar
- `DELETE /api/documents/:id` - Deletar

**Métricas:**
- `GET /api/metrics` - Dashboard stats

---

## 5. Frontend Development

### 5.1 Estrutura de Pastas

```
src/
├── components/
│   ├── Layout.tsx
│   ├── MessageRating.tsx
│   └── DocumentSelector.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   └── api.ts
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Chat.tsx
│   ├── Documents.tsx
│   ├── Config.tsx
│   └── Conversations.tsx
├── App.tsx
└── main.tsx
```

### 5.2 Sistema de Autenticação

**AuthContext (`contexts/AuthContext.tsx`):**

```typescript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### 5.3 API Client com Interceptors (`lib/api.ts`)

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// Interceptor de request - adiciona token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de response - redireciona em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### 5.4 Páginas Principais

**1. Login/Register:**
- Formulários de autenticação
- Validação de campos
- Feedback visual de erros

**2. Dashboard:**
- Cards de métricas (conversas, mensagens, documentos)
- Gráficos de uso por dia
- Top modelos utilizados
- Documentos mais consultados

**3. Chat:**
- Sidebar com lista de conversas
- Área principal de mensagens
- Seletor de documentos
- Input de mensagem
- Rating de respostas

**4. Documents:**
- Drag & drop upload
- Lista de documentos
- Ações (deletar)
- Indicadores de tamanho/data

**5. Config:**
- Input para API Key OpenRouter
- Seletor de modelo de IA
- Textarea para system prompt

---

## 6. Sistema RAG

### 6.1 Fluxo de Upload de Documentos

```
1. Upload do arquivo (Multer)
   ↓
2. Parse do conteúdo
   - PDF → pdf-parse
   - TXT → fs.readFile
   - MD → markdown-it
   ↓
3. Chunking do texto
   - Dividir em chunks de ~500 tokens
   ↓
4. Gerar embeddings
   - Para cada chunk → OpenAI embeddings
   ↓
5. Salvar no Supabase
   - Documento → documents
   - Embeddings → embeddings (VECTOR)
```

### 6.2 Fluxo de Chat com RAG

```
1. Receber mensagem do usuário
   ↓
2. Gerar embedding da query
   ↓
3. Busca vetorial (match_embeddings)
   - Retorna top 5 chunks mais relevantes
   ↓
4. Construir contexto
   - System prompt
   - Chunks relevantes
   - Histórico de conversa
   ↓
5. Chamar LLM (OpenRouter)
   ↓
6. Salvar mensagens
   - User message
   - Assistant message
   ↓
7. Retornar resposta + fontes
```

### 6.3 Otimizações Implementadas

- ✅ Caching de embeddings (evitar regerar)
- ✅ Chunking inteligente (respeita sentenças)
- ✅ Threshold de similaridade (0.7)
- ✅ Limitação de tokens (máx 8000)
- ✅ Metadata tracking (fontes)

---

## 7. Sistema de Autenticação

### 7.1 Registro de Usuário

```typescript
// 1. Validar dados
// 2. Hash da senha (bcrypt)
const salt = await bcrypt.genSalt(10)
const hash = await bcrypt.hash(password, salt)

// 3. Inserir no banco
const { data } = await supabase
  .from('users')
  .insert({ email, password_hash: hash, name })
  .select()
  .single()

// 4. Gerar JWT
const token = jwt.sign({ userId: data.id }, JWT_SECRET)

// 5. Retornar token + user
```

### 7.2 Login

```typescript
// 1. Buscar usuário por email
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single()

// 2. Verificar senha
const valid = await bcrypt.compare(password, user.password_hash)

// 3. Gerar JWT
const token = jwt.sign({ userId: user.id }, JWT_SECRET)

// 4. Retornar
```

### 7.3 Middleware de Autenticação

```typescript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}
```

---

## 8. UI/UX e Responsividade

### 8.1 Design System

**Cores:**
- Primary: `#3b82f6` (blue-500)
- Gradientes: `from-primary to-primary/90`
- Status: verde (success), vermelho (error), amarelo (warning)

**Tipografia:**
- Font: System default (sans-serif)
- Tamanhos responsivos: `text-sm lg:text-base`

**Espaçamento:**
- Mobile: `p-3`, `gap-2`
- Desktop: `p-6`, `gap-4`

### 8.2 Componentes Responsivos

**Chat:**
- Sidebar: Modal overlay no mobile, fixa no desktop
- Mensagens: 85% largura mobile, 80% desktop
- Input: Stack vertical mobile, inline desktop

**Dashboard:**
- Grid: 2 colunas mobile → 4 colunas desktop
- Cards: Hover effects e scale animations

**Layout:**
- Menu: Hamburger mobile, horizontal desktop
- Header: Sticky com sombra

### 8.3 Animações CSS

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

**Classes utilitárias:**
- `active:scale-95` - Feedback tátil
- `hover:shadow-md` - Depth
- `transition-all` - Smoothness

### 8.4 Acessibilidade

- ✅ `aria-label` em botões de ícone
- ✅ Focus rings visíveis
- ✅ Contraste WCAG AA
- ✅ Touch targets 44px+

---

## 9. Testes e Validação

### 9.1 Testes Manuais Realizados

**Autenticação:**
- ✅ Registro de novo usuário
- ✅ Login com credenciais corretas
- ✅ Login com credenciais incorretas
- ✅ Proteção de rotas privadas
- ✅ Logout e limpeza de token

**Upload de Documentos:**
- ✅ Upload PDF (múltiplas páginas)
- ✅ Upload TXT
- ✅ Upload Markdown
- ✅ Validação de tipo de arquivo
- ✅ Validação de tamanho (max 10MB)
- ✅ Geração de embeddings

**Chat:**
- ✅ Envio de mensagem sem documentos
- ✅ Envio com documentos anexados
- ✅ Criação automática de conversa
- ✅ Continuação de conversa existente
- ✅ Histórico de mensagens
- ✅ Rating de respostas

**Conversas:**
- ✅ Listar conversas
- ✅ Criar nova conversa
- ✅ Arquivar conversa
- ✅ Deletar conversa
- ✅ Visualizar mensagens antigas

**RAG:**
- ✅ Busca semântica funcional
- ✅ Contexto relevante retornado
- ✅ Fontes exibidas corretamente
- ✅ Respostas baseadas nos documentos

### 9.2 Correções Implementadas

**Problema 1: 401 Unauthorized**
- Causa: Token não enviado automaticamente
- Solução: Interceptors no axios

**Problema 2: CORS**
- Causa: Frontend e backend em portas diferentes
- Solução: Configuração CORS no Express

**Problema 3: Busca Vetorial Falhando**
- Causa: Sobrecarga de função SQL
- Solução: Remover função duplicada

---



## 📊 Métricas do Projeto

**Tempo de Desenvolvimento:** ~2 semanas

**Linhas de Código:**
- Backend: ~1.200 linhas
- Frontend: ~2.500 linhas
- SQL: ~350 linhas

**Arquivos Criados:**
- Backend: 15 arquivos
- Frontend: 30 arquivos

**Commits Realizados:** 50+

**Dependências:**
- Backend: 15 packages
- Frontend: 12 packages

---

## 🎓 Aprendizados

### Técnicos
1. **RAG Implementation:** Busca vetorial com pgvector
2. **LLM Integration:** OpenRouter como gateway
3. **JWT Auth:** Interceptors automáticos
4. **TypeScript:** Tipagem forte em ambos lados
5. **React Patterns:** Context API, Custom Hooks

### Desafios Superados
1. ✅ Configuração correta de embeddings vetoriais
2. ✅ Chunking eficiente de documentos grandes
3. ✅ Autenticação centralizada com interceptors
4. ✅ UI responsiva com TailwindCSS
5. ✅ Deploy full-stack no Vercel

### Melhorias Futuras
- [ ] Testes automatizados (Jest/Vitest)
- [ ] Cache de respostas (Redis)
- [ ] Streaming de respostas LLM
- [ ] Dark mode
- [ ] PWA (offline support)
- [ ] Integração WhatsApp completa
- [ ] Multi-idioma (i18n)

---

## 📚 Recursos Consultados

- [Supabase Docs](https://supabase.com/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)
- [pgvector Guide](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

---