const COMMON_SUBJECTS = [
  { value: 'math', label: 'Math' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'history', label: 'History' },
]

interface SubjectSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function SubjectSelector({ value, onChange }: SubjectSelectorProps) {
  return (
    <label className="field-label">
      Subject
      <select
        aria-label="Subject"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || '')}
      >
        <option value="">Automatic</option>
        {COMMON_SUBJECTS.map((subject) => (
          <option key={subject.value} value={subject.value}>{subject.label}</option>
        ))}
      </select>
      <span className="field-hint">Automatic lets StudentAssist detect a subject from your question.</span>
    </label>
  )
}
