import { useState } from 'react'
import { ChevronLeft, ChevronRight, Pill, Check } from 'lucide-react'
import { MONTHS } from '../constants'

export default function CalendarTab({ treatments, onDayClick, onTreatmentClick }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const today = new Date()

  const treatmentDateSet = new Set(treatments.map(t => t.date))

  // Build calendar cells
  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: prevMonthDays - firstDay + i + 1, kind: 'prev' })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      date: ds,
      kind: 'current',
      isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
      isTreatment: treatmentDateSet.has(ds),
    })
  }
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, kind: 'next' })
  }

  const todayStr = today.toISOString().slice(0, 10)
  const sorted = [...treatments].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter(t => t.date >= todayStr)
  const displayList = upcoming.length > 0 ? upcoming : sorted

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Month nav */}
      <div className="cal-header">
        <div className="cal-title">{MONTHS[month]} {year}</div>
        <div className="cal-nav">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} aria-label="Previous month">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="cal-grid">
        <div className="cal-days-header">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <span key={d}>{d}</span>)}
        </div>
        <div className="cal-days">
          {cells.map((cell, i) => {
            const classes = [
              'cal-day',
              cell.kind !== 'current' ? 'other-month empty' : '',
              cell.isToday ? 'today' : '',
              cell.isTreatment ? 'treatment' : '',
            ].filter(Boolean).join(' ')

            return (
              <div
                key={i}
                className={classes}
                onClick={() => cell.kind === 'current' && onDayClick(cell.date, !!cell.isTreatment)}
              >
                <span>{cell.day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming treatment list */}
      <div className="section-title">Upcoming treatment dates</div>

      {displayList.length === 0 ? (
        <div className="empty-state">
          No treatment dates yet.<br />Tap + to add your first one.
        </div>
      ) : (
        displayList.map(t => {
          const tasks = t.tasks || []
          const claimed = tasks.filter(tk => tk.claimed_by).length
          const open = tasks.length - claimed
          const d = new Date(t.date + 'T12:00:00')

          return (
            <div key={t.id} className="treatment-card" onClick={onTreatmentClick}>
              <div className="tc-icon">
                <Pill size={18} color="white" />
              </div>
              <div className="tc-info">
                <div className="tc-date">
                  {d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                </div>
                {t.notes && <div className="tc-meta">{t.notes}</div>}
                <div className="tc-tasks">{claimed}/{tasks.length} tasks covered</div>
              </div>
              {open > 0
                ? <div className="badge">{open} open</div>
                : (
                  <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} color="var(--sage)" strokeWidth={2.5} /> All set
                  </div>
                )
              }
            </div>
          )
        })
      )}

      <div style={{ height: 80 }} />
    </div>
  )
}
