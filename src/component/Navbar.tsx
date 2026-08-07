import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import './Navbar.css'
import AuthModal from './AuthModal'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    const syncUserSession = async (session: any) => {
      if (session?.user) {
        const displayName = session.user.user_metadata?.name || session.user.email || 'User'
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!isMounted) return

        setUserName(displayName)
        setIsSuperAdmin(profile?.role === 'super_admin')
      } else {
        if (!isMounted) return
        setUserName(null)
        setIsSuperAdmin(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncUserSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUserSession(session)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserName(null)
    setIsSuperAdmin(false)
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo" onClick={() => navigate('/')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/')}>
          <div className="logo-circle">
            <span className="logo-icon">☕</span>
          </div>
          <span className="logo-name">Brewed Bliss</span>
        </div>

        <div className="nav-tabs">
          <NavLink to="/our-cafe" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Our Cafe
          </NavLink>
          <NavLink to="/menu" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Menu
          </NavLink>
          {userName && (
            <NavLink to="/my-orders" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              My Orders
            </NavLink>
          )}
          <NavLink to="/contact" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Contact
          </NavLink>
          <NavLink to="/our-legacy" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Our Legacy
          </NavLink>
        </div>

        <div className="nav-auth">
          {userName ? (
            <>
              <span className="nav-user-name">{userName}</span>
              {isSuperAdmin && (
                <button className="nav-btn-admin" onClick={() => navigate('/admin')}>Admin</button>
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
