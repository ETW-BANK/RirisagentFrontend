import { useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { CitationList } from './CitationList'

interface MessageBubbleProps {
  message: ChatMessage
  onRetry?: (question: string) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const [copyStatus, setCopyStatus] = useState('')
  const isUser = message.role === 'user'
  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Could not copy answer')
    }
  }
  return (
    <article className={`message-row ${isUser ? 'message-user' : 'message-assistant'}`}>
      {!isUser && <div className="assistant-avatar" aria-hidden="true">S</div>}
      <div className="message-column">
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'} ${message.status === 'error' ? 'error-bubble' : ''}`}>
          {message.status === 'loading' ? (
            <div className="typing-indicator" role="status" aria-label="StudentAssist is thinking">
              <span /><span /><span />
            </div>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        {!isUser && message.status === 'complete' && (
          <>
            <CitationList citations={message.citations ?? []} />
            <button
              className="copy-button"
              aria-label="Copy answer"
              onClick={() => void copyAnswer()}
            >
              {copyStatus || 'Copy answer'}
            </button>
            {copyStatus && <span className="copy-status" role="status">{copyStatus}</span>}
          </>
        )}
        {message.status === 'error' && message.retryQuestion && onRetry && (
          <button className="retry-button" onClick={() => onRetry(message.retryQuestion!)}>
            Try again
          </button>
        )}
      </div>
      {isUser && <div className="user-avatar" aria-hidden="true">Y</div>}
    </article>
  )
}
