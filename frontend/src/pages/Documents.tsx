import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { documentsAPI } from '../lib/api'
import { Upload, File, Trash2, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

type Document = {
  id: string
  filename: string
  filetype: string
  filesize: number
  uploaded_at: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const { data } = await documentsAPI.list()
      setDocuments(data || [])
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setUploading(true)
    setMessage(null)

    try {
      for (const file of acceptedFiles) {
        await documentsAPI.upload(file)
      }
      setMessage({ type: 'success', text: `${acceptedFiles.length} arquivo(s) enviado(s) com sucesso!` })
      loadDocuments()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao fazer upload' })
    } finally {
      setUploading(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente deletar este documento?')) return

    try {
      await documentsAPI.delete(id)
      setMessage({ type: 'success', text: 'Documento deletado com sucesso!' })
      loadDocuments()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao deletar documento' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    disabled: uploading,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 px-2 sm:px-0">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Documentos RAG 📚</h2>
        <p className="text-sm text-gray-600 mt-1">
          Faça upload de documentos para serem usados como contexto pelo assistente
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 lg:p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary bg-primary/10 scale-105'
            : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className={`transition-transform ${isDragActive ? 'scale-110' : ''}`}>
          <Upload className="w-10 h-10 lg:w-12 lg:h-12 mx-auto text-gray-400 mb-4" />
        </div>
        {isDragActive ? (
          <p className="text-base lg:text-lg text-primary font-medium">Solte os arquivos aqui! 🎯</p>
        ) : (
          <>
            <p className="text-base lg:text-lg text-gray-700 mb-2 font-medium">
              {uploading ? '⏳ Enviando...' : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="text-xs lg:text-sm text-gray-500">PDF, TXT ou Markdown (max 10MB)</p>
          </>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center space-x-2 p-3 lg:p-4 rounded-xl animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">
            Documentos Carregados ({documents.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
            <p>Carregando...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 lg:p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-medium">Nenhum documento enviado ainda</p>
            <p className="text-sm mt-1">Comece fazendo upload de seus arquivos!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="px-4 lg:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <File className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-xs lg:text-sm text-gray-500">
                      {formatFileSize(doc.filesize)} •{' '}
                      {new Date(doc.uploaded_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-all active:scale-95 ml-2"
                  title="Deletar documento"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
