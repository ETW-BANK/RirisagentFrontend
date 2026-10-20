import type { Citation } from '../types/chat'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://ririsagent.runasp.net'
).replace(/\/+$/, '')
const API_ROOT = import.meta.env.DEV ? '' : API_BASE_URL

export interface ChatRequest {
  question: string
  conversationId?: string
  documentId?: string
  subject?: string
}

export interface ChatResult {
  answer: string
  conversationId?: string
  citations: Citation[]
}

export type UploadProgress = (percentage: number) => void

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseChatResult(payload: unknown): ChatResult {
  if (!isRecord(payload) || typeof payload.answer !== 'string') {
    throw new Error(
      `StudentAssist returned an unexpected response. Expected an answer string. ` +
        `Response: ${JSON.stringify(payload)}`,
    )
  }

  const citations = Array.isArray(payload.citations)
    ? payload.citations.flatMap((item): Citation[] => {
        if (!isRecord(item)) return []
        return [{
          ...(typeof item.documentId === 'string' ? { documentId: item.documentId } : {}),
          ...(typeof item.fileName === 'string' ? { fileName: item.fileName } : {}),
          ...(typeof item.pageNumber === 'number' ? { pageNumber: item.pageNumber } : {}),
          ...(typeof item.text === 'string' ? { text: item.text } : {}),
        }]
      })
    : []

  return {
    answer: payload.answer,
    ...(typeof payload.conversationId === 'string'
      ? { conversationId: payload.conversationId }
      : {}),
    citations,
  }
}

function errorMessage(status: number, serverMessage?: string): string {
  const known: Record<number, string> = {
    400: 'That request could not be understood. Check your question and document ID.',
    401: 'You are not authorized to use StudentAssist. Please sign in and try again.',
    403: 'Access to StudentAssist is forbidden for this account.',
    404: 'The StudentAssist endpoint or selected document could not be found.',
    429: 'StudentAssist is receiving too many requests. Please wait a moment and retry.',
  }
  if (known[status]) return known[status]
  if (status >= 500) return 'StudentAssist is temporarily unavailable. Please try again shortly.'
  return serverMessage || `The request failed (HTTP ${status}). Please try again.`
}

async function readError(response: Response): Promise<string> {
  let serverMessage: string | undefined
  try {
    const body = await response.text()
    if (body) {
      try {
        const parsed: unknown = JSON.parse(body)
        if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
          const value = parsed.message
          if (typeof value === 'string') serverMessage = value
        }
      } catch {
        serverMessage = body
      }
    }
  } catch {
    // The status code still provides a useful error when the response body is unreadable.
  }
  return errorMessage(response.status, serverMessage)
}

export async function chatWithAssistant(
  request: ChatRequest,
  signal: AbortSignal,
): Promise<ChatResult> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (request.documentId && !uuidPattern.test(request.documentId)) {
    throw new Error('Document ID must be a valid UUID, or leave the field empty.')
  }
  if (request.conversationId && !uuidPattern.test(request.conversationId)) {
    throw new Error('Conversation ID is invalid. Start a new conversation and try again.')
  }
  const response = await fetch(`${API_ROOT}/api/Agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain' },
    body: JSON.stringify({
      question: request.question,
      ...(request.conversationId ? { conversationId: request.conversationId } : {}),
      ...(request.documentId ? { documentId: request.documentId } : {}),
      ...(request.subject ? { subject: request.subject } : {}),
    }),
    signal,
  }).catch((error: unknown) => {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error(
      'Could not connect to StudentAssist. Check your internet connection. ' +
        'If this frontend is hosted on another domain, the API must allow it via CORS.',
    )
  })

  if (!response.ok) throw new Error(await readError(response))
  const body = await response.text()
  if (!body.trim()) {
    throw new Error('StudentAssist returned an empty response. Please retry your question.')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return { answer: body, citations: [] }
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    throw new Error('StudentAssist returned an invalid response. Please retry your question.')
  }

  if (typeof payload === 'string' && payload.trim()) return { answer: payload, citations: [] }
  return parseChatResult(payload)
}

export function uploadDocument(
  file: File,
  signal: AbortSignal,
  onProgress: UploadProgress,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_ROOT}/api/Agent/upload`)
    request.responseType = 'text'
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        resolve('Your PDF was uploaded successfully.')
      } else {
        let message: string | undefined
        try {
          const payload: unknown = JSON.parse(request.responseText)
          if (typeof payload === 'object' && payload !== null && 'message' in payload) {
            const value = payload.message
            if (typeof value === 'string') message = value
          }
        } catch {
          message = request.responseText || undefined
        }
        reject(new Error(errorMessage(request.status, message)))
      }
    })
    request.addEventListener('error', () => {
      reject(
        new Error(
          'Could not connect to StudentAssist. Check your internet connection. ' +
            'If this frontend is hosted on another domain, the API must allow it via CORS.',
        ),
      )
    })
    request.addEventListener('abort', () => {
      reject(new DOMException('The upload was cancelled.', 'AbortError'))
    })
    signal.addEventListener(
      'abort',
      () => {
        request.abort()
      },
      { once: true },
    )
    if (signal.aborted) {
      request.abort()
      return
    }
    const form = new FormData()
    form.append('file', file)
    request.send(form)
  })
}
