import { useState } from 'react'
import { Download, FileJson, FileText } from 'lucide-react'
import jsPDF from 'jspdf'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  sources?: any[]
}

type ExportButtonProps = {
  messages: Message[]
  conversationTitle?: string
}

export default function ExportButton({ messages, conversationTitle = 'Conversa' }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  const exportToJSON = () => {
    setExporting(true)
    try {
      const data = {
        title: conversationTitle,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          sources: msg.sources || [],
        })),
      }

      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${conversationTitle.replace(/\s/g, '_')}_${new Date().getTime()}.json`
      link.click()
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar JSON:', error)
      alert('Erro ao exportar para JSON')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportToCSV = () => {
    setExporting(true)
    try {
      const headers = ['Timestamp', 'Role', 'Content', 'Sources']
      const rows = messages.map((msg) => [
        new Date(msg.created_at).toLocaleString('pt-BR'),
        msg.role === 'user' ? 'Usuário' : 'Assistente',
        `"${msg.content.replace(/"/g, '""')}"`,
        msg.sources ? msg.sources.map((s) => s.filename).join('; ') : '',
      ])

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${conversationTitle.replace(/\s/g, '_')}_${new Date().getTime()}.csv`
      link.click()
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      alert('Erro ao exportar para CSV')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportToPDF = () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      let y = 20

      // Title
      doc.setFontSize(16)
      doc.text(conversationTitle, 20, y)
      y += 10

      // Export info
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Exportado em: ${new Date().toLocaleString('pt-BR')}`, 20, y)
      y += 5
      doc.text(`Total de mensagens: ${messages.length}`, 20, y)
      y += 15

      // Messages
      doc.setTextColor(0)
      messages.forEach((msg, index) => {
        // Check if we need a new page
        if (y > 270) {
          doc.addPage()
          y = 20
        }

        // Message header
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        const role = msg.role === 'user' ? 'Usuário' : 'Assistente IA'
        const timestamp = new Date(msg.created_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        doc.text(`${role} - ${timestamp}`, 20, y)
        y += 7

        // Message content
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const lines = doc.splitTextToSize(msg.content, 170)
        doc.text(lines, 20, y)
        y += lines.length * 5 + 3

        // Sources
        if (msg.sources && msg.sources.length > 0) {
          doc.setFontSize(9)
          doc.setTextColor(100)
          doc.text('Fontes: ' + msg.sources.map((s: any) => s.filename).join(', '), 20, y)
          y += 5
          doc.setTextColor(0)
        }

        y += 5 // Space between messages
      })

      doc.save(`${conversationTitle.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar para PDF')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  if (messages.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Exportar conversa"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">Exportar</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-12 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-48">
            <button
              onClick={exportToJSON}
              disabled={exporting}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <FileJson className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">JSON</p>
                <p className="text-xs text-gray-500">Formato estruturado</p>
              </div>
            </button>
            
            <button
              onClick={exportToCSV}
              disabled={exporting}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 border-t border-gray-100"
            >
              <FileText className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">CSV</p>
                <p className="text-xs text-gray-500">Excel / Planilhas</p>
              </div>
            </button>

            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 border-t border-gray-100"
            >
              <FileText className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">PDF</p>
                <p className="text-xs text-gray-500">Documento formatado</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
