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
  const [addModalDate, setAddModalDate] = useState('')
  const [savingTreatment, setSavingTreatment] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTreatments = useCallback(async (circleId) => {
    const { data } = await supabase
      .from('treatments')
      .select('*, tasks(*)')
      .eq('circle_id', circleId)
      .order('date', { ascending: true })
    if (data) {
      setTreatments(data.map(t => ({
        ...t,
        tasks: (t.tasks || []).sort((a, b) => a.id - b.id),
      })))
    }
  }, [])

  // Load or create circle on mount
  useEffect(() => {
    const init = async () => {
      const { data: existing } = await supabase
        .from('circles')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle()

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
      // Check if treatment exists for this date
      const existing = treatments.find(t => t.date === date)
      let treatmentId

      if (existing) {
        treatmentId = existing.id
        if (notes && notes !== existing.notes) {
          await supabase.from('treatments').update({ notes }).eq('id', existing.id)
        }
      } else {
        const { data, error } = await supabase
          .from('treatments')
          .insert({ circle_id: circle.id, date, notes: notes || null })
          .select()
          .single()
        if (error) throw error
        treatmentId = data.id
      }

      // Insert selected task types
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
    } catch {
      showToast('Something went wrong. Please try again.')
    } finally {
      setSavingTreatment(false)
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

  return (
    <div className="phone">
      {/* Header */}
      <div className="header">
        <div className="header-top">
          <div className="app-name">Care Circle</div>
          <div
            className="avatar"
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
          >
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

      {/* Bottom nav */}
      <div className="nav">
        <button
          className={`nav-btn${activeTab === 'calendar' ? ' active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={20} stroke={activeTab === 'calendar' ? 'var(--rose-deep)' : 'var(--text-light)'} />
          Calendar
        </button>
        <button
          className={`nav-btn${activeTab === 'tasks' ? ' active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={20} stroke={activeTab === 'tasks' ? 'var(--rose-deep)' : 'var(--text-light)'} />
          Tasks
        </button>
        <button
          className={`nav-btn${activeTab === 'share' ? ' active' : ''}`}
          onClick={() => setActiveTab('share')}
        >
          <Share2 size={20} stroke={activeTab === 'share' ? 'var(--rose-deep)' : 'var(--text-light)'} />
          Share
        </button>
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
    </div>
  )
}
