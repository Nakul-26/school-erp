import './Assets.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Edit2, Package, IndianRupee, MapPin, Wrench, Calendar } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

interface Asset {
  id: string;
  name: string;
  category: string;
  quantity: number;
  assigned_to: string | null;
  room: string | null;
  condition: 'Good' | 'Needs Repair' | 'Damaged' | 'Disposed';
  purchase_date: string | null;
  value: number | null;
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: 'Furniture',
    quantity: 1,
    assigned_to: '',
    room: '',
    condition: 'Good' as 'Good' | 'Needs Repair' | 'Damaged' | 'Disposed',
    purchase_date: '',
    value: '',
  });

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await api.get('/assets');
      setAssets(data);
    } catch (err) {
      console.error('Error fetching school assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return alert('Name and Category are required.');

    try {
      setSaving(true);
      await api.post('/assets', {
        ...form,
        quantity: Number(form.quantity),
        value: form.value ? Number(form.value) : undefined,
      });
      setShowAddModal(false);
      resetForm();
      alert('Asset added successfully.');
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to add asset.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    if (!form.name || !form.category) return alert('Name and Category are required.');

    try {
      setSaving(true);
      await api.put(`/assets/${editingAsset.id}`, {
        ...form,
        quantity: Number(form.quantity),
        value: form.value ? Number(form.value) : undefined,
      });
      setEditingAsset(null);
      resetForm();
      alert('Asset details updated.');
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to update asset.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to dispose or delete this asset?')) return;
    try {
      await api.delete(`/assets/${id}`);
      alert('Asset removed.');
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete asset.');
    }
  };

  const handleEditClick = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      category: asset.category,
      quantity: asset.quantity,
      assigned_to: asset.assigned_to || '',
      room: asset.room || '',
      condition: asset.condition,
      purchase_date: asset.purchase_date || '',
      value: asset.value ? String(asset.value) : '',
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      category: 'Furniture',
      quantity: 1,
      assigned_to: '',
      room: '',
      condition: 'Good',
      purchase_date: '',
      value: '',
    });
  };

  const getConditionColor = (cond: string) => {
    const c = cond.toLowerCase();
    if (c === 'good') return { bg: '#e6fffa', color: '#0f766e' };
    if (c === 'needs repair') return { bg: '#fff7ed', color: '#c2410c' };
    if (c === 'damaged') return { bg: '#fff5f5', color: '#c53030' };
    return { bg: '#f1f5f9', color: '#475569' }; // Disposed
  };

  return (
    <Layout>
      <PageGuidance
        title="Assets & Inventory"
        description="Inventory ledger for school property tracking (computers, desks, smartboards, laboratory equipment)."
        steps={[
          'Create asset logs for school equipment, electronics, and furnishings.',
          'Update room locations or staff custody assignments.',
          'Mark broken items as damaged or in repair to update conditions.'
        ]}
      />

      <div className="page-header">
        <div>
          <h2>School Asset Directory</h2>
          <p className="assets-text-1">
            Track room locations, conditions, and acquisition values
          </p>
        </div>
        <button className="btn btn-primary assets-btn" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <Plus size={18} /> Add New Asset
        </button>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={5} cols={7} />
        ) : assets.length === 0 ? (
          <EmptyState
            title="No Assets Registered"
            description="Start logging physical school assets, office furniture, or computer labs."
            icon={Package}
            action={{
              label: "Add New Asset",
              onClick: () => setShowAddModal(true)
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Location (Room)</th>
                  <th>Custody (Assigned To)</th>
                  <th>Condition</th>
                  <th>Value</th>
                  <th className="assets-th-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => {
                  const condStyle = getConditionColor(a.condition);
                  return (
                    <tr key={a.id}>
                      <td><strong>{a.name}</strong></td>
                      <td>
                        <span className="badge badge-secondary">{a.category}</span>
                      </td>
                      <td><strong>{a.quantity}</strong></td>
                      <td>
                        <div className="assets-row-4">
                          <MapPin size={12} className="assets-MapPin-5"  />
                          <span>{a.room || '—'}</span>
                        </div>
                      </td>
                      <td>{a.assigned_to || 'General Custody'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: condStyle.bg,
                          color: condStyle.color
                        }}>
                          {a.condition}
                        </span>
                      </td>
                      <td className="assets-td-6">
                        {a.value ? `₹${a.value.toLocaleString()}` : '—'}
                      </td>
                      <td className="assets-td-7">
                        <div className="assets-row-8">
                          <button className="btn btn-sm btn-outline assets-btn" onClick={() => handleEditClick(a)}>
                            <Edit2 size={12} /> Edit
                          </button>
                          <button className="btn btn-sm btn-outline btn-danger assets-btn" onClick={() => handleDelete(a.id)}>
                            <Trash2 size={12} /> Dispose
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content assets-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log New Property Asset</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body assets-modal-body">
                <div className="assets-modal-section-title">
                  <Package size={15} /> Asset Identification
                </div>
                <div className="form-group assets-form-group">
                  <label>Asset Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Dell Inspiron Computer, Wooden Lecture Desk"
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option>Furniture</option>
                    <option>Electronics</option>
                    <option>Lab Equipment</option>
                    <option>Books / Library</option>
                    <option>Sports Equipment</option>
                    <option>Office Assets</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </div>

                <div className="assets-modal-section-title">
                  <MapPin size={15} /> Placement & Condition
                </div>
                <div className="form-group">
                  <label>Room / Location</label>
                  <input
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                    placeholder="e.g. Physics Lab, Room 204"
                  />
                </div>
                <div className="form-group">
                  <label>Assigned Custodian</label>
                  <input
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    placeholder="e.g. Lab Asst. Suresh"
                  />
                </div>
                <div className="form-group assets-form-group">
                  <label>Condition *</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm(f => ({ ...f, condition: e.target.value as any }))}
                  >
                    <option>Good</option>
                    <option>Needs Repair</option>
                    <option>Damaged</option>
                    <option>Disposed</option>
                  </select>
                </div>

                <div className="assets-modal-section-title">
                  <IndianRupee size={15} /> Procurement & Valuation
                </div>
                <div className="form-group">
                  <label>Purchase Price (Value in ₹)</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="e.g. 15000"
                  />
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="modal-overlay" onClick={() => setEditingAsset(null)}>
          <div className="modal-content assets-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Asset Details</h3>
              <button className="modal-close" onClick={() => setEditingAsset(null)}>×</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body assets-modal-body">
                <div className="assets-modal-section-title">
                  <Package size={15} /> Asset Identification
                </div>
                <div className="form-group assets-form-group">
                  <label>Asset Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option>Furniture</option>
                    <option>Electronics</option>
                    <option>Lab Equipment</option>
                    <option>Books / Library</option>
                    <option>Sports Equipment</option>
                    <option>Office Assets</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </div>

                <div className="assets-modal-section-title">
                  <MapPin size={15} /> Placement & Condition
                </div>
                <div className="form-group">
                  <label>Room / Location</label>
                  <input
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Assigned Custodian</label>
                  <input
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  />
                </div>
                <div className="form-group assets-form-group">
                  <label>Condition *</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm(f => ({ ...f, condition: e.target.value as any }))}
                  >
                    <option>Good</option>
                    <option>Needs Repair</option>
                    <option>Damaged</option>
                    <option>Disposed</option>
                  </select>
                </div>

                <div className="assets-modal-section-title">
                  <IndianRupee size={15} /> Procurement & Valuation
                </div>
                <div className="form-group">
                  <label>Purchase Price (Value in ₹)</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingAsset(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
