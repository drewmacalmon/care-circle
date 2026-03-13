import { useState, useRef } from 'react'
import { Pill, Check, Trash2 } from 'lucide-react'
import { TASK_ICON_MAP } from '../constants'
import { supabase } from '../supabase'
import ClaimModal from './ClaimModal'

export default function TaskList({ treatments, isPatient, patientName, showToast, onClaimSuccess }) {
  const [claimTarget, setClaimTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editSucceeded, setEditSucceeded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [claimSucceeded, setClaimSucceeded] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // treatment id pending confirmation
  const [deleting, setDeleting] = useState(false)
  const claimerNameRef = useRef('')

  const handleDelete = async (treatmentId) => {
    setDeleting(true)
    await supabase.from('tasks').delete().eq('treatment_id', treatmentId)
    await supabase.from('treatments').delete().eq('id', treatmentId)
    setDeleteTarget(null)
    setDeleting(false)
    onClaimSuccess?.()
  }

  const sorted = [...treatments].sort((a, b) => a.date.localeCompare(b.date))

  const openClaim = (treatment, task) => {
    setClaimSucceeded(false)
    setClaimTarget({ treatment, task })
  }

  const openEdit = (treatment, task) => {
    setEditSucceeded(false)
    setEditTarget({ treatment, task })
  }

  const handleEditClaim = async (name) => {
    setSaving(true)
    await supabase
      .from('tasks')
      .update({ claimed_by: name, claimed_at: new Date().toISOString() })
      .eq('id', editTarget.task.id)
    setSaving(false)
    setEditSucceeded(true)
    onClaimSuccess?.()
  }

  const handleUnclaim = async () => {
    setSaving(true)
    await supabase
      .from('tasks')
      .update({ claimed_by: null, claimed_at: null })
      .eq('id', editTarget.task.id)
    setSaving(false)
    setEditTarget(null)
    showToast('Signup removed.')
    onClaimSuccess?.()
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
      setClaimSucceeded(true)
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
              {deleteTarget === t.id ? (
                <div className="task-group-header">
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Delete this date?</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-cancel" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      style={{ padding: '4px 12px', fontSize: 12, background: '#C0392B', flex: 'none' }}
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="task-group-header">
                  <div className="tgh-left">
                    <Pill size={15} color="var(--rose-deep)" />
                    <div className="tgh-date">
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {open > 0
                      ? <span className="badge">{open} open</span>
                      : (
                        <span style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} color="var(--sage)" strokeWidth={2.5} /> Covered
                        </span>
                      )
                    }
                    {isPatient && (
                      <button
                        onClick={() => setDeleteTarget(t.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                        title="Delete treatment date"
                      >
                        <Trash2 size={14} color="var(--text-light)" />
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                      {claimed ? (
                        <button
                          className="task-action"
                          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                          onClick={() => openEdit(t, task)}
                        >
                          Edit
                        </button>
                      ) : (
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
          claimed={claimSucceeded}
          onClose={() => { setClaimTarget(null); setClaimSucceeded(false) }}
          onClaim={handleClaim}
        />
      )}

      {editTarget && (
        <ClaimModal
          mode="edit"
          treatment={editTarget.treatment}
          task={editTarget.task}
          initialName={editTarget.task.claimed_by || ''}
          patientName={patientName}
          saving={saving}
          claimed={editSucceeded}
          onClose={() => { setEditTarget(null); setEditSucceeded(false) }}
          onClaim={handleEditClaim}
          onUnclaim={handleUnclaim}
        />
      )}
    </>
  )
}
