import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Search, Shield, UserCog, Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  roles: string[];
  role?: string;
  is_active: number;
  phone?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    roles: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        api.get('/users'),
        api.get('/roles')
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setForm({
      name: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      roles: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      phone: user.phone || '',
      roles: user.roles || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user
        const updateData = {
          name: form.name,
          phone: form.phone,
          roles: form.roles,
        };
        await api.put(`/users/${editingUser.id}`, updateData);
      } else {
        // Create user
        await api.post('/users', form);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error processing request');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>User Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage organization users, assign roles, and configure system access.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="card filters">
        <div className="search-container">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search users by name, username, or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading users...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {user.roles && user.roles.map(r => (
                        <span key={r} className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Shield size={10} /> {r}
                        </span>
                      ))}
                      {(!user.roles || user.roles.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Roles</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleOpenEdit(user)}>
                        <Edit size={12} /> Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)} disabled={user.email === 'admin@oxford.edu'}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <UserCog size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>{editingUser ? 'Edit User Roles & Details' : 'Add New User'}</h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    placeholder="e.g. John Doe"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    value={form.username} 
                    onChange={e => setForm({...form, username: e.target.value})} 
                    placeholder="e.g. johndoe"
                    disabled={!!editingUser}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                    placeholder="e.g. john@oxford.edu"
                    disabled={!!editingUser}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number (Optional)</label>
                  <input 
                    type="text" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                    placeholder="e.g. 555-0199"
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Initial Password</label>
                  <input 
                    type="password" 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                    placeholder="Enter login password"
                    required 
                  />
                </div>
              )}

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Assigned Roles (Select Multiple)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {roles.map(role => (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={form.roles.includes(role.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(f => ({ ...f, roles: [...f.roles, role.name] }));
                          } else {
                            setForm(f => ({ ...f, roles: f.roles.filter(r => r !== role.name) }));
                          }
                        }}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
