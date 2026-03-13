import { useState } from 'react'
import { TASK_ICON_MAP } from '../constants'
import { CalendarPlus, ExternalLink } from 'lucide-react'

function formatDateCompact(dateStr) {
  return dateStr.replace(/-/g, '')
}

function makeICS(treatment, task, patientName) {
  const start = formatDateCompact(treatment.date)
  const d = new Date(treatment.date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const end = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const summary = `Help with ${task.label} — ${patientName}'s treatment day`
  const description = treatment.notes
    ? `${task.label} for ${patientName}'s treatment. Notes: ${treatment.notes}`
    : `${task.label} for ${patientName}'s treatment day.`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Care Circle//Care Circle//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return ics
}

function makeGoogleCalURL(treatment, task, patientName) {
  const start = formatDateCompact(treatment.date)
  const d = new Date(treatment.date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const end = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const text = encodeURIComponent(`Help with ${task.label} — ${patientName}'s treatment day`)
  const details = encodeURIComponent(
    treatment.notes
      ? `${task.label} for ${patientName}'s treatment. Notes: ${treatment.notes}`
      : `${task.label} for ${patientName}'s treatment day.`
  )
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`
}

// mode: 'claim' | 'edit'
export default function ClaimModal({
  treatment, task, initialName, patientName,
  onClose, onClaim, onUnclaim, saving,
  claimed, mode = 'claim',
}) {
  const [name, setName] = useState(initialName || '')

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onClaim(trimmed)
  }

  const handleDownloadICS = () => {
    const ics = makeICS(treatment, task, patientName)
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'care-circle-event.ics'
    a.click()
    URL.revokeObjectURL(url)
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

        {/* ── Post-claim success state ── */}
        {claimed ? (
          <>
            <div style={{
              background: 'var(--sage-pale)',
              border: '1px solid #b8d8b9',
              borderRadius: 'var(--r)',
              padding: '14px 16px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage)', marginBottom: 4 }}>
                You're signed up!
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {patientName} has been notified. Want to add this to your calendar?
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleDownloadICS}
            >
              <CalendarPlus size={15} />
              Add to Apple / Outlook Calendar
            </button>

            <a
              href={makeGoogleCalURL(treatment, task, patientName)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rm)',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text)',
                textDecoration: 'none',
                marginBottom: 12,
              }}
            >
              <ExternalLink size={14} color="var(--text-muted)" />
              Add to Google Calendar
            </a>

            <button className="btn-cancel" style={{ width: '100%' }} onClick={onClose}>
              Done
            </button>
          </>

        ) : mode === 'edit' ? (
          /* ── Edit existing claim ── */
          <>
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

            <div className="modal-actions" style={{ flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button className="btn-cancel" onClick={onClose}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={saving || !name.trim()}
                >
                  {saving ? 'Saving…' : 'Update name'}
                </button>
              </div>
              <button
                className="btn-cancel"
                style={{ width: '100%', color: '#C0392B', borderColor: '#e8b4b4' }}
                onClick={onUnclaim}
                disabled={saving}
              >
                Remove my signup
              </button>
            </div>
          </>

        ) : (
          /* ── New claim ── */
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
