import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'
import LoginScreen from './components/LoginScreen'
import PatientApp from './components/PatientApp'
import FriendView from './components/FriendView'
import Toast from './components/Toast'

export default function App() {
  // undefined = still checking; null = not logged in; object = logged in
  const [session, setSession] = useState(undefined)
  const [toast, setToast] = useState('')
  const [toastKey, setToastKey] = useState(0)

  const showToast = (msg) => {
    setToast(msg)
    setToastKey(k => k + 1)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Still checking auth
  if (session === undefined) {
    return (
      <div className="phone">
        <div className="loading-center">Care Circle</div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Friend view — no auth required */}
        <Route
          path="/circle/:slug"
          element={<FriendView showToast={showToast} session={session} />}
        />

        {/* Patient app or login */}
        <Route
          path="*"
          element={
            session
              ? <PatientApp session={session} showToast={showToast} />
              : <LoginScreen />
          }
        />
      </Routes>

      <Toast message={toast} toastKey={toastKey} />
    </>
  )
}
