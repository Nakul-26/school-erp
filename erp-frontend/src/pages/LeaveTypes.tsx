import './LeaveTypes.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { BookOpen, Plus, Trash2, Edit, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyRole } from '../utils/accessControl';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
}

interface AcademicYear {
  id: string;
  name: string;
}

export default function LeaveTypes() {
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canManageLeaveTypes = hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal', 'HOD']);
  const canSeedLeaveBalances = hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal']);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDays, setFormDays] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  // Seed balances modal state
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedYearId, setSeedYearId] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [types, years] = await Promise.all([
        api.get('/leave/types'),
        api.get('/academic-years'),
      ]);
      setLeaveTypes(types);
      setAcademicYears(years);
    } catch (err) {
      console.error('Error fetching leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (!canManageLeaveTypes) {
      alert('You do not have permission to manage leave types.');
      return;
    }
    setEditingType(null);
    setFormName('');
    setFormCode('');
    setFormDays(10);
    setShowModal(true);
  };

  const openEditModal = (lt: LeaveType) => {
    if (!canManageLeaveTypes) {
      alert('You do not have permission to manage leave types.');
      return;
    }
    setEditingType(lt);
    setFormName(lt.name);
    setFormCode(lt.code);
    setFormDays(lt.days_per_year);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canManageLeaveTypes) {
      alert('You do not have permission to manage leave types.');
      return;
    }
    if (!formName.trim() || !formCode.trim() || !formDays) {
      alert('All fields are required.');
      return;
    }
    try {
      setSaving(true);
      if (editingType) {
        await api.put(`/leave/types/${editingType.id}`, { name: formName.trim(), days_per_year: formDays });
      } else {
        await api.post('/leave/types', { name: formName.trim(), code: formCode.trim().toUpperCase(), days_per_year: formDays });
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lt: LeaveType) => {
    if (!canManageLeaveTypes) {
      alert('You do not have permission to manage leave types.');
      return;
    }
    if (!window.confirm(`Delete leave type "${lt.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/leave/types/${lt.id}`);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete leave type');
    }
  };

  const handleSeedBalances = async () => {
    if (!canSeedLeaveBalances) {
      alert('You do not have permission to seed leave balances.');
      return;
    }
    if (!seedYearId) {
      alert('Please select an academic year.');
      return;
    }
    try {
      setSeeding(true);
      await api.post('/leave/balances/seed', { academic_year_id: seedYearId });
      alert('Leave balances seeded successfully for all teachers!');
      setShowSeedModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to seed balances');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Leave Types"
        description="Use this page to create different types of leave such as Sick Leave, Casual Leave, and Earned Leave. After creating the leave types, click **Give Leave Balance** to assign the yearly leave limit to all active teachers."
        steps={["Define different leave categories and their respective day counts.","Click Give Leave Balance to allocate yearly limits to active teachers.","Verify allocated quotas inside My Leave Applications."]}
      />
      <div className="page-header">
        <div>
          <h2><BookOpen size={22} className="leave-types-BookOpen-1"  />Leave Types</h2>
          <p className="leave-types-text-2">
            Manage leave categories and seed annual balances for all teaching staff.
          </p>
        </div>
        {(canSeedLeaveBalances || canManageLeaveTypes) && (
          <div className="leave-types-row-3">
            {canSeedLeaveBalances && (
              <button className="btn btn-outline" onClick={() => setShowSeedModal(true)}>
                <RefreshCw size={16} className="leave-types-RefreshCw-4"  />
                Give Leave Balance
              </button>
            )}
            {canManageLeaveTypes && (
              <button className="btn btn-primary" onClick={openAddModal}>
                <Plus size={16} className="leave-types-Plus-5"  />
                Add Leave Type
              </button>
            )}
          </div>
        )}
      </div>

      

      <div className="card">
        {loading ? (
          <p className="leave-types-text-6">Loading leave types…</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Days / Year</th>
                {canManageLeaveTypes && <th className="leave-types-th-7">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map((lt) => (
                <tr key={lt.id}>
                  <td><span className="badge leave-types-badge">{lt.code}</span></td>
                  <td><strong>{lt.name}</strong></td>
                  <td>{lt.days_per_year}</td>
                  {canManageLeaveTypes && (
                    <td>
                      <div className="leave-types-row-9">
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(lt)} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(lt)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {leaveTypes.length === 0 && (
                <tr>
                  <td colSpan={canManageLeaveTypes ? 4 : 3} className="leave-types-td-10">
                    <BookOpen size={32} className="leave-types-BookOpen-11"  />
                    No leave types defined yet. Click "Add Leave Type" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && canManageLeaveTypes && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Casual Leave"
                />
              </div>
              {!editingType && (
                <div className="form-group">
                  <label>Code * (unique shortcode)</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CL"
                    maxLength={10}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Days Per Year *</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={formDays}
                  onChange={(e) => setFormDays(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingType ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seed Balances Modal */}
      {showSeedModal && canSeedLeaveBalances && (
        <div className="modal-overlay" onClick={() => setShowSeedModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seed Leave Balances</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowSeedModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="leave-types-text-12">
                This will create leave balance entries for all active teachers for the selected academic year. Already existing balances will be skipped.
              </p>
              <div className="form-group">
                <label>Academic Year *</label>
                <select value={seedYearId} onChange={(e) => setSeedYearId(e.target.value)}>
                  <option value="">— Select Academic Year —</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowSeedModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSeedBalances} disabled={seeding}>
                {seeding ? 'Seeding…' : 'Seed Balances'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
