import { useState } from 'react'

interface DocumentSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function DocumentSelector({ value, onChange }: DocumentSelectorProps) {
  const [specificDocument, setSpecificDocument] = useState(Boolean(value))

  return (
    <label className="field-label document-field">
      Document <span className="optional-label">Optional</span>
      <select
        aria-label="Document"
        value={specificDocument ? 'specific' : 'all'}
        onChange={(event) => {
          const selectedSpecific = event.target.value === 'specific'
          setSpecificDocument(selectedSpecific)
          if (!selectedSpecific) onChange('')
        }}
      >
        <option value="all">All relevant documents</option>
        <option value="specific">Specific document ID</option>
      </select>
      {specificDocument && (
        <input
          aria-label="Document ID"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter a document UUID"
          autoComplete="off"
        />
      )}
    </label>
  )
}
