import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TaskList from './TaskList'

export default function FriendView({ showToast, session }) {
  const { slug } = useParams()
  const [circle, setCircle] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchData = useCallback(async (circleId) => {
    const { data: treatmentsData, error: tErr } = await supabase
      .from('treatments')
      .select('*')
      .eq('circle_id', circleId)
      .order('date', { ascending: true })

    if (tErr) { console.error('treatments fetch error:', tErr); return }
    if (!treatmentsData) return

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

  useEffect(() => {
    const init = async () => {
      const { data: found } = await supabase
        .from('circles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setCircle(found)
      await fetchData(found.id)
      setLoading(false)
    }
    init()
  }, [slug, fetchData])

  // Realtime subscription for friend view
  useEffect(() => {
    if (!circle?.id) return
    const circleId = circle.id

    const channel = supabase
      .channel(`circle-friend-${circleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'treatments', filter: `circle_id=eq.${circleId}` },
        () => fetchData(circleId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchData(circleId)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [circle?.id, fetchData])

  if (loading) {
    return (
      <div className="phone">
        <div className="loading-center">Loading…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="phone">
        <div className="header">
          <div className="header-top">
            <div className="app-name">Care Circle</div>
          </div>
        </div>
        <div className="empty-state" style={{ padding: '48px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--rose-deep)', marginBottom: 10 }}>
            Circle not found
          </div>
          This link may be invalid or the circle may have been removed.
        </div>
      </div>
    )
  }

  const patientName = circle?.patient_name || 'Someone'
  const firstName = patientName.split(' ')[0]

  // Avatar from patient name
  const avatarInitials = patientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="phone">

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">Care Circle</div>
        <nav className="sidebar-nav">
          <button className="sidebar-btn active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--rose-deep)" strokeWidth="1.8">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            All tasks
          </button>
        </nav>
        <div className="sidebar-footer" style={{ cursor: 'default' }}>
          <div className="avatar" style={{ cursor: 'default' }}>{avatarInitials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{firstName}'s circle</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sign up to help</div>
          </div>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div className="content-col">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div className="app-name">Care Circle</div>
            <div className="avatar" title={patientName} style={{ cursor: 'default' }}>
              {avatarInitials}
            </div>
          </div>
          <div className="header-sub">{firstName}'s circle · Sign up to help</div>
        </div>

        {/* Intro copy */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--rose-deep)', marginBottom: 6 }}>
            Help {firstName}'s circle
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Pick the tasks that work for you. {firstName} will be notified when you sign up.
          </div>
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TaskList
            treatments={treatments}
            isPatient={false}
            patientName={firstName}
            showToast={showToast}
            onClaimSuccess={() => fetchData(circle.id)}
          />
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <div className="nav">
        <button className="nav-btn active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rose-deep)" strokeWidth="1.5">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          All tasks
        </button>
      </div>
    </div>
  )
}
