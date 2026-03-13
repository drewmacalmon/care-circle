import { useEffect, useRef, useState } from 'react'

export default function Toast({ message, toastKey }) {
  const [show, setShow] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!message) return
    clearTimeout(timerRef.current)
    setShow(true)
    timerRef.current = setTimeout(() => setShow(false), 2000)
    return () => clearTimeout(timerRef.current)
  }, [message, toastKey])

  return (
    <div className={`toast${show ? ' show' : ''}`}>{message}</div>
  )
}
