import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import MenuItems from './MenuItems'
import './AdminPanel.css'
import Messages from './Messages'
import Orders from './Orders'

type Tab = 'menu-items' | 'messages' | 'orders'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'menu-items', label: 'Menu Items', icon: '🍽️' },
  { id: 'orders', label: 'Orders', icon: '🧾' },
  { id: 'messages', label: 'Messages', icon: '✉️' },
]

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('menu-items')
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthorized(true)
      } else {
        navigate('/')
      }
      setChecking(false)
    })
  }, [navigate])

  if (checking) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-spinner" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon">☕</span>
          <span className="admin-brand-name">Admin</span>
        </div>

        <nav className="admin-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <button className="admin-back-btn" onClick={() => navigate('/')}>
          ← Back to Site
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="admin-main">
        {activeTab === 'menu-items' && <MenuItems />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'messages' && <Messages />}
      </main>
    </div>
  )
}
