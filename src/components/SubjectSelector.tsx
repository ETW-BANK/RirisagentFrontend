const COMMON_SUBJECTS = ['math', 'physics', 'chemistry', 'biology']

interface SubjectSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function SubjectSelector({ value, onChange }: SubjectSelectorProps) {
  return (
    <label className="field-label">
      Subject
      <input
        aria-label="Subject"
        list="subject-options"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. math"
      />
      <datalist id="subject-options">
        {COMMON_SUBJECTS.map((subject) => <option key={subject} value={subject} />)}
      </datalist>
      <span className="field-hint">Match this to the subject used for your study materials.</span>
    </label>
  )
}
