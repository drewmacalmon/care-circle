import { useState } from 'react'
import { TASK_TYPES } from '../constants'

export default function AddTreatmentModal({ initialDate, onClose, onSave, saving }) {
  const [date, setDate] = useState(initialDate || '')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState(new Set(TASK_TYPES.map(t => t.id)))
  const [customTask, setCustomTask] = useState('')

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = () => {
    if (!date) return
    const taskTypes = TASK_TYPES.filter(t => selected.has(t.id))
    onSave({ date, notes: notes.trim(), taskTypes, customTask: customTask.trim() })
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Add treatment date</div>

        <label className="form-label" htmlFor="input-date">Date</label>
        <input
          id="input-date"
          type="date"
          className="form-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <label className="form-label" htmlFor="input-notes">Notes (optional)</label>
        <input
          id="input-notes"
          type="text"
          className="form-input"
          placeholder="e.g. Chemo round 3, Dr. Martinez"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <label className="form-label">Tasks needed</label>
        <div className="task-toggle">
          {TASK_TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`task-toggle-btn${selected.has(id) ? ' on' : ''}`}
              onClick={() => toggle(id)}
              type="button"
            >
              <Icon
                size={15}
                color={selected.has(id) ? 'var(--rose-deep)' : 'var(--text-light)'}
              />
              {label}
            </button>
          ))}
        </div>

        <label className="form-label" htmlFor="input-custom">Custom task</label>
        <input
          id="input-custom"
          type="text"
          className="form-input"
          placeholder="Add another task…"
          value={customTask}
          onChange={e => setCustomTask(e.target.value)}
        />

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !date}
          >
            {saving ? 'Saving…' : 'Save date'}
          </button>
        </div>
      </div>
    </div>
  )
}
