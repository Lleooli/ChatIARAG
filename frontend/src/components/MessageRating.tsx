import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react'
import axios from 'axios'

type RatingType = 'thumbs' | 'stars'

type MessageRatingProps = {
  messageId: string
  initialRating?: number | 'up' | 'down' | null
  type?: RatingType
  onRate?: (rating: number | 'up' | 'down') => void
}

export default function MessageRating({
  messageId,
  initialRating = null,
  type = 'thumbs',
  onRate,
}: MessageRatingProps) {
  const [rating, setRating] = useState<number | 'up' | 'down' | null>(initialRating)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRate = async (newRating: number | 'up' | 'down') => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setRating(newRating)

    try {
      // TODO: Implementar endpoint de rating
      await axios.post(`/api/messages/${messageId}/rate`, { rating: newRating })
      onRate?.(newRating)
    } catch (error) {
      console.error('Erro ao avaliar mensagem:', error)
      setRating(initialRating)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (type === 'thumbs') {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleRate('up')}
          disabled={isSubmitting}
          className={`p-1.5 rounded-lg transition-all ${
            rating === 'up'
              ? 'bg-green-100 text-green-600'
              : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Resposta útil"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleRate('down')}
          disabled={isSubmitting}
          className={`p-1.5 rounded-lg transition-all ${
            rating === 'down'
              ? 'bg-red-100 text-red-600'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Resposta não útil"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Stars rating
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          disabled={isSubmitting}
          className={`p-1 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            typeof rating === 'number' && star <= rating
              ? 'text-yellow-500'
              : 'text-gray-300 hover:text-yellow-400'
          }`}
          title={`${star} estrela${star > 1 ? 's' : ''}`}
        >
          <Star className={`w-4 h-4 ${typeof rating === 'number' && star <= rating ? 'fill-current' : ''}`} />
        </button>
      ))}
    </div>
  )
}
