import { useState, useEffect, useCallback } from 'react'
import { Calendar, CheckSquare, Share2, Plus } from 'lucide-react'
import { supabase } from '../supabase'
import CalendarTab from './CalendarTab'
import TaskList from './TaskList'
import ShareTab from './ShareTab'
import AddTreatmentModal from './AddTreatmentModal'

export default function PatientApp({ session, showToast }) {
  const [circle, setCircle] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [activeTab, setActiveTab] = useState('calendar')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [addModalDate, setAddModalDate] = useState('')
  const [savingTreatment, setSavingTreatment] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTreatments = useCallback(async (circleId) => {
    const { data: treatmentsData, error: tErr } = await supabase
      .from('treatments')
      .select('*')
      .eq('circle_id', circleId)
      .order('date', { ascending: true })

    if (tErr) { console.error('treatments fetch error:', tErr); return }
    if (!treatmentsData) return

    // Fetch tasks separately to avoid needing a FK constraint for the join
    const ids = treatmentsData.map(t => t.id)
    let tasksData = []
    if (ids.length > 0) {
      const { data: tasks, error: tkErr } = await supabase
        .from('tasks')
        .select('*')
        .in('treatment_id', ids)
        .order('id', { ascending: true })
      if (tkErr) console.error('tasks fetch error:', tkErr)
      else tasksData = tasks || []
    }

    setTreatments(treatmentsData.map(t => ({
      ...t,
      tasks: tasksData.filter(tk => tk.treatment_id === t.id),
    })))
  }, [])

  // Load or create circle on mount
  useEffect(() => {
    const init = async () => {
      const { data: rows } = await supabase
        .from('circles')
        .select('*')
        .eq('owner_id', session.user.id)
        .limit(1)

      const existing = rows?.[0] || null

      if (existing) {
        setCircle(existing)
        await fetchTreatments(existing.id)
      } else {
        // Create a new circle for this user
        const fullName = session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split('@')[0]
          || 'My'
        const firstName = fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'my'
        const slug = `${firstName}-${Math.random().toString(36).slice(2, 7)}`

        const { data: created } = await supabase
          .from('circles')
          .insert({ owner_id: session.user.id, slug, patient_name: fullName })
          .select()
          .single()

        if (created) {
          setCircle(created)
        }
      }
      setLoading(false)
    }
    init()
  }, [session, fetchTreatments])

  // Realtime subscription
  useEffect(() => {
    if (!circle?.id) return
    const circleId = circle.id

    const channel = supabase
      .channel(`circle-patient-${circleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'treatments', filter: `circle_id=eq.${circleId}` },
        () => fetchTreatments(circleId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTreatments(circleId)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [circle?.id, fetchTreatments])

  const handleAddTreatment = async ({ date, notes, taskTypes, customTask }) => {
    if (!circle) return
    setSavingTreatment(true)

    try {
      const existing = treatments.find(t => t.date === date)
      let treatmentId

      if (existing) {
        treatmentId = existing.id
        if (notes && notes !== existing.notes) {
          const { error } = await supabase.from('treatments').update({ notes }).eq('id', existing.id)
          if (error) throw error
        }
      } else {
        // Insert without .single() so a select failure doesn't mask a successful insert
        const { error: insertError } = await supabase
          .from('treatments')
          .insert({ circle_id: circle.id, date, notes: notes || null })
        if (insertError) throw insertError

        // Fetch back the ID we just created
        const { data: newRow, error: fetchError } = await supabase
          .from('treatments')
          .select('id')
          .eq('circle_id', circle.id)
          .eq('date', date)
          .single()
        if (fetchError) throw fetchError
        treatmentId = newRow.id
      }

      // Insert tasks
      const rows = [
        ...taskTypes.map(t => ({ treatment_id: treatmentId, type: t.id, label: t.label })),
        ...(customTask ? [{ treatment_id: treatmentId, type: 'custom', label: customTask }] : []),
      ]
      if (rows.length > 0) {
        const { error } = await supabase.from('tasks').insert(rows)
        if (error) throw error
      }

      await fetchTreatments(circle.id)
      setShowAddModal(false)
      showToast('Treatment date saved!')
    } catch (err) {
      console.error('handleAddTreatment error:', err)
      showToast(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSavingTreatment(false)
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setSavingName(true)
    const { error } = await supabase.from('circles').update({ patient_name: trimmed }).eq('id', circle.id)
    setSavingName(false)
    if (!error) {
      setCircle(prev => ({ ...prev, patient_name: trimmed }))
      setEditingName(false)
      showToast('Name updated!')
    }
  }

  const openAddDate = (date = '') => {
    setAddModalDate(date)
    setShowAddModal(true)
  }

  if (loading) {
    return (
      <div className="phone">
        <div className="loading-center">Loading your circle…</div>
      </div>
    )
  }

  const patientName = circle?.patient_name || 'Your'
  const firstName = patientName.split(' ')[0]
  const avatarInitials = patientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const helperCount = new Set(
    treatments.flatMap(t => (t.tasks || []).filter(tk => tk.claimed_by).map(tk => tk.claimed_by))
  ).size

  const navItems = [
    { id: 'calendar', label: 'Calendar', Icon: Calendar },
    { id: 'tasks',    label: 'Tasks',    Icon: CheckSquare },
    { id: 'share',    label: 'Share',    Icon: Share2 },
  ]

  return (
    <div className="phone">

      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">Care Circle</div>
        <nav className="sidebar-nav">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`sidebar-btn${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} color={activeTab === id ? 'var(--rose-deep)' : 'var(--text-light)'} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer" onClick={() => setShowProfileSheet(true)}>
          <div className="avatar">{avatarInitials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{firstName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>View profile</div>
          </div>
        </div>
      </aside>

      {/* ── Content column (header + tab content) ── */}
      <div className="content-col">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div className="app-name">Care Circle</div>
            <div className="avatar" onClick={() => setShowProfileSheet(true)} title="Profile">
              {avatarInitials}
            </div>
          </div>
          <div className="header-sub">
            {firstName}'s circle · {helperCount} {helperCount === 1 ? 'friend' : 'friends'} helping
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'calendar' && (
            <CalendarTab
              treatments={treatments}
              onDayClick={(date, hasTreatment) => {
                if (hasTreatment) setActiveTab('tasks')
                else openAddDate(date)
              }}
              onTreatmentClick={() => setActiveTab('tasks')}
            />
          )}
          {activeTab === 'tasks' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <TaskList
                treatments={treatments}
                isPatient
                patientName={firstName}
                showToast={showToast}
                onClaimSuccess={() => fetchTreatments(circle.id)}
              />
            </div>
          )}
          {activeTab === 'share' && (
            <ShareTab
              circle={circle}
              treatments={treatments}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav (hidden on desktop via CSS) ── */}
      <div className="nav">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={20} stroke={activeTab === id ? 'var(--rose-deep)' : 'var(--text-light)'} />
            {label}
          </button>
        ))}
      </div>

      {/* FAB — only on Calendar tab */}
      {activeTab === 'calendar' && (
        <button className="fab" onClick={() => openAddDate()} aria-label="Add treatment date">
          <Plus size={24} color="white" />
        </button>
      )}

      {/* Add Treatment Modal */}
      {showAddModal && (
        <AddTreatmentModal
          initialDate={addModalDate}
          saving={savingTreatment}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTreatment}
        />
      )}

      {/* Profile sheet */}
      {showProfileSheet && (
        <div className="modal-bg" onClick={() => { setShowProfileSheet(false); setEditingName(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--rose-pale)', border: '2px solid var(--rose)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 500, color: 'var(--rose-deep)', flexShrink: 0,
              }}>
                {avatarInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
                  {session.user.email}
                </div>
              </div>
            </div>

            {editingName ? (
              <>
                <label className="form-label" htmlFor="profile-name">Display name</label>
                <input
                  id="profile-name"
                  className="form-input"
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setEditingName(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    onClick={handleSaveName}
                    disabled={savingName || !nameInput.trim()}
                  >
                    {savingName ? 'Saving…' : 'Save name'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)' }}>
                    {patientName}
                  </div>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--rose-deep)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
                    onClick={() => { setNameInput(patientName); setEditingName(true) }}
                  >
                    Edit name
                  </button>
                </div>
                <button
                  className="btn-primary"
                  style={{ background: 'none', color: 'var(--rose-deep)', border: '1px solid var(--rose)' }}
                  onClick={() => supabase.auth.signOut()}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
