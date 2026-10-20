import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { chatWithAssistant } from './services/studentAssistApi'

vi.mock('./services/studentAssistApi', () => ({
  chatWithAssistant: vi.fn(),
  uploadDocument: vi.fn(),
}))

const mockChat = vi.mocked(chatWithAssistant)

describe('StudentAssist chat', () => {
  beforeEach(() => {
    mockChat.mockReset()
  })

  it('sends a question and selected subject context without adding unsupported request fields', async () => {
    mockChat.mockResolvedValue({ answer: 'Here is an explanation.', citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'chemistry' } })
    expect(screen.getByRole('combobox', { name: 'Subject' })).toHaveValue('chemistry')
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'What is an atom?' },
    })
    fireEvent.keyDown(screen.getByLabelText('Your question'), { key: 'Enter' })

    await waitFor(() => expect(mockChat).toHaveBeenCalledTimes(1))
    expect(mockChat).toHaveBeenCalledWith(
      { question: 'What is an atom?', conversationId: undefined, documentId: undefined },
      expect.any(AbortSignal),
    )
    expect(screen.getByText('Here is an explanation.')).toBeInTheDocument()
  })

  it('reuses a returned conversation ID for follow-up questions', async () => {
    const conversationId = 'cd150aed-f5c1-4ff8-8b04-f269f68d639c'
    mockChat
      .mockResolvedValueOnce({ answer: 'First answer.', conversationId, citations: [] })
      .mockResolvedValueOnce({ answer: 'Second answer.', conversationId, citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    const input = screen.getByLabelText('Your question')
    fireEvent.change(input, { target: { value: 'First question?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('First answer.')

    fireEvent.change(input, { target: { value: 'Follow-up?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Second answer.')

    expect(mockChat).toHaveBeenNthCalledWith(
      2,
      { question: 'Follow-up?', conversationId, documentId: undefined },
      expect.any(AbortSignal),
    )
  })

  it('shows Riri’s personalized welcome and portrait in every new conversation', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))

    expect(screen.getByRole('heading', { name: 'Hello Riri, how can I help you today?' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Riri' })).toBeInTheDocument()
    expect(screen.getAllByText('Riri’s Assistant')).toHaveLength(2)
    expect(screen.queryByRole('region', { name: 'Add your notes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upload document' })).not.toBeInTheDocument()
  })

  it('shows retry after an API error', async () => {
    mockChat.mockRejectedValue(new Error('StudentAssist is temporarily unavailable.'))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Can you explain this?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('StudentAssist is temporarily unavailable.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
