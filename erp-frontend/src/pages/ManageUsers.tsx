import './ManageUsers.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import {
  Plus, Search, Shield, UserCog, Edit, Trash2, Fingerprint, KeyRound,
  AlertTriangle, Copy, Users, Lock, Settings2
} from 'lucide-react';

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
  permissions?: string[];
  permissionCount?: number;
  userCount?: number;
  isSystem?: boolean;
}

interface Permission {
  id: string;
  code: string;
  description?: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [userViewMode, setUserViewMode] = useState<'table' | 'cards'>('table');
  const [roleViewMode, setRoleViewMode] = useState<'cards' | 'rows'>('cards');
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [assignRoleTarget, setAssignRoleTarget] = useState<Role | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [assignSelectedUsers, setAssignSelectedUsers] = useState<Record<string, boolean>>({});
  const systemRoleNames = ['super admin', 'principal', 'teacher', 'student', 'parent'];

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    roles: [] as string[]
  });

  const [roleDraftName, setRoleDraftName] = useState('');
  const [roleDraftDescription, setRoleDraftDescription] = useState('');
  const [roleDraftPermissions, setRoleDraftPermissions] = useState<string[]>([]);
  const [roleDraftSourceId, setRoleDraftSourceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, '');
  const isSystemRole = (roleName: string) => systemRoleNames.includes(roleName.trim().toLowerCase());
  const totalPermissionCount = permissions.length;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData, permissionsData, matrixData] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
        api.get('/roles/permissions'),
        api.get('/roles/matrix')
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPermissions(permissionsData);
      setRoleMatrix(matrixData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleDraftSourceId(null);
    setRoleDraftName('');
    setRoleDraftDescription('');
    setRoleDraftPermissions([]);
    setShowRoleModal(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleDraftSourceId(role.id);
    setRoleDraftName(role.name);
    setRoleDraftDescription(role.description || '');
    setRoleDraftPermissions(role.permissions || []);
    setShowRoleModal(true);
  };

  const openDuplicateRole = (role: Role) => {
    setEditingRole(null);
    setRoleDraftSourceId(role.id);
    setRoleDraftName(`${role.name} Copy`);
    setRoleDraftDescription(role.description || '');
    setRoleDraftPermissions(role.permissions || []);
    setShowRoleModal(true);
  };

  const openAssignUsers = (role: Role) => {
    setAssignRoleTarget(role);
    const selected: Record<string, boolean> = {};
    users.forEach((user) => {
      selected[user.id] = (user.roles || []).some((assignedRole) => normalize(assignedRole) === normalize(role.name));
    });
    setAssignSelectedUsers(selected);
    setAssignSearch('');
    setShowAssignModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRole(true);
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, {
          name: roleDraftName,
          description: roleDraftDescription,
        });
        await api.put(`/roles/${editingRole.id}/permissions`, { permissionCodes: roleDraftPermissions });
      } else if (roleDraftSourceId) {
        await api.post(`/roles/${roleDraftSourceId}/duplicate`, {
          name: roleDraftName,
          description: roleDraftDescription,
        });
      } else {
        await api.post('/roles', {
          name: roleDraftName,
          description: roleDraftDescription,
          permissionCodes: roleDraftPermissions,
        });
      }
      setShowRoleModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (isSystemRole(role.name)) return;
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting role');
    }
  };

  const handleSaveAssignments = async () => {
    if (!assignRoleTarget) return;
    try {
      setSavingAssignments(true);
      const targets = users.filter(user => assignSelectedUsers[user.id]);
      await Promise.all(targets.map(async (user) => {
        const currentRoles = user.roles || [];
        const nextRoles = currentRoles.some(r => normalize(r) === normalize(assignRoleTarget.name))
          ? currentRoles
          : [...currentRoles, assignRoleTarget.name];
        await api.put(`/users/${user.id}`, {
          name: user.name,
          phone: user.phone || '',
          roles: nextRoles,
        });
      }));
      setShowAssignModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign users');
    } finally {
      setSavingAssignments(false);
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
        await api.put(`/users/${editingUser.id}`, {
          name: form.name,
          phone: form.phone,
          roles: form.roles,
        });
      } else {
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

  const filteredRoles = roleMatrix.filter(role =>
    role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
    (role.description || '').toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <Layout>
      <PageGuidance
        title="Access Control"
        description="Use this page to manage user accounts, edit role templates, duplicate roles, and review the permission model that powers the ERP."
        steps={[
          'Click "Create Role" to add a custom role template.',
          'Use Edit Permissions to tune a role without changing the code.',
          'Assign Users to apply a role to one or more users.'
        ]}
      />

      <div className="page-header">
        <div>
          <h2>Access Control</h2>
          <p className="manage-users-text-1">
            Manage organization users, role templates, and the enterprise permission model.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={openCreateRole}>
            <Settings2 size={18} /> Create Role
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
            <Fingerprint size={14} /> Roles
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.35rem' }}>{roles.length}</div>
        </div>
        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
            <KeyRound size={14} /> Permissions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.35rem' }}>{permissions.length}</div>
        </div>
        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
            <Shield size={14} /> Users
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.35rem' }}>{users.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Role Permission Templates</h3>
            <p className="manage-users-text-1" style={{ margin: 0 }}>
              System roles can keep their names locked while permissions remain editable.
            </p>
          </div>
          <div style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
            <button className="btn btn-secondary" style={{ borderRadius: 0 }} onClick={() => setRoleViewMode('cards')}>Cards</button>
            <button className="btn btn-secondary" style={{ borderRadius: 0 }} onClick={() => setRoleViewMode('rows')}>Rows</button>
          </div>
        </div>
        <div className="card filters" style={{ marginBottom: '1rem' }}>
          <div className="search-container">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search roles by name or description..."
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
            />
          </div>
        </div>

        {roleViewMode === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredRoles.map(role => (
              <div key={role.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-card)', minHeight: 'fit-content', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      {role.name}
                      {role.isSystem && <span className="badge badge-secondary"><Lock size={10} /> System</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{role.description || 'Role template'}</div>
                  </div>
                  <span className="badge badge-secondary">{role.permissionCount || 0} / {totalPermissionCount} permissions</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingBottom: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
                  {Array.from(new Set(role.permissions || [])).map(permission => (
                    <span key={permission} className="badge badge-secondary manage-users-badge">{permission}</span>
                  ))}
                  {(role.permissions || []).length === 0 && <span className="manage-users-span-4">No permissions assigned</span>}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.9rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div className="manage-users-row-5" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.45rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => openEditRole(role)}>
                        <Edit size={12} /> Edit Permissions
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => openDuplicateRole(role)}>
                        <Copy size={12} /> Duplicate Role
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => openAssignUsers(role)}>
                        <Users size={12} /> Assign Users
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRole(role)} disabled={role.isSystem}>
                        <Trash2 size={12} /> Delete Role
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-shell manage-users-table-shell">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Permissions</th>
                  <th>Users</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map(role => (
                  <tr key={role.id}>
                    <td>
                      <strong>{role.name}</strong>
                      <div className="manage-users-span-4">{role.description || 'Role template'}</div>
                    </td>
                    <td>{role.isSystem ? <span className="badge badge-secondary"><Lock size={10} /> System</span> : <span className="badge badge-success">Custom</span>}</td>
                    <td>{role.permissionCount || 0} / {totalPermissionCount}</td>
                    <td>{role.userCount || 0}</td>
                    <td>
                      <div className="manage-users-row-5" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEditRole(role)}><Edit size={12} /> Edit</button>
                        <button className="btn btn-sm btn-outline" onClick={() => openDuplicateRole(role)}><Copy size={12} /> Duplicate</button>
                        <button className="btn btn-sm btn-outline" onClick={() => openAssignUsers(role)}><Users size={12} /> Assign</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRole(role)} disabled={role.isSystem}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRoles.length === 0 && <tr><td colSpan={5} className="manage-users-td-6">No roles found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
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
        <div style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.75rem' }}>
          <button className="btn btn-secondary" style={{ borderRadius: 0 }} onClick={() => setUserViewMode('table')}>Table</button>
          <button className="btn btn-secondary" style={{ borderRadius: 0 }} onClick={() => setUserViewMode('cards')}>Cards</button>
        </div>
      </div>

      <div className="card manage-users-table-shell">
        {loading ? <p>Loading users...</p> : userViewMode === 'table' ? (
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
                    <div className="manage-users-row-2">
                      {user.roles && user.roles.length > 0 ? user.roles.map(r => (
                        <span key={r} className="badge badge-secondary manage-users-badge"><Shield size={10} /> {r}</span>
                      )) : (
                        <span className="badge badge-warning manage-users-badge"><AlertTriangle size={10} /> Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="manage-users-row-5">
                      <button className="btn btn-sm btn-outline" onClick={() => handleOpenEdit(user)}><Edit size={12} /> Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)} disabled={user.email === 'admin@oxford.edu'}><Trash2 size={12} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={6} className="manage-users-td-6">No users found.</td></tr>}
            </tbody>
          </table>
        ) : (
          <div className="manage-users-user-cards">
            {filteredUsers.map(user => (
              <div key={user.id} className="manage-users-user-card">
                <div className="manage-users-user-card-top">
                  <div>
                    <div className="manage-users-user-card-name">{user.name}</div>
                    <div className="manage-users-user-card-meta">{user.username} · {user.email}</div>
                  </div>
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="manage-users-row-2" style={{ marginTop: '0.75rem' }}>
                  {user.roles && user.roles.length > 0 ? user.roles.map(r => (
                    <span key={r} className="badge badge-secondary manage-users-badge"><Shield size={10} /> {r}</span>
                  )) : (
                    <span className="badge badge-warning manage-users-badge"><AlertTriangle size={10} /> Unassigned</span>
                  )}
                </div>
                <div className="manage-users-row-5" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => handleOpenEdit(user)}><Edit size={12} /> Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)} disabled={user.email === 'admin@oxford.edu'}><Trash2 size={12} /> Delete</button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="manage-users-empty-state">No users found.</div>}
          </div>
        )}
      </div>

      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content manage-users-modal-content manage-users-role-modal">
            <div className="manage-users-row-8">
              <Settings2 size={24} className="manage-users-UserCog-9" />
              <h3 className="manage-users-title-10">{editingRole ? 'Edit Role Template' : roleDraftSourceId ? 'Duplicate Role Template' : 'Create Role Template'}</h3>
            </div>

            <form onSubmit={handleSaveRole}>
              <div className="form-group">
                <label>Role Name</label>
                <input value={roleDraftName} onChange={(e) => setRoleDraftName(e.target.value)} disabled={!!editingRole && !!editingRole.isSystem} required />
                {editingRole?.isSystem && <p className="manage-users-span-4">System role names are locked.</p>}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={roleDraftDescription} onChange={(e) => setRoleDraftDescription(e.target.value)} rows={3} />
              </div>
              <div className="form-group manage-users-form-group">
                <label className="manage-users-label-14">Permissions</label>
                <div className="manage-users-grid-15 manage-users-permissions-grid">
                  {permissions.map(permission => (
                    <label key={permission.id} className="manage-users-row-16">
                      <input
                        type="checkbox"
                        checked={roleDraftPermissions.includes(permission.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRoleDraftPermissions(prev => [...prev, permission.code]);
                          } else {
                            setRoleDraftPermissions(prev => prev.filter(code => code !== permission.code));
                          }
                        }}
                      />
                      <span>
                        <strong>{permission.code}</strong>
                        <span className="manage-users-permission-desc">{permission.description || 'Permission'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRoleModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingRole}>{savingRole ? 'Saving...' : 'Save Role'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && assignRoleTarget && (
        <div className="modal-overlay">
          <div className="modal-content manage-users-modal-content manage-users-assign-modal">
            <div className="manage-users-row-8">
              <Users size={24} className="manage-users-UserCog-9" />
              <h3 className="manage-users-title-10">Assign Users to {assignRoleTarget.name}</h3>
            </div>
            <div className="card filters" style={{ marginBottom: '0.75rem' }}>
              <div className="search-container">
                <Search size={18} />
                <input type="text" placeholder="Search users..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
              </div>
            </div>
            <div className="manage-users-assign-list">
              {users.filter(user =>
                user.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                user.email.toLowerCase().includes(assignSearch.toLowerCase()) ||
                user.username.toLowerCase().includes(assignSearch.toLowerCase())
              ).map(user => (
                <label key={user.id} className="manage-users-assign-item">
                  <input
                    type="checkbox"
                    checked={!!assignSelectedUsers[user.id]}
                    onChange={(e) => setAssignSelectedUsers(prev => ({ ...prev, [user.id]: e.target.checked }))}
                  />
                  <span>
                    <strong>{user.name}</strong>
                    <span className="manage-users-permission-desc">{user.email}</span>
                  </span>
                  <span className="manage-users-span-4">{(user.roles || []).join(', ') || 'Unassigned'}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAssignments} disabled={savingAssignments}>{savingAssignments ? 'Assigning...' : 'Assign Role'}</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content manage-users-modal-content">
            <div className="manage-users-row-8">
              <UserCog size={24} className="manage-users-UserCog-9" />
              <h3 className="manage-users-title-10">{editingUser ? 'Edit User Roles & Details' : 'Add New User'}</h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="manage-users-grid-11">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" required />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="e.g. johndoe" disabled={!!editingUser} required />
                </div>
              </div>

              <div className="manage-users-grid-12">
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="e.g. john@oxford.edu" disabled={!!editingUser} required />
                </div>
                <div className="form-group">
                  <label>Phone Number (Optional)</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="e.g. 555-0199" />
                </div>
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Initial Password</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter login password" required />
                </div>
              )}

              <div className="form-group manage-users-form-group">
                <label className="manage-users-label-14">Assigned Roles (Select Multiple)</label>
                <div className="manage-users-grid-15">
                  {roles.map(role => (
                    <label key={role.id} className="manage-users-row-16">
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
