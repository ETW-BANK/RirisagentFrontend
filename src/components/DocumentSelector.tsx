interface DocumentSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function DocumentSelector({ value, onChange }: DocumentSelectorProps) {
  return (
    <label className="field-label document-field">
      Document ID <span className="optional-label">Optional</span>
      <input
        aria-label="Document ID"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste an existing document UUID"
        autoComplete="off"
      />
      <span className="field-hint">The API has no document-list endpoint. Leave blank to use available documents.</span>
    </label>
  )
}
