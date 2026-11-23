import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import MenuItems from './MenuItems'
import './AdminPanel.css'
import Messages from './Messages'
import Orders from './Orders'
import Admins from './admins'
import Dashboard from './dashboard'
import Kitchen from './Kitchen'
import { canAccessAdminTab, resolveAdminTab, type AdminRole, type AdminTab } from './access'
import { FaUser } from "react-icons/fa";
import { MdMenuBook } from "react-icons/md";
import { MdBorderColor } from "react-icons/md";
import { FaMessage } from "react-icons/fa6";
import { AiFillDashboard } from "react-icons/ai";
import { MdMenu } from "react-icons/md";
import { MdRestaurant } from 'react-icons/md'
import { useLanguage } from '../../lib/language'

const TABS: { id: AdminTab; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <AiFillDashboard /> },
  { id: 'create-admin', label: 'Create Admin', icon: <FaUser /> },
  { id: 'menu-items', label: 'Menu Items', icon: <MdMenuBook /> },
  { id: 'orders', label: 'Orders', icon: <MdBorderColor /> },
  { id: 'messages', label: 'Messages', icon: <FaMessage /> },
  { id: 'kitchen', label: 'Kitchen', icon: <MdRestaurant /> },
]

export default function AdminPanel() {
  const { language, setLanguage, t } = useLanguage()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    new URLSearchParams(location.search).get('tab') === 'kitchen' ? 'kitchen' : 'menu-items'
  )
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [role, setRole] = useState<AdminRole | null>(null)
  const [accessError, setAccessError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    let generation = 0
    let timer: number | undefined

    const validateAdminAccess = async () => {
      const current = ++generation
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!isMounted || current !== generation) return

      if (sessionError) {
        console.error('Failed to check admin session:', sessionError)
        setAccessError(true)
        setChecking(false)
        return
      }
      if (!session?.user) {
        if (isMounted) {
          setAuthorized(false)
          setChecking(false)
          navigate('/')
        }
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!isMounted || current !== generation) return
      if (userError || !user) {
        if (userError) console.error('Failed to verify admin user:', userError)
        setAccessError(true)
        setChecking(false)
        return
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted || current !== generation) return
      if (error) {
        console.error('Failed to verify admin role:', error)
        setAccessError(true)
        setChecking(false)
        return
      }

      if (profile?.role === 'kitchen' || profile?.role === 'admin' || profile?.role === 'super_admin') {
        setAuthorized(true)
        setRole(profile.role)
        setAccessError(false)
      } else {
        setAuthorized(false)
        setRole(null)
        navigate('/')
      }

      setChecking(false)
    }

    void validateAdminAccess()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      generation++
      setChecking(true)
      setAuthorized(false)
      setAccessError(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { void validateAdminAccess() }, 0)
    })

    return () => {
      isMounted = false
      generation++
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [navigate, attempt])

  if (checking) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-spinner" />
      </div>
    )
  }

  if (accessError) return <div className="admin-gate" role="alert">
    <p>{t('Could not verify access.', 'Accesul nu a putut fi verificat.')}{' '}
      <button type="button" onClick={() => { setAccessError(false); setChecking(true); setAttempt(value => value + 1) }}>{t('Retry', 'Reîncearcă')}</button>
    </p>
  </div>

  if (!authorized || !role) return null

  const visibleTabs = TABS.filter(tab => canAccessAdminTab(role, tab.id))
  const displayedTab = resolveAdminTab(role, activeTab)

  return (
    <div className="admin-layout">
      <button
        type="button"
        className="admin-menu-toggle"
        aria-label={menuOpen ? 'Close admin navigation' : 'Open admin navigation'}
        aria-expanded={menuOpen}
        aria-controls="admin-navigation"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <MdMenu aria-hidden="true" />
      </button>

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand">
        <img className="brand-mark" src="/favicon.svg" alt="" />
        <span className="admin-brand-name">Taste of Ceylon</span>
        </div>

        <nav id="admin-navigation" className="admin-nav">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-nav-item ${displayedTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id)
                setMenuOpen(false)
              }}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              <span>{tab.id === 'kitchen' ? t('Kitchen Dashboard', 'Panoul bucătăriei') : tab.id === 'orders' ? t('Orders', 'Comenzi') : tab.label}</span>
            </button>
          ))}
        </nav>

        <label className="admin-language">{t('Language', 'Limba')}
          <select value={language} onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'ro')}>
            <option value="ro">RO</option>
            <option value="en">EN</option>
          </select>
        </label>
        <button className="admin-back-btn" onClick={() => navigate('/')}>
          ← {t('Back to site', 'Înapoi la site')}
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="admin-main">
        {displayedTab === 'dashboard' && <Dashboard />}
        {displayedTab === 'create-admin' && <Admins />}
        {displayedTab === 'menu-items' && <MenuItems />}
        {displayedTab === 'orders' && <Orders />}
        {displayedTab === 'messages' && <Messages />}
        {displayedTab === 'kitchen' && <Kitchen />}
      </main>
    </div>
  )
}
