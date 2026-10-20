import type { Conversation } from '../types/chat'

interface ConversationSidebarProps {
  conversations: Conversation[]
  selectedId: string | null
  loading: boolean
  error: string | null
  onNewConversation: () => void
  onSelect: (id: string) => void
}

export function ConversationSidebar({
  conversations,
  selectedId,
  loading,
  error,
  onNewConversation,
  onSelect,
}: ConversationSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">S</div>
        <div><strong>StudentAssist</strong><span>Riri’s Assistant</span></div>
      </div>
      <button className="new-chat-button" onClick={onNewConversation}>
        <span aria-hidden="true">＋</span> New conversation
      </button>
      <div className="history-heading">RECENT</div>
      {loading && <p className="sidebar-state">Loading conversations…</p>}
      {error && <p className="sidebar-error" role="alert">{error}</p>}
      {!loading && !error && conversations.length === 0 && (
        <p className="sidebar-state">Your conversations will appear here.</p>
      )}
      <nav className="conversation-list" aria-label="Conversation history">
        {conversations.map((conversation) => (
          <button
            className={`conversation-item ${conversation.id === selectedId ? 'selected' : ''}`}
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            aria-current={conversation.id === selectedId ? 'page' : undefined}
          >
            <span className="conversation-icon" aria-hidden="true">◌</span>
            <span className="conversation-title">{conversation.title}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="privacy-dot" /> Conversations stay in this browser session
      </div>
    </aside>
  )
}
