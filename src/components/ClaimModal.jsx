import { useState } from 'react'
import { TASK_ICON_MAP } from '../constants'

export default function ClaimModal({ treatment, task, initialName, patientName, onClose, onClaim, saving }) {
  const [name, setName] = useState(initialName || '')

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onClaim(trimmed)
  }

  const TaskIcon = TASK_ICON_MAP[task?.type] || TASK_ICON_MAP.custom
  const d = treatment ? new Date(treatment.date + 'T12:00:00') : null
  const dateStr = d
    ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div className="task-icon-wrap" style={{ background: 'var(--rose-pale)', flexShrink: 0 }}>
            <TaskIcon size={16} color="var(--rose-deep)" />
          </div>
          <div>
            <div className="modal-title" style={{ marginBottom: 2, fontSize: 17 }}>
              {task?.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{dateStr}</div>
          </div>
        </div>

        <label className="form-label" htmlFor="claimer-name">Your name</label>
        <input
          id="claimer-name"
          className="claimer-input"
          type="text"
          placeholder="First name is fine"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16 }}>
          {patientName} will be notified when you sign up.
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Sign me up'}
          </button>
        </div>
      </div>
    </div>
  )
}
