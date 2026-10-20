import type { ChatMessage } from '../types/chat'

interface MessageBubbleProps {
  message: ChatMessage
  onRetry?: (question: string) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  return (
    <article className={`message-row ${isUser ? 'message-user' : 'message-assistant'}`}>
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
