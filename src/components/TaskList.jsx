import { useState, useRef } from 'react'
import { Pill, Check } from 'lucide-react'
import { TASK_ICON_MAP } from '../constants'
import { supabase } from '../supabase'
import ClaimModal from './ClaimModal'

export default function TaskList({ treatments, isPatient, patientName, showToast, onClaimSuccess }) {
  const [claimTarget, setClaimTarget] = useState(null) // { treatment, task }
  const [saving, setSaving] = useState(false)
  const claimerNameRef = useRef('')

  const sorted = [...treatments].sort((a, b) => a.date.localeCompare(b.date))

  const openClaim = (treatment, task) => {
    setClaimTarget({ treatment, task })
  }

  const handleClaim = async (name) => {
    setSaving(true)
    claimerNameRef.current = name

    const { error } = await supabase
      .from('tasks')
      .update({ claimed_by: name, claimed_at: new Date().toISOString() })
      .eq('id', claimTarget.task.id)
      .is('claimed_by', null) // prevent double-claim

    setSaving(false)

    if (error) {
      showToast('Could not claim — someone may have just taken it!')
    } else {
      showToast(`Signed up! ${patientName} will be notified.`)
      setClaimTarget(null)
      onClaimSuccess?.()
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        No treatment dates yet.<br />
        {isPatient ? 'Go to Calendar and tap + to add one.' : 'Check back soon.'}
      </div>
    )
  }

  return (
    <>
      <div className="tasks-container">
        {sorted.map(t => {
          const tasks = t.tasks || []
          const open = tasks.filter(tk => !tk.claimed_by).length
          const d = new Date(t.date + 'T12:00:00')

          return (
            <div key={t.id} className="task-group">
              {/* Group header */}
              <div className="task-group-header">
                <div className="tgh-left">
                  <Pill size={15} color="var(--rose-deep)" />
                  <div className="tgh-date">
                    {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                {open > 0
                  ? <span className="badge">{open} open</span>
                  : (
                    <span style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} color="var(--sage)" strokeWidth={2.5} /> Covered
                    </span>
                  )
                }
              </div>

              {/* Task items */}
              {tasks.length === 0 ? (
                <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                  No tasks added yet.
                </div>
              ) : (
                tasks.map(task => {
                  const TaskIcon = TASK_ICON_MAP[task.type] || TASK_ICON_MAP.custom
                  const claimed = !!task.claimed_by

                  return (
                    <div key={task.id} className={`task-item${claimed ? ' claimed' : ''}`}>
                      <div className="task-icon-wrap">
                        <TaskIcon
                          size={16}
                          color={claimed ? 'var(--sage)' : 'var(--rose-deep)'}
                        />
                      </div>
                      <div className="task-info">
                        <div className="task-name">{task.label}</div>
                        {claimed
                          ? (
                            <div className="task-claimer">
                              <Check size={11} color="var(--sage)" strokeWidth={2.5} />
                              {task.claimed_by}
                            </div>
                          )
                          : <div className="task-note">Nobody signed up yet</div>
                        }
                      </div>
                      {!claimed && (
                        <button
                          className="task-action"
                          onClick={() => openClaim(t, task)}
                        >
                          {isPatient ? 'Sign up' : 'I can help'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
        <div style={{ height: 80 }} />
      </div>

      {claimTarget && (
        <ClaimModal
          treatment={claimTarget.treatment}
          task={claimTarget.task}
          initialName={claimerNameRef.current}
          patientName={patientName}
          saving={saving}
          onClose={() => setClaimTarget(null)}
          onClaim={handleClaim}
        />
      )}
    </>
  )
}
