import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import MenuItems from './MenuItems'
import './AdminPanel.css'
import Messages from './Messages'
import Orders from './Orders'
import Admins from './admins'

type Tab = 'menu-items' | 'messages' | 'orders' | 'create-admin'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'create-admin', label: 'Create Admin', icon: '➕' },
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
    let isMounted = true

    const validateAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        if (isMounted) {
          setAuthorized(false)
          setChecking(false)
          navigate('/')
        }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!isMounted) return

      if (profile?.role === 'super_admin') {
        setAuthorized(true)
      } else {
        setAuthorized(false)
        navigate('/')
      }

      setChecking(false)
    }

    void validateAdminAccess()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthorized(false)
        setChecking(false)
        navigate('/')
        return
      }

      void validateAdminAccess()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
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
        {activeTab === 'create-admin' && <Admins />}
        {activeTab === 'menu-items' && <MenuItems />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'messages' && <Messages />}
      </main>
    </div>
  )
}
