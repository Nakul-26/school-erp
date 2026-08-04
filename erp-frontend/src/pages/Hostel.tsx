import './Hostel.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Building2, Plus, Search, User, Phone, MapPin,
  Edit, Trash2, UserCheck, IndianRupee, BedDouble, LogOut,
} from 'lucide-react';

interface BlockType {
  id: string;
  name: string;
  block_type: 'BOYS' | 'GIRLS' | 'CO_ED';
  warden_name: string | null;
  warden_phone: string | null;
  address: string | null;
}

interface RoomType {
  id: string;
  block_id: string;
  block_name: string;
  room_number: string;
  floor: string | null;
  capacity: number;
  room_type: 'SINGLE' | 'SHARED' | 'DORM';
  monthly_charge: number;
  occupied_count: number;
}

interface AllocationType {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  room_id: string;
  room_number: string;
  block_name: string;
  monthly_charge: number;
  bed_label: string | null;
  allocated_date: string;
}

export default function Hostel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'blocks' | 'rooms' | 'allocations' | 'billing'>('blocks');
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [allocations, setAllocations] = useState<AllocationType[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockType | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);

  const [blockForm, setBlockForm] = useState({
    name: '', block_type: 'CO_ED', warden_name: '', warden_phone: '', address: '',
  });

  const [roomForm, setRoomForm] = useState({
    block_id: '', room_number: '', floor: '', capacity: 1, room_type: 'SHARED', monthly_charge: 0,
  });

  const [allocateForm, setAllocateForm] = useState({ student_id: '', room_id: '', bed_label: '' });

  const [billingForm, setBillingForm] = useState({ billing_month_name: '', due_date: '' });

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canManage = userRoles.some(r =>
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Accountant', 'accountant'].includes(r)
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [blocksData, roomsData, allocData] = await Promise.all([
        api.get('/hostel/blocks'),
        api.get('/hostel/rooms'),
        api.get('/hostel/allocations'),
      ]);
      setBlocks(blocksData);
      setRooms(roomsData);
      setAllocations(allocData);

      if (canManage) {
        const studentsData = await api.get('/students');
        setStudents(studentsData);
      }
    } catch (err) {
      console.error('Error fetching hostel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetBlockForm = () => setBlockForm({ name: '', block_type: 'CO_ED', warden_name: '', warden_phone: '', address: '' });
  const resetRoomForm = () => setRoomForm({ block_id: '', room_number: '', floor: '', capacity: 1, room_type: 'SHARED', monthly_charge: 0 });

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.name) { showToast('Block name is required', 'error'); return; }
    try {
      setSubmitting(true);
      if (editingBlock) await api.put(`/hostel/blocks/${editingBlock.id}`, blockForm);
      else await api.post('/hostel/blocks', blockForm);
      showToast(editingBlock ? 'Block updated successfully' : 'Block added successfully');
      setShowBlockModal(false);
      setEditingBlock(null);
      resetBlockForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error saving block details', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.block_id || !roomForm.room_number) { showToast('Block and room number are required', 'error'); return; }
    try {
      setSubmitting(true);
      if (editingRoom) await api.put(`/hostel/rooms/${editingRoom.id}`, roomForm);
      else await api.post('/hostel/rooms', roomForm);
      showToast(editingRoom ? 'Room updated successfully' : 'Room added successfully');
      setShowRoomModal(false);
      setEditingRoom(null);
      resetRoomForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error saving room details', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateForm.student_id || !allocateForm.room_id) { showToast('Student and room selection are required', 'error'); return; }
    try {
      setSubmitting(true);
      await api.post('/hostel/allocations', allocateForm);
      showToast('Student allocated to room successfully');
      setShowAllocateModal(false);
      setAllocateForm({ student_id: '', room_id: '', bed_label: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error allocating room', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVacate = async (id: string) => {
    if (!confirm('Vacate this student from their hostel room?')) return;
    try {
      await api.post(`/hostel/allocations/${id}/vacate`, {});
      showToast('Allocation vacated');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error vacating allocation', 'error');
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Delete this hostel block? Rooms under it will remain but hidden from new allocation.')) return;
    try {
      await api.delete(`/hostel/blocks/${id}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting block', 'error');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    try {
      await api.delete(`/hostel/rooms/${id}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting room', 'error');
    }
  };

  const handleGenerateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.billing_month_name || !billingForm.due_date) { showToast('Billing month and due date are required', 'error'); return; }
    if (!confirm(`Generate hostel fees for all occupied rooms for "${billingForm.billing_month_name}"? This will add fee invoices directly to the outstanding ledgers.`)) return;
    try {
      setSubmitting(true);
      const res = await api.post('/hostel/billing/generate', billingForm);
      showToast(res.message || 'Billing generated successfully.');
      setBillingForm({ billing_month_name: '', due_date: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to generate billing.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBlocks = blocks.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.warden_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(r =>
    r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.block_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllocations = allocations.filter(a =>
    a.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.admission_number.includes(searchQuery) ||
    a.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roomsWithVacancy = rooms.filter(r => r.occupied_count < r.capacity);

  return (
    <Layout>
      <PageGuidance
        title="Hostel & Dormitory Management"
        description="Set up hostel blocks and rooms, allocate students to beds, and bill hostel fees monthly."
        steps={["Create hostel blocks with a warden and block type.", "Add rooms to each block with a bed capacity and monthly charge.", "Allocate students to rooms and use the Billing tab to generate monthly dues."]}
      />

      <div className="page-header">
        <div>
          <h2>Hostel &amp; Dormitory</h2>
          <p className="hostel-text-1">
            Manage residential blocks, room capacity, student allocations, and hostel fee billing
          </p>
        </div>
        {canManage && (
          <div className="hostel-row-2">
            <button className="btn btn-outline" onClick={() => setShowAllocateModal(true)}>
              <UserCheck size={16} /> Allocate Student
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingBlock(null); resetBlockForm(); setShowBlockModal(true); }}>
              <Plus size={16} /> Add Block
            </button>
          </div>
        )}
      </div>

      <div className="page-tabs hostel-page-tabs">
        <button className={`page-tab ${activeTab === 'blocks' ? 'active' : ''}`} onClick={() => { setActiveTab('blocks'); setSearchQuery(''); }}>
          Blocks ({blocks.length})
        </button>
        <button className={`page-tab ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => { setActiveTab('rooms'); setSearchQuery(''); }}>
          Rooms ({rooms.length})
        </button>
        <button className={`page-tab ${activeTab === 'allocations' ? 'active' : ''}`} onClick={() => { setActiveTab('allocations'); setSearchQuery(''); }}>
          Student Allocations ({allocations.length})
        </button>
        {canManage && (
          <button className={`page-tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSearchQuery(''); }}>
            Generate Billing
          </button>
        )}
      </div>

      {activeTab !== 'billing' && (
        <div className="card hostel-card">
          <div className="hostel-div-5">
            <Search size={16} className="hostel-Search-6" />
            <input
              type="text"
              placeholder="Search by name, warden, room number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hostel-input-7"
            />
          </div>
        </div>
      )}

      {loading ? <p>Loading hostel details...</p> : (
        <>
          {activeTab === 'blocks' && (
            <div className="hostel-grid-8">
              {filteredBlocks.length === 0 ? (
                <div className="card hostel-card">
                  <Building2 size={48} className="hostel-Building2-10" />
                  <h3 className="hostel-title-11">No Blocks Found</h3>
                  <p className="hostel-text-12">There are no hostel blocks matching your criteria.</p>
                </div>
              ) : (
                filteredBlocks.map(block => (
                  <div key={block.id} className="card hostel-card">
                    <div>
                      <div className="hostel-row-14">
                        <span className="badge hostel-badge">{block.block_type.replace('_', '-')}</span>
                        <span className="hostel-span-16">{rooms.filter(r => r.block_id === block.id).length} rooms</span>
                      </div>
                      <h3 className="hostel-title-18">{block.name}</h3>
                      <div className="hostel-col-19">
                        {block.warden_name && (
                          <div className="hostel-row-20">
                            <User size={14} className="hostel-User-25" />
                            <span><strong>Warden:</strong> {block.warden_name}</span>
                          </div>
                        )}
                        {block.warden_phone && (
                          <div className="hostel-row-22">
                            <Phone size={14} className="hostel-Phone-27" />
                            <span><strong>Phone:</strong> {block.warden_phone}</span>
                          </div>
                        )}
                        {block.address && (
                          <div className="hostel-row-24">
                            <MapPin size={14} className="hostel-MapPin-21" />
                            <span>{block.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="hostel-row-32">
                        <button className="btn btn-outline hostel-btn" onClick={() => { setEditingBlock(block); setBlockForm({ name: block.name, block_type: block.block_type, warden_name: block.warden_name || '', warden_phone: block.warden_phone || '', address: block.address || '' }); setShowBlockModal(true); }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button className="btn btn-outline hostel-btn" onClick={() => handleDeleteBlock(block.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="hostel-grid-8">
              {filteredRooms.length === 0 ? (
                <div className="card hostel-card">
                  <BedDouble size={48} className="hostel-Building2-10" />
                  <h3 className="hostel-title-11">No Rooms Found</h3>
                  <p className="hostel-text-12">
                    {blocks.length === 0 ? 'Add a hostel block first, then add rooms to it.' : 'There are no rooms matching your criteria.'}
                  </p>
                </div>
              ) : (
                filteredRooms.map(room => {
                  const pct = Math.min(100, (room.occupied_count / room.capacity) * 100);
                  return (
                    <div key={room.id} className="card hostel-card">
                      <div>
                        <div className="hostel-row-14">
                          <span className="badge hostel-badge">{room.block_name}</span>
                          <span className="hostel-span-16">₹{room.monthly_charge.toLocaleString('en-IN')}<span className="hostel-span-17">/mo</span></span>
                        </div>
                        <h3 className="hostel-title-18">Room {room.room_number}</h3>
                        <div className="hostel-col-19">
                          <div className="hostel-row-20"><span><strong>Type:</strong> {room.room_type}</span></div>
                          {room.floor && <div className="hostel-row-22"><span><strong>Floor:</strong> {room.floor}</span></div>}
                        </div>
                        <div className="hostel-div-28">
                          <div className="hostel-row-29">
                            <span>Occupancy</span>
                            <span className="hostel-span-30">{room.occupied_count} / {room.capacity} beds</span>
                          </div>
                          <div className="hostel-div-31">
                            <div style={{
                              height: '100%', borderRadius: '999px', width: `${pct}%`,
                              background: pct >= 100 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <div className="hostel-row-32">
                          <button className="btn btn-outline hostel-btn" onClick={() => { setEditingRoom(room); setRoomForm({ block_id: room.block_id, room_number: room.room_number, floor: room.floor || '', capacity: room.capacity, room_type: room.room_type, monthly_charge: room.monthly_charge }); setShowRoomModal(true); }}>
                            <Edit size={14} /> Edit
                          </button>
                          <button className="btn btn-outline hostel-btn" onClick={() => handleDeleteRoom(room.id)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {canManage && blocks.length > 0 && (
                <div className="card hostel-card hostel-add-room-card" onClick={() => { setEditingRoom(null); resetRoomForm(); setShowRoomModal(true); }}>
                  <Plus size={32} />
                  <span>Add Room</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'allocations' && (
            <div className="card hostel-card">
              <h3 className="hostel-title-36">Active Hostel Allocations</h3>
              {filteredAllocations.length === 0 ? (
                <p className="no-data hostel-no-data">No student allocations found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table hostel-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Block / Room</th>
                        <th>Bed</th>
                        <th>Allocated Since</th>
                        <th className="hostel-th-39">Monthly Rate</th>
                        {canManage && <th className="hostel-th-40">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllocations.map(alloc => (
                        <tr key={alloc.id}>
                          <td>
                            <strong>{alloc.student_name}</strong>
                            <div className="hostel-div-41">Admission No: {alloc.admission_number}</div>
                          </td>
                          <td><strong>{alloc.block_name}</strong> — Room {alloc.room_number}</td>
                          <td>{alloc.bed_label || '-'}</td>
                          <td>{new Date(alloc.allocated_date).toLocaleDateString()}</td>
                          <td className="hostel-td-43">₹{alloc.monthly_charge.toLocaleString('en-IN')}</td>
                          {canManage && (
                            <td className="hostel-td-44">
                              <button className="btn btn-outline hostel-btn" onClick={() => handleVacate(alloc.id)}>
                                <LogOut size={12} /> Vacate
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && canManage && (
            <div className="hostel-div-46">
              <div className="card hostel-card">
                <h3 className="hostel-row-48">
                  <IndianRupee className="hostel-IndianRupee-49" /> Monthly Hostel Billing Generator
                </h3>
                <p className="hostel-text-50">
                  This tool processes all active hostel room allocations. It automatically generates a <strong>"Hostel Fee - [Month Year]"</strong> invoice directly into each student's outstanding ledger. Duplicate billing runs for the same month are automatically blocked.
                </p>
                <form onSubmit={handleGenerateBilling}>
                  <div className="form-group">
                    <label>Billing Month Name</label>
                    <input
                      type="text"
                      placeholder="e.g. August 2026"
                      value={billingForm.billing_month_name}
                      onChange={(e) => setBillingForm({ ...billingForm, billing_month_name: e.target.value })}
                      required
                    />
                    <small className="hostel-small-51">This will appear as the fee ledger descriptor: e.g. "Hostel Fee - August 2026".</small>
                  </div>
                  <div className="form-group hostel-form-group">
                    <label>Payment Due Date</label>
                    <input type="date" value={billingForm.due_date} onChange={(e) => setBillingForm({ ...billingForm, due_date: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn btn-primary hostel-btn" disabled={submitting}>
                    {submitting ? 'Generating Ledgers...' : 'Generate Hostel Billing Run'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="modal">
          <div className="modal-content hostel-modal-content">
            <h3>{editingBlock ? 'Edit Block Details' : 'Add Hostel Block'}</h3>
            <form onSubmit={handleBlockSubmit}>
              <div className="form-group">
                <label>Block Name</label>
                <input type="text" placeholder="e.g. Block A - North Wing" value={blockForm.name} onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Block Type</label>
                <select value={blockForm.block_type} onChange={(e) => setBlockForm({ ...blockForm, block_type: e.target.value })}>
                  <option value="CO_ED">Co-ed</option>
                  <option value="BOYS">Boys</option>
                  <option value="GIRLS">Girls</option>
                </select>
              </div>
              <div className="hostel-grid-55">
                <div className="form-group">
                  <label>Warden Name</label>
                  <input type="text" placeholder="e.g. Mrs. Sharma" value={blockForm.warden_name} onChange={(e) => setBlockForm({ ...blockForm, warden_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Warden Phone</label>
                  <input type="text" placeholder="e.g. 9876543210" value={blockForm.warden_phone} onChange={(e) => setBlockForm({ ...blockForm, warden_phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Address (Optional)</label>
                <input type="text" placeholder="e.g. Behind Main Campus, Gate 2" value={blockForm.address} onChange={(e) => setBlockForm({ ...blockForm, address: e.target.value })} />
              </div>
              <div className="modal-actions hostel-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowBlockModal(false); setEditingBlock(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{editingBlock ? 'Update Block' : 'Create Block'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="modal">
          <div className="modal-content hostel-modal-content">
            <h3>{editingRoom ? 'Edit Room Details' : 'Add Room'}</h3>
            <form onSubmit={handleRoomSubmit}>
              <div className="form-group">
                <label>Hostel Block</label>
                <select value={roomForm.block_id} onChange={(e) => setRoomForm({ ...roomForm, block_id: e.target.value })} required disabled={!!editingRoom}>
                  <option value="">-- Choose Block --</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="hostel-grid-55">
                <div className="form-group">
                  <label>Room Number</label>
                  <input type="text" placeholder="e.g. 101" value={roomForm.room_number} onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Floor (Optional)</label>
                  <input type="text" placeholder="e.g. 1st Floor" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} />
                </div>
              </div>
              <div className="hostel-grid-56">
                <div className="form-group">
                  <label>Room Type</label>
                  <select value={roomForm.room_type} onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}>
                    <option value="SINGLE">Single</option>
                    <option value="SHARED">Shared</option>
                    <option value="DORM">Dormitory</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Bed Capacity</label>
                  <input type="number" min={1} value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Monthly Charge (₹)</label>
                <input type="number" min={0} placeholder="e.g. 4500" value={roomForm.monthly_charge} onChange={(e) => setRoomForm({ ...roomForm, monthly_charge: Number(e.target.value) })} required />
              </div>
              <div className="modal-actions hostel-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowRoomModal(false); setEditingRoom(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{editingRoom ? 'Update Room' : 'Create Room'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Modal */}
      {showAllocateModal && (
        <div className="modal">
          <div className="modal-content hostel-modal-content">
            <h3>Allocate Student to Hostel Room</h3>
            <form onSubmit={handleAllocateSubmit}>
              <div className="form-group">
                <label>Select Student</label>
                <select value={allocateForm.student_id} onChange={(e) => setAllocateForm({ ...allocateForm, student_id: e.target.value })} required>
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Admission: {s.admission_number})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Select Room (with vacancy)</label>
                <select value={allocateForm.room_id} onChange={(e) => setAllocateForm({ ...allocateForm, room_id: e.target.value })} required>
                  <option value="">-- Choose Room --</option>
                  {roomsWithVacancy.map(r => (
                    <option key={r.id} value={r.id}>{r.block_name} — Room {r.room_number} ({r.occupied_count}/{r.capacity} occupied, ₹{r.monthly_charge}/mo)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Bed Label (Optional)</label>
                <input type="text" placeholder="e.g. Bed A" value={allocateForm.bed_label} onChange={(e) => setAllocateForm({ ...allocateForm, bed_label: e.target.value })} />
              </div>
              <div className="modal-actions hostel-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Allocate Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast notifications managed globally */}
    </Layout>
  );
}
