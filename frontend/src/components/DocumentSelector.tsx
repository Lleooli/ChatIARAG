import { useState, useEffect } from 'react'
import { FileText, X, Paperclip } from 'lucide-react'
import { documentsAPI } from '../lib/api'

type Document = {
  id: string
  filename: string
  filetype: string
  filesize: number
}

type DocumentSelectorProps = {
  selectedDocuments: string[]
  onDocumentsChange: (ids: string[]) => void
}

export default function DocumentSelector({ selectedDocuments, onDocumentsChange }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

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

  const toggleDocument = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      onDocumentsChange(selectedDocuments.filter(id => id !== docId))
    } else {
      onDocumentsChange([...selectedDocuments, docId])
    }
  }

  const removeDocument = (docId: string) => {
    onDocumentsChange(selectedDocuments.filter(id => id !== docId))
  }

  const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id))

  return (
    <div className="relative">
      {/* Selected Documents Pills */}
      {selectedDocs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedDocs.map(doc => (
            <div
              key={doc.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs"
            >
              <FileText className="w-3 h-3" />
              <span className="max-w-[150px] truncate">{doc.filename}</span>
              <button
                onClick={() => removeDocument(doc.id)}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attach Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedDocuments.length > 0
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Paperclip className="w-4 h-4 inline mr-1" />
        Anexar ({selectedDocuments.length})
      </button>

      {/* Documents Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">
                Selecionar Documentos
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {selectedDocuments.length} de {documents.length} selecionados
              </p>
            </div>

            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Carregando...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento disponível</p>
                <p className="text-xs mt-1">
                  Vá para a página de Documentos para fazer upload
                </p>
              </div>
            ) : (
              <div className="p-2">
                {documents.map(doc => {
                  const isSelected = selectedDocuments.includes(doc.id)
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => toggleDocument(doc.id)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex-shrink-0 w-4 h-4 rounded border-2 ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <FileText className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isSelected ? 'text-primary' : 'text-gray-900'
                          }`}>
                            {doc.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.filetype.toUpperCase()} • {(doc.filesize / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
