import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import './Navbar.css'
import AuthModal from './AuthModal'
import { supabase } from '../lib/supabase'
import { AiOutlineMenuUnfold } from "react-icons/ai";
import { useLanguage } from '../lib/language'
import type { Session } from '@supabase/supabase-js'
import { canAccessKitchen as isKitchenRole } from '../lib/kitchenWorkflow'

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [canAccessKitchen, setCanAccessKitchen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    let generation = 0
    let timer: number | undefined

    const syncUserSession = async (session: Session | null) => {
      const current = ++generation
      if (session?.user) {
        const displayName = session.user.user_metadata?.name || session.user.email || 'User'
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!isMounted || current !== generation) return
        if (error) console.error('Failed to retrieve user role:', error)

        setUserName(displayName)
        setCanAccessAdmin(profile?.role === 'admin' || profile?.role === 'super_admin')
        setCanAccessKitchen(isKitchenRole(profile?.role))
      } else {
        if (!isMounted) return
        setUserName(null)
        setCanAccessAdmin(false)
        setCanAccessKitchen(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncUserSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      generation++
      setCanAccessAdmin(false)
      setCanAccessKitchen(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { void syncUserSession(session) }, 0)
    })

    return () => {
      isMounted = false
      generation++
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserName(null)
    setCanAccessAdmin(false)
    setCanAccessKitchen(false)
  }

  return (
    <>
      <nav className="navbar">
        <button
          type="button"
          className="nav-menu-toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <AiOutlineMenuUnfold aria-hidden="true" />
        </button>

        <NavLink to="/" className="nav-logo" aria-label="Taste of Ceylon home">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <span className="logo-name">Taste of Ceylon</span>
        </NavLink>

        <div id="site-navigation" className={`nav-tabs ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/our-cafe" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Our Restaurant
          </NavLink>
          <NavLink to="/menu" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Menu
          </NavLink>
          {userName && (
            <NavLink to="/my-orders" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              My Orders
            </NavLink>
          )}
          <NavLink to="/contact" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Contact
          </NavLink>
          <NavLink to="/our-legacy" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Our Philosophy
          </NavLink>
        </div>

        <div className="nav-auth">
          <label className="nav-language">
            <span className="visually-hidden">{t('Language', 'Limba')}</span>
            <select aria-label={t('Language', 'Limba')} value={language} onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'ro')}>
              <option value="ro">RO</option>
              <option value="en">EN</option>
            </select>
          </label>
          {userName ? (
            <>
              <span className="nav-user-name">{userName}</span>
              {(canAccessAdmin || canAccessKitchen) && (
                <button className="nav-btn-admin" onClick={() => navigate('/admin')}>{canAccessAdmin ? 'Admin' : t('Kitchen', 'Bucătărie')}</button>
              )}
              <button className="nav-btn-signout" onClick={handleSignOut}>Sign Out</button>
            </>
          ) : (
            <>
              <button className="nav-btn-login" onClick={() => setAuthMode('login')}>Log In</button>
              <button className="nav-btn-signup" onClick={() => setAuthMode('signup')}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(name) => setUserName(name)}
        />
      )}
    </>
  )
}
