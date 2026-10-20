export interface Citation {
  documentId?: string
  fileName?: string
  pageNumber?: number
  text?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  status?: 'loading' | 'complete' | 'error'
  retryQuestion?: string
}

export interface Conversation {
  id: string
  conversationId?: string
  title: string
  subject?: string
  documentId: string
  messages: ChatMessage[]
  updatedAt: number
}
