import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado - redirecionar para login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const configAPI = {
  get: () => api.get('/config'),
  save: (data: { openrouter_api_key: string; model: string; system_prompt: string }) =>
    api.post('/config', data),
}

export const documentsAPI = {
  list: () => api.get('/documents'),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    // Backend expects POST /documents with multipart body
    return api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
}

export const chatAPI = {
  send: (message: string, conversationId?: string, documentIds?: string[]) =>
    api.post('/chat', {
      message,
      conversationId,
      documentIds,
    }),
}

export default api
