import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Messages.css';

interface Profile {
  id: string;
  [key: string]: unknown;
}

export default function Admins() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function validateAccess() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (isMounted) {
          setAuthorized(false);
          setCheckingAccess(false);
          navigate('/');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profile?.role === 'super_admin') {
        setAuthorized(true);
      } else {
        setAuthorized(false);
        navigate('/');
      }

      setCheckingAccess(false);
    }

    void validateAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthorized(false);
        setCheckingAccess(false);
        navigate('/');
        return;
      }

      void validateAccess();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function fetchProfiles() {
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles((data ?? []) as Profile[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authorized) {
      return;
    }

    void fetchProfiles();
  }, [authorized]);

  async function makeAdmin(profile: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating role:', error);
    } else {
      await fetchProfiles();
    }
  }

  async function makeSuperAdmin(profile: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating role:', error);
    } else {
      await fetchProfiles();
    }
  }

  async function demoteToAdmin(profile: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', profile.id);

    if (error) {
      console.error('Error demoting to admin:', error);
    } else {
      await fetchProfiles();
    }
  }

  async function demoteToCustomer(profile: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', profile.id);

    if (error) {
      console.error('Error demoting to customer:', error);
    } else {
      await fetchProfiles();
    }
  }

  if (checkingAccess) {
    return <div className="loading">Checking access...</div>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Manage Admin</h2>
        <span className="admin-section-count">{profiles.length} Users</span>
      </div>

      <div className="admins-search">
        <input
          type="text"
          placeholder="Search by name, email or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : profiles.length === 0 ? (
        <div className="empty">No profiles found.</div>
      ) : (
        <>
          {(['super_admin', 'admin', 'customer'] as const).map((group) => {
            const filtered = profiles.filter((p) => {
              const role = typeof p.role === 'string' ? p.role : 'customer';
              if (role !== group) return false;
              const kw = search.toLowerCase();
              return (
                (typeof p.name === 'string' && p.name.toLowerCase().includes(kw)) ||
                (typeof p.email === 'string' && p.email.toLowerCase().includes(kw)) ||
                (typeof p.role === 'string' && p.role.toLowerCase().includes(kw))
              );
            });

            if (filtered.length === 0) return null;

            const groupLabel =
              group === 'super_admin' ? 'Super Admins' :
              group === 'admin' ? 'Admins' : 'Customers';

            return (
              <div key={group} className="admins-group">
                <div className="admins-group-divider">
                  <span className={`admins-group-label ${group}`}>{groupLabel}</span>
                  <span className="admins-group-count">{filtered.length}</span>
                </div>
                <div className="admins-table">
                  <div className="admins-table-head">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Action</span>
                  </div>
                  {filtered.map((profile) => {
                    const name = typeof profile.name === 'string' ? profile.name : 'No name';
                    const email = typeof profile.email === 'string' ? profile.email : 'No email';
                    const role = typeof profile.role === 'string' ? profile.role : 'customer';

                    return (
                      <div key={profile.id as string} className="admins-table-row">
                        <span>{name}</span>
                        <span>{email}</span>
                        <span>
                          <span className={`admins-role-badge ${role}`}>{role}</span>
                        </span>
                        <span className="admins-action-btns">
                          <button
                            className="make-admin-btn"
                            onClick={() => void makeAdmin(profile)}
                            disabled={role === 'admin' || role === 'super_admin'}
                          >
                            {role === 'admin' ? 'Admin ✓' : 'Make Admin'}
                          </button>
                          <button
                            className="make-admin-btn make-super-admin-btn"
                            onClick={() => void makeSuperAdmin(profile)}
                            disabled={role === 'super_admin'}
                          >
                            {role === 'super_admin' ? 'Super Admin ✓' : 'Make Super Admin'}
                          </button>
                          {role === 'super_admin' && (
                            <button
                              className="make-admin-btn demote-btn"
                              onClick={() => void demoteToAdmin(profile)}
                            >
                              ↓ Demote to Admin
                            </button>
                          )}
                          {role === 'admin' && (
                            <button
                              className="make-admin-btn demote-btn"
                              onClick={() => void demoteToCustomer(profile)}
                            >
                              ↓ Demote to Customer
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}