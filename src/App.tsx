import { useCallback, useEffect, useRef, useState } from 'react'
import { chatWithAssistant, type ChatRequest } from './services/studentAssistApi'
import type { ChatMessage, Conversation } from './types/chat'
import { ChatWindow } from './components/ChatWindow'
import { ConversationSidebar } from './components/ConversationSidebar'
import './App.css'

function makeConversation(subject = ''): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    subject,
    documentId: '',
    messages: [],
    updatedAt: Date.now(),
  }
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sidebarError, setSidebarError] = useState<string | null>(null)
  const activeRequest = useRef<AbortController | null>(null)

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ?? null

  useEffect(
    () => () => {
      activeRequest.current?.abort()
    },
    [],
  )

  const updateConversation = useCallback(
    (id: string, update: (conversation: Conversation) => Conversation) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id ? update(conversation) : conversation,
        ),
      )
    },
    [],
  )

  const startConversation = () => {
    const conversation = makeConversation()
    activeRequest.current?.abort()
    activeRequest.current = null
    setLoading(false)
    setConversations((current) => [conversation, ...current])
    setSelectedId(conversation.id)
  }

  const handleSend = async (
    conversationKey: string,
    question: string,
    subject: string,
    documentId: string,
  ) => {
    const conversation = conversations.find((item) => item.id === conversationKey)
    if (!conversation || loading || !question.trim()) return

    activeRequest.current?.abort()
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
    }
    const pendingId = crypto.randomUUID()
    updateConversation(conversation.id, (current) => ({
      ...current,
      title:
        current.messages.length === 0
          ? question.trim().slice(0, 44)
          : current.title,
      messages: [
        ...current.messages,
        userMessage,
        { id: pendingId, role: 'assistant', content: '', status: 'loading' },
      ],
      updatedAt: Date.now(),
    }))

    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)
    setSidebarError(null)
    try {
      const request: ChatRequest = { question: question.trim() }
      if (conversation.conversationId) request.conversationId = conversation.conversationId
      if (documentId) request.documentId = documentId
      if (subject) request.subject = subject
      const result = await chatWithAssistant(request, controller.signal)
      if (controller.signal.aborted || activeRequest.current !== controller) {
        updateConversation(conversation.id, (current) => ({
          ...current,
          messages: current.messages.filter((message) => message.id !== pendingId),
        }))
        return
      }
      updateConversation(conversation.id, (current) => ({
        ...current,
        conversationId: result.conversationId ?? current.conversationId,
        messages: current.messages.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                content: result.answer,
                citations: result.citations,
                status: 'complete',
              }
            : message,
        ),
        updatedAt: Date.now(),
      }))
    } catch (error) {
      if (controller.signal.aborted || activeRequest.current !== controller) {
        updateConversation(conversation.id, (current) => ({
          ...current,
          messages: current.messages.filter((message) => message.id !== pendingId),
        }))
        return
      }
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      updateConversation(conversation.id, (current) => ({
        ...current,
        messages: current.messages.map((item) =>
          item.id === pendingId
            ? { ...item, content: message, status: 'error', retryQuestion: question.trim() }
            : item,
        ),
        updatedAt: Date.now(),
      }))
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setLoading(false)
      }
    }
  }

  const handleRetry = (question: string) => {
    if (!selectedConversation || loading) return
    updateConversation(selectedConversation.id, (current) => ({
      ...current,
      messages: current.messages.filter(
        (message) => !(message.role === 'assistant' && message.status === 'error'),
      ),
    }))
    void handleSend(
      selectedConversation.id,
      question,
      selectedConversation.subject ?? '',
      selectedConversation.documentId,
    )
  }

  const handleConversationUpdate = (
    field: 'subject' | 'documentId',
    value: string,
  ) => {
    if (!selectedConversation) return
    updateConversation(selectedConversation.id, (current) => ({
      ...current,
      [field]: value,
      ...(field === 'documentId' && value !== current.documentId
        ? { conversationId: undefined }
        : {}),
    }))
  }

  return (
    <div className="app-shell">
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedId}
        loading={false}
        error={sidebarError}
        onNewConversation={startConversation}
        onSelect={(id) => {
          activeRequest.current?.abort()
          activeRequest.current = null
          setLoading(false)
          setSelectedId(id)
        }}
      />
      <main className="main-panel">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div className="brand-copy">
            <strong>StudentAssist</strong>
            <span>Riri’s Assistant</span>
          </div>
          <span className="connection-pill"><span /> AI tutor</span>
        </header>
        {selectedConversation ? (
          <ChatWindow
            key={selectedConversation.id}
            conversation={selectedConversation}
            busy={loading}
            onSend={(question, subject, documentId) =>
              void handleSend(selectedConversation.id, question, subject, documentId)
            }
            onRetry={handleRetry}
            onSubjectChange={(value) => handleConversationUpdate('subject', value)}
            onDocumentChange={(value) => handleConversationUpdate('documentId', value)}
          />
        ) : (
          <div className="welcome-layout">
            <section className="welcome-card">
              <div className="welcome-icon" aria-hidden="true">✦</div>
              <span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span>
              <h1>Make learning<br /><em>click.</em></h1>
              <p>Ask a question about your uploaded documents.</p>
              <button className="primary-button welcome-button" onClick={startConversation}>
                Start a conversation <span aria-hidden="true">→</span>
              </button>
              <div className="subject-examples">
                <span>Try a subject</span>
                {['math', 'physics', 'chemistry', 'biology'].map((subject) => (
                  <button
                    key={subject}
                    onClick={() => {
                      const conversation = makeConversation(subject)
                      setConversations((current) => [conversation, ...current])
                      setSelectedId(conversation.id)
                    }}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
