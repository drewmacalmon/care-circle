import { Info, Check } from 'lucide-react'

export default function ShareTab({ circle, treatments, showToast }) {
  if (!circle) return null

  const shareUrl = `${window.location.origin}/circle/${circle.slug}`
  const allTasks = treatments.flatMap(t => t.tasks || [])
  const claimedTasks = allTasks.filter(tk => tk.claimed_by)
  const helpers = [...new Set(claimedTasks.map(tk => tk.claimed_by))]

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Link copied to clipboard!')
    }).catch(() => {
      showToast('Link copied!')
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
      <div className="section-title">Your circle stats</div>

      <div className="stat-row">
        <div className="stat-box">
          <div className="stat-num">{treatments.length}</div>
          <div className="stat-lbl">Dates</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{allTasks.length}</div>
          <div className="stat-lbl">Tasks</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{claimedTasks.length}</div>
          <div className="stat-lbl">Claimed</div>
        </div>
      </div>

      <div className="info-row">
        <Info size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div className="info-text">
          Share this link with friends so they can see your treatment calendar and sign up to help.
        </div>
      </div>

      <div className="share-card">
        <div className="share-label">Your unique link</div>
        <div className="share-link">{shareUrl}</div>
        <button className="copy-btn" onClick={copyLink}>
          Copy link to share
        </button>
      </div>

      {helpers.length > 0 && (
        <>
          <div className="section-title">Friends in your circle</div>
          {helpers.map(name => {
            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const taskCount = claimedTasks.filter(tk => tk.claimed_by === name).length
            return (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--rose-pale)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 500, color: 'var(--rose-deep)',
                  flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {taskCount} {taskCount === 1 ? 'task' : 'tasks'} claimed
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} color="var(--sage)" strokeWidth={2.5} /> Helping
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
