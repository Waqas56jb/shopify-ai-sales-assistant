import { createContext, useContext, useMemo, useState } from 'react'
import { DEMO_CREDENTIALS } from '../data/mock'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('dd_admin_user')
    return raw ? JSON.parse(raw) : null
  })

  const login = (email, password) => {
    if (
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    ) {
      const next = { email: DEMO_CREDENTIALS.email, name: 'Desk & Day Admin' }
      localStorage.setItem('dd_admin_user', JSON.stringify(next))
      setUser(next)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid email or password' }
  }

  const logout = () => {
    localStorage.removeItem('dd_admin_user')
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
