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

  it('sends automatic questions without subject or document values', async () => {
    mockChat.mockResolvedValue({ answer: 'Here is an explanation.', citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    expect(screen.getByLabelText('Subject')).toHaveValue('')
    expect(screen.getByLabelText('Document')).toHaveValue('all')
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain facts about sets.' },
    })
    fireEvent.keyDown(screen.getByLabelText('Your question'), { key: 'Enter' })

    await waitFor(() => expect(mockChat).toHaveBeenCalledTimes(1))
    expect(mockChat).toHaveBeenCalledWith(
      { question: 'Explain facts about sets.' },
      expect.any(AbortSignal),
    )
    expect(screen.getByText('Here is an explanation.')).toBeInTheDocument()
  })

  it('sends an explicitly selected subject and reuses the conversation ID for follow-ups', async () => {
    const conversationId = 'cd150aed-f5c1-4ff8-8b04-f269f68d639c'
    mockChat
      .mockResolvedValueOnce({ answer: 'First answer.', conversationId, citations: [] })
      .mockResolvedValueOnce({ answer: 'Second answer.', conversationId, citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'math' } })
    const input = screen.getByLabelText('Your question')
    fireEvent.change(input, { target: { value: 'First question?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('First answer.')

    fireEvent.change(input, { target: { value: 'Follow-up?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Second answer.')

    expect(mockChat).toHaveBeenNthCalledWith(
      2,
      { question: 'Follow-up?', conversationId, subject: 'math' },
      expect.any(AbortSignal),
    )
    expect(mockChat).toHaveBeenNthCalledWith(
      1,
      { question: 'First question?', subject: 'math' },
      expect.any(AbortSignal),
    )
  })

  it('does not reuse a selected history subject or document after switching to Automatic and All relevant documents', async () => {
    const historyDocumentId = '97c990ca-070d-465f-aa19-a2bf626630d4'
    const conversationId = 'cd150aed-f5c1-4ff8-8b04-f269f68d639c'
    mockChat
      .mockResolvedValueOnce({
        answer: 'History answer.',
        conversationId,
        citations: [{ fileName: 'history.pdf', pageNumber: 12, text: 'History passage.' }],
      })
      .mockResolvedValueOnce({ answer: 'Sets are collections of objects.', citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'history' } })
    fireEvent.change(screen.getByLabelText('Document'), { target: { value: 'specific' } })
    fireEvent.change(screen.getByLabelText('Document ID'), {
      target: { value: historyDocumentId },
    })
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain the French Revolution.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('History answer.')

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Document'), { target: { value: 'all' } })
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Explain facts about sets.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Sets are collections of objects.')

    expect(mockChat).toHaveBeenNthCalledWith(
      1,
      { question: 'Explain the French Revolution.', documentId: historyDocumentId, subject: 'history' },
      expect.any(AbortSignal),
    )
    expect(mockChat).toHaveBeenNthCalledWith(
      2,
      { question: 'Explain facts about sets.' },
      expect.any(AbortSignal),
    )
    const secondAnswer = screen.getByText('Sets are collections of objects.')
    expect(secondAnswer.closest('.message-column')).not.toHaveTextContent('history.pdf')
    expect(secondAnswer.closest('.message-column')).not.toHaveTextContent('History passage.')
    expect(screen.queryByText('history.pdf')).not.toBeInTheDocument()
  })

  it('clears the conversation ID when starting a new conversation', async () => {
    const conversationId = 'cd150aed-f5c1-4ff8-8b04-f269f68d639c'
    mockChat
      .mockResolvedValueOnce({ answer: 'First conversation answer.', conversationId, citations: [] })
      .mockResolvedValueOnce({ answer: 'New conversation answer.', citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'First question?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('First conversation answer.')

    fireEvent.click(screen.getByRole('button', { name: 'New conversation' }))
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'New question?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('New conversation answer.')

    expect(mockChat).toHaveBeenNthCalledWith(
      2,
      { question: 'New question?' },
      expect.any(AbortSignal),
    )
  })

  it('clears the conversation ID when an explicitly selected document changes', async () => {
    const conversationId = 'cd150aed-f5c1-4ff8-8b04-f269f68d639c'
    mockChat
      .mockResolvedValueOnce({ answer: 'First answer.', conversationId, citations: [] })
      .mockResolvedValueOnce({ answer: 'Other document answer.', citations: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start a conversation/i }))
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'First?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('First answer.')
    fireEvent.change(screen.getByLabelText('Document'), { target: { value: 'specific' } })
    fireEvent.change(screen.getByLabelText('Document ID'), {
      target: { value: '97c990ca-070d-465f-aa19-a2bf626630d4' },
    })
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Next?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Other document answer.')

    expect(mockChat).toHaveBeenNthCalledWith(
      2,
      {
        question: 'Next?',
        documentId: '97c990ca-070d-465f-aa19-a2bf626630d4',
      },
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
