import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import ririImage from '../assets/image.png'
import type { Conversation } from '../types/chat'
import { DocumentSelector } from './DocumentSelector'
import { MessageBubble } from './MessageBubble'
import { SubjectSelector } from './SubjectSelector'

interface ChatWindowProps {
  conversation: Conversation
  busy: boolean
  onSend: (question: string, subject: string, documentId: string) => void
  onRetry: (question: string) => void
  onSubjectChange: (subject: string) => void
  onDocumentChange: (documentId: string) => void
}

export function ChatWindow({
  conversation,
  busy,
  onSend,
  onRetry,
  onSubjectChange,
  onDocumentChange,
}: ChatWindowProps) {
  const [question, setQuestion] = useState('')
  const messageEnd = useRef<HTMLDivElement>(null)
  const hasMessages = conversation.messages.length > 0

  useEffect(() => {
    messageEnd.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [conversation.messages])

  const send = (event?: FormEvent) => {
    event?.preventDefault()
    if (!question.trim() || busy) return
    onSend(question, conversation.subject ?? '', conversation.documentId)
    setQuestion('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="header-copy">
          <span className="eyebrow">
            {conversation.subject || 'AUTOMATIC SUBJECT'}
            {conversation.documentId && ` · ${conversation.documentId}`}
          </span>
          <h1>{conversation.documentId ? 'Document chat' : 'Ask StudentAssist'}</h1>
        </div>
        <div className="header-fields">
          <SubjectSelector value={conversation.subject ?? ''} onChange={onSubjectChange} />
          <DocumentSelector value={conversation.documentId} onChange={onDocumentChange} />
        </div>
      </header>
      {!hasMessages ? (
        <section className="empty-chat">
          <img className="riri-portrait" src={ririImage} alt="Riri" />
          <span className="eyebrow">STUDENTASSIST · RIRI’S ASSISTANT</span>
          <h2>Hello Riri, how can I help you today?</h2>
          <p>Ask a question about your uploaded documents.</p>
        </section>
      ) : (
        <section className="message-list" aria-label="Messages">
          {conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} onRetry={onRetry} />
          ))}
          <div ref={messageEnd} />
        </section>
      )}
      <footer className="composer-area">
        <form className="composer" onSubmit={send}>
          <textarea
            aria-label="Your question"
            placeholder="Ask a question about your documents…"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={busy}
          />
          <button className="send-button" type="submit" disabled={busy || !question.trim()}>
            {busy ? <span className="send-spinner" aria-label="Sending" /> : <span aria-hidden="true">↑</span>}
            <span className="send-label">Send</span>
          </button>
        </form>
        <p className="composer-note">StudentAssist can make mistakes. Check important information with your course materials.</p>
      </footer>
    </div>
  )
}
