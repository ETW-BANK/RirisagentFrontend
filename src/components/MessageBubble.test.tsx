import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CitationList } from './CitationList'

describe('CitationList', () => {
  it('renders source filename, page, and multiline citation text safely', () => {
    render(
      <CitationList
        citations={[
          {
            fileName: 'biology-notes.pdf',
            pageNumber: 12,
            text: 'Cells contain organelles.\nMitochondria release energy.',
          },
        ]}
      />,
    )

    expect(screen.getByText('biology-notes.pdf')).toBeInTheDocument()
    expect(screen.getByText('Page 12')).toBeInTheDocument()
    expect(screen.getByText(/Mitochondria release energy/)).toBeInTheDocument()
  })
})
