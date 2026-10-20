import type { Citation } from '../types/chat'

interface CitationListProps {
  citations: Citation[]
}

export function CitationList({ citations }: CitationListProps) {
  if (!citations.length) return null
  return (
    <section className="citation-list" aria-label="Sources">
      <h3>Sources</h3>
      {citations.map((citation, index) => (
        <article className="citation-card" key={`${citation.fileName ?? 'source'}-${index}`}>
          <div className="citation-meta">
            <span className="citation-file">{citation.fileName || 'Document source'}</span>
            {citation.pageNumber !== undefined && (
              <span className="citation-page">Page {citation.pageNumber}</span>
            )}
          </div>
          {citation.text && <p>{citation.text}</p>}
        </article>
      ))}
    </section>
  )
}
