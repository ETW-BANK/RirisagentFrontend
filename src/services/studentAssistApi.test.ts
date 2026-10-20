import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatWithAssistant, uploadDocument } from './studentAssistApi'

describe('StudentAssist API contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts only explicitly provided fields documented for chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('A plain-text answer.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await chatWithAssistant(
      {
        question: 'Explain gravity.',
        conversationId: 'cd150aed-f5c1-4ff8-8b04-f269f68d639c',
        documentId: '97c990ca-070d-465f-aa19-a2bf626630d4',
      },
      new AbortController().signal,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/Agent/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          question: 'Explain gravity.',
          conversationId: 'cd150aed-f5c1-4ff8-8b04-f269f68d639c',
          documentId: '97c990ca-070d-465f-aa19-a2bf626630d4',
        }),
      }),
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).not.toHaveProperty('subject')
  })

  it('omits subject, documentId, and conversationId for an automatic new question', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"answer":"Sets are collections.","citations":[]}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await chatWithAssistant(
      { question: 'Explain facts about sets.' },
      new AbortController().signal,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/Agent/chat',
      expect.objectContaining({
        method: 'POST',
        body: '{"question":"Explain facts about sets."}',
      }),
    )
  })

  it('includes an explicit subject in the Swagger chat request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"answer":"Sets are collections.","citations":[]}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await chatWithAssistant(
      { question: 'Explain facts about sets.', subject: 'math' },
      new AbortController().signal,
    )

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      question: 'Explain facts about sets.',
      subject: 'math',
    })
  })

  it('maps rate-limit responses to a helpful message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 429 })),
    )

    await expect(
      chatWithAssistant({ question: 'A question' }, new AbortController().signal),
    ).rejects.toThrow(/too many requests/i)
  })

  it.each([
    [400, /request could not be understood/i],
    [401, /not authorized/i],
    [403, /forbidden/i],
    [404, /could not be found/i],
    [500, /temporarily unavailable/i],
  ])('maps HTTP %i to a user-friendly error', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })))

    await expect(
      chatWithAssistant({ question: 'A question' }, new AbortController().signal),
    ).rejects.toThrow(message)
  })

  it('parses the answer, conversation ID, and citations returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            conversationId: 'cd150aed-f5c1-4ff8-8b04-f269f68d639c',
            answer: 'An answer',
            citations: [{
              documentId: '97c990ca-070d-465f-aa19-a2bf626630d4',
              fileName: 'biology-notes.pdf',
              pageNumber: 12,
              text: 'A source passage.',
            }],
          }),
          {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(
      chatWithAssistant({ question: 'A question' }, new AbortController().signal),
    ).resolves.toEqual({
      answer: 'An answer',
      conversationId: 'cd150aed-f5c1-4ff8-8b04-f269f68d639c',
      citations: [{
        documentId: '97c990ca-070d-465f-aa19-a2bf626630d4',
        fileName: 'biology-notes.pdf',
        pageNumber: 12,
        text: 'A source passage.',
      }],
    })
  })

  it('reports invalid JSON response shapes without rendering raw response as an answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"message":"not an answer"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      chatWithAssistant({ question: 'A question' }, new AbortController().signal),
    ).rejects.toThrow(/unexpected response/i)
  })

  it('shows a friendly network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(
      chatWithAssistant({ question: 'A question' }, new AbortController().signal),
    ).rejects.toThrow(/check your internet connection/i)
  })

  it('uploads a PDF to the documented file-only multipart endpoint', async () => {
    class MockXhr extends EventTarget {
      upload = new EventTarget()
      status = 200
      responseText = ''
      responseType = ''
      url = ''
      body: FormData | null = null

      open(method: string, url: string) {
        expect(method).toBe('POST')
        this.url = url
      }

      send(body: FormData) {
        this.body = body
      }

      abort() {
        this.dispatchEvent(new Event('abort'))
      }
    }
    const requests: MockXhr[] = []
    vi.stubGlobal(
      'XMLHttpRequest',
      class extends MockXhr {
        constructor() {
          super()
          requests.push(this)
        }
      },
    )
    const file = new File(['notes'], 'notes.pdf', { type: 'application/pdf' })
    const promise = uploadDocument(file, new AbortController().signal, vi.fn())
    const request = requests[0]
    request.dispatchEvent(new Event('load'))

    await expect(promise).resolves.toContain('uploaded successfully')
    expect(request.url).toBe('/api/Agent/upload')
    expect(request.body?.get('file')).toBe(file)
    expect([...request.body!.keys()]).toEqual(['file'])
  })
})
