import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types/chat'
import { MessageBubble } from './MessageBubble'

describe('MessageBubble', () => {
  it('renders only the assistant answer and not its citations or extra controls', () => {
    const message: ChatMessage = {
      id: 'answer-1',
      role: 'assistant',
      content:
        'Force is a push or pull exerted on a body that changes the state of motion of that body. It can cause a stationary object to start moving, or it can accelerate an already moving object.',
      status: 'complete',
      citations: [
        {
          fileName: 'grade-9-physics-textbook.pdf',
          pageNumber: 72,
          text: 'A long source excerpt that should not appear beneath the answer.',
        },
      ],
    }

    const { container } = render(<MessageBubble message={message} />)

    expect(screen.getByText(message.content)).toBeInTheDocument()
    expect(screen.queryByText('Sources')).not.toBeInTheDocument()
    expect(screen.queryByText('grade-9-physics-textbook.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText(/long source excerpt/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy answer' })).not.toBeInTheDocument()
    expect(container.querySelector('.assistant-avatar')).not.toBeInTheDocument()
  })
})
