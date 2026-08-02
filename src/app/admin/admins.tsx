import { useEffect, useState } from 'react';
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
    void fetchProfiles();
  }, []);

  async function makeAdmin(profile: Profile) {
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
        <div className="admins-table">
          <div className="admins-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Action</span>
          </div>

          {profiles
            .filter((profile) => {
              const kw = search.toLowerCase();
              return (
                (typeof profile.name === 'string' && profile.name.toLowerCase().includes(kw)) ||
                (typeof profile.email === 'string' && profile.email.toLowerCase().includes(kw)) ||
                (typeof profile.role === 'string' && profile.role.toLowerCase().includes(kw))
              );
            })
            .map((profile) => {
            const name = typeof profile.name === 'string' ? profile.name : 'No name';
            const email = typeof profile.email === 'string' ? profile.email : 'No email';
            const role = typeof profile.role === 'string' ? profile.role : 'user';

            return (
              <div key={profile.id as string} className="admins-table-row">
                <span>{name}</span>
                <span>{email}</span>
                <span>
                  <span className={`admins-role-badge ${role}`}>{role}</span>
                </span>
                <span>
                  <button
                    className="make-admin-btn"
                    onClick={() => void makeAdmin(profile)}
                    disabled={role === 'super_admin'}
                  >
                    {role === 'super_admin' ? 'Already Admin' : 'Make Super Admin'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}