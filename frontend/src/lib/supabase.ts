import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Config = {
  id: string
  openrouter_api_key: string
  model: string
  system_prompt: string
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  filename: string
  filetype: string
  filesize: number
  content: string
  uploaded_at: string
}

export type Message = {
  id: string
  sender_id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any
  created_at: string
}
