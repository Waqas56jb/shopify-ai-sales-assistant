import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  BookOpen,
  BrainCircuit,
  Settings,
  Package,
  LogOut,
  Database,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/conversations', label: 'Conversations', icon: MessagesSquare },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/training', label: 'Training', icon: BrainCircuit },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const TITLES = {
  '/': ['Dashboard', 'Live overview of chats, leads, and performance'],
  '/leads': ['Leads', 'Captured shopper details waiting for follow-up'],
  '/conversations': ['Conversations', 'Recent assistant chats and handoffs'],
  '/knowledge': ['Knowledge Base', 'Products, policies, images, and orderable content'],
  '/training': ['Training', 'Train the assistant on text, images, and structured data'],
  '/products': ['Products', 'Quick product catalog management'],
  '/settings': ['Settings', 'Widget colors, branding, and integrations'],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { dbStatus } = useAppData()
  const { pathname } = useLocation()
  const [title, subtitle] = TITLES[pathname] || ['Admin', 'Desk & Day control center']
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className={`shell${menuOpen ? ' menu-open' : ''}`}>
      <button
        className="mobile-nav-toggle"
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {menuOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className="sidebar">
        <div className="side-brand">
          <div className="mark">D</div>
          <div>
            <h2>Desk & Day</h2>
            <p>Admin Panel</p>
          </div>
        </div>

        <nav className="nav-list">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <div className="side-user">
            <span className="side-email">{user?.email}</span>
            <div className="side-db">
              <Database size={12} />
              {dbStatus === 'connected'
                ? 'Supabase connected'
                : dbStatus === 'loading'
                  ? 'Connecting…'
                  : 'API offline'}
            </div>
          </div>
          <button className="btn-secondary logout-btn" type="button" onClick={logout}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
