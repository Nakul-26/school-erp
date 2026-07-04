import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Bus, Plus, Search, Calendar, User, Phone, 
  MapPin, DollarSign, Edit, Trash2, ShieldCheck, 
  UserCheck, IndianRupee, Layers 
} from 'lucide-react';

interface RouteType {
  id: string;
  route_name: string;
  start_location: string;
  end_location: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  monthly_charge: number;
}

interface AllocationType {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  course_name: string;
  section_name: string;
  route_id: string;
  route_name: string;
  vehicle_number: string;
  monthly_charge: number;
  pickup_point: string;
  created_at: string;
}

export default function Transport() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'routes' | 'allocations' | 'billing'>('routes');
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [allocations, setAllocations] = useState<AllocationType[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteType | null>(null);

  // Forms
  const [routeForm, setRouteForm] = useState({
    route_name: '',
    start_location: '',
    end_location: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    monthly_charge: 0
  });

  const [assignForm, setAssignForm] = useState({
    student_id: '',
    route_id: '',
    pickup_point: ''
  });

  const [billingForm, setBillingForm] = useState({
    billing_month_name: '',
    due_date: ''
  });

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
      const routesData = await api.get('/transport/routes');
      setRoutes(routesData);

      const allocData = await api.get('/transport/allocations');
      setAllocations(allocData);

      if (canManage) {
        const studentsData = await api.get('/students');
        setStudents(studentsData);
      }
    } catch (err) {
      console.error('Error fetching transport data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.route_name || routeForm.monthly_charge === undefined) {
      showToast('Route name and monthly charge are required', 'error'); return;
    }

    try {
      setSubmitting(true);
      if (editingRoute) {
        await api.put(`/transport/routes/${editingRoute.id}`, routeForm);
        showToast('Route updated successfully');
      } else {
        await api.post('/transport/routes', routeForm);
        showToast('Route added successfully');
      }
      setShowRouteModal(false);
      setEditingRoute(null);
      setRouteForm({
        route_name: '',
        start_location: '',
        end_location: '',
        vehicle_number: '',
        driver_name: '',
        driver_phone: '',
        monthly_charge: 0
      });
      fetchData();
    } catch (err) {
      showToast('Error saving route details', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.student_id || !assignForm.route_id) {
      showToast('Student and Route selection are required', 'error'); return;
    }

    try {
      setSubmitting(true);
      await api.post('/transport/allocations', assignForm);
      showToast('Student assigned to route successfully');
      setShowAssignModal(false);
      setAssignForm({ student_id: '', route_id: '', pickup_point: '' });
      fetchData();
    } catch (err) {
      showToast('Error assigning student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from transport service?')) return;
    try {
      await api.delete(`/transport/allocations/${studentId}`);
      showToast('Student removed from transport service');
      fetchData();
    } catch (err) {
      showToast('Error unassigning student', 'error');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route? Active student assignments will be preserved but the route itself will be hidden.')) return;
    try {
      await api.delete(`/transport/routes/${id}`);
      fetchData();
    } catch (err) {
      showToast('Error deleting route', 'error');
    }
  };

  const handleGenerateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.billing_month_name || !billingForm.due_date) {
      showToast('Billing Month and Due Date are required', 'error'); return;
    }

    if (!confirm(`Generate transport fees for all assigned students for "${billingForm.billing_month_name}"? This will add fee invoices directly to the outstanding ledgers.`)) return;

    try {
      setSubmitting(true);
      const res = await api.post('/transport/billing/generate', billingForm);
      showToast(res.message || 'Billing generated successfully.');
      setBillingForm({ billing_month_name: '', due_date: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to generate billing.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoutes = routes.filter(r => 
    r.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.start_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.end_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.driver_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllocations = allocations.filter(a => 
    a.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.admission_number.includes(searchQuery) ||
    a.route_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <PageGuidance
        title="Transport Services"
        description="Define bus routes, assign students to vehicles, and bill transport subscription fees monthly."
        steps={["Create transport routes detailing driver phone numbers, vehicles, and charges.","Assign students to specific route stops and pickup points.","Use the Billing tab to generate monthly transport dues directly to the outstanding fees ledger."]}
      />

      <div className="page-header">
        <div>
          <h2>Transport &amp; Bus Routes</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Managing transit vehicles, driver allocations, passenger tracking, and ledger billing
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setShowAssignModal(true)}>
              <UserCheck size={16} /> Assign Student
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingRoute(null); setRouteForm({ route_name: '', start_location: '', end_location: '', vehicle_number: '', driver_name: '', driver_phone: '', monthly_charge: 0 }); setShowRouteModal(true); }}>
              <Plus size={16} /> Add Bus Route
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`page-tab ${activeTab === 'routes' ? 'active' : ''}`} onClick={() => { setActiveTab('routes'); setSearchQuery(''); }}>
          Transit Routes
        </button>
        <button className={`page-tab ${activeTab === 'allocations' ? 'active' : ''}`} onClick={() => { setActiveTab('allocations'); setSearchQuery(''); }}>
          Student Passenger List
        </button>
        {canManage && (
          <button className={`page-tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSearchQuery(''); }}>
            Generate Billing
          </button>
        )}
      </div>

      {/* Toolbar / Search */}
      {activeTab !== 'billing' && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={activeTab === 'routes' ? "Search by route name, driver, stops or vehicle number..." : "Search by student name, admission number or route stop..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem', width: '100%', marginBottom: 0 }}
            />
          </div>
        </div>
      )}

      {loading ? <p>Loading transport details...</p> : (
        <>
          {activeTab === 'routes' && (
            // Route List Grid
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
              {filteredRoutes.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
                  <Bus size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <h3 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>No Routes Found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>There are no transit routes matching your criteria.</p>
                </div>
              ) : (
                filteredRoutes.map(route => (
                  <div key={route.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', gap: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                          🚌 Bus Route
                        </span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          ₹{route.monthly_charge.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/mo</span>
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.75rem', color: 'var(--text-main)' }}>
                        {route.route_name}
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span><strong>Path:</strong> {route.start_location || 'Start'} ➔ {route.end_location || 'End'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <ShieldCheck size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <span><strong>Vehicle:</strong> {route.vehicle_number || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <User size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                          <span><strong>Driver:</strong> {route.driver_name || 'N/A'}</span>
                        </div>
                        {route.driver_phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Phone size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />
                            <span><strong>Phone:</strong> {route.driver_phone}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                          <span>Capacity</span>
                          <span style={{ fontWeight: 700 }}>{(route as any).allocated_count || 0} / {(route as any).capacity || (route as any).vehicle_capacity || '?'} seats</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            borderRadius: '999px',
                            width: `${Math.min(100, (((route as any).allocated_count || 0) / ((route as any).capacity || (route as any).vehicle_capacity || 1)) * 100)}%`,
                            background: (((route as any).allocated_count || 0) / ((route as any).capacity || (route as any).vehicle_capacity || 1)) > 0.8
                              ? '#ef4444' : (((route as any).allocated_count || 0) / ((route as any).capacity || (route as any).vehicle_capacity || 1)) > 0.5
                              ? '#f59e0b' : '#10b981',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                          onClick={() => {
                            setEditingRoute(route);
                            setRouteForm({
                              route_name: route.route_name,
                              start_location: route.start_location,
                              end_location: route.end_location,
                              vehicle_number: route.vehicle_number,
                              driver_name: route.driver_name,
                              driver_phone: route.driver_phone,
                              monthly_charge: route.monthly_charge
                            });
                            setShowRouteModal(true);
                          }}
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => handleDeleteRoute(route.id)}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'allocations' && (
            // Passenger allocations table
            <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Active Passengers</h3>
              {filteredAllocations.length === 0 ? (
                <p className="no-data" style={{ padding: '3rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No student allocations found.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Student Passenger</th>
                        <th>Program / Section</th>
                        <th>Assigned Bus Route</th>
                        <th>Pickup Point stop</th>
                        <th>Vehicle Number</th>
                        <th style={{ textAlign: 'right' }}>Monthly Rate</th>
                        {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllocations.map(alloc => (
                        <tr key={alloc.id}>
                          <td>
                            <strong>{alloc.student_name}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Admission No: {alloc.admission_number}</div>
                          </td>
                          <td>
                            {alloc.course_name || '-'}
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Section: {alloc.section_name || 'Unassigned'}</div>
                          </td>
                          <td><strong>{alloc.route_name}</strong></td>
                          <td>{alloc.pickup_point || 'Standard Terminus'}</td>
                          <td>{alloc.vehicle_number || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                            ₹{alloc.monthly_charge.toLocaleString('en-IN')}
                          </td>
                          {canManage && (
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                                onClick={() => handleUnassignStudent(alloc.student_id)}
                              >
                                Remove
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
            // Generate Monthly billing invoices form
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IndianRupee style={{ color: 'var(--primary)' }} /> Monthly Subscription Billing Generator
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                  This tool processes all active student bus route assignments. It automatically generates a <strong>"Transport Fee - [Month Year]"</strong> invoice directly into each passenger's outstanding ledger. Duplicate billing runs for the same month are automatically blocked.
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
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      This will append as the fee ledger descriptor: e.g. "Transport Fee - August 2026".
                    </small>
                  </div>

                  <div className="form-group" style={{ marginTop: '1.25rem' }}>
                    <label>Payment Due Date</label>
                    <input
                      type="date"
                      value={billingForm.due_date}
                      onChange={(e) => setBillingForm({ ...billingForm, due_date: e.target.value })}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                    disabled={submitting}
                  >
                    {submitting ? 'Generating Ledgers...' : 'Generate Transport Billing Run'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h3>{editingRoute ? 'Edit Route Details' : 'Add New Bus Route'}</h3>
            <form onSubmit={handleRouteSubmit}>
              <div className="form-group">
                <label>Route Name</label>
                <input
                  type="text"
                  placeholder="e.g. Route 12 - Airport Road Line"
                  value={routeForm.route_name}
                  onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Start Location Stop</label>
                  <input
                    type="text"
                    placeholder="e.g. School Campus"
                    value={routeForm.start_location}
                    onChange={(e) => setRouteForm({ ...routeForm, start_location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Destination Terminus</label>
                  <input
                    type="text"
                    placeholder="e.g. Airport Cross"
                    value={routeForm.end_location}
                    onChange={(e) => setRouteForm({ ...routeForm, end_location: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Bus Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-PQ-9876"
                    value={routeForm.vehicle_number}
                    onChange={(e) => setRouteForm({ ...routeForm, vehicle_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Monthly Dues Subscription Charge (₹)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500"
                    value={routeForm.monthly_charge}
                    onChange={(e) => setRouteForm({ ...routeForm, monthly_charge: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={routeForm.driver_name}
                    onChange={(e) => setRouteForm({ ...routeForm, driver_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Driver Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={routeForm.driver_phone}
                    onChange={(e) => setRouteForm({ ...routeForm, driver_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowRouteModal(false); setEditingRoute(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Assign Student to Bus Route</h3>
            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label>Select Student passenger</label>
                <select
                  value={assignForm.student_id}
                  onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Admission: {s.admission_number})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Transport Route</label>
                <select
                  value={assignForm.route_id}
                  onChange={(e) => setAssignForm({ ...assignForm, route_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Route --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.route_name} (₹{r.monthly_charge}/mo)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Pickup Stop Point Stop Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sector-3 Corner Stop"
                  value={assignForm.pickup_point}
                  onChange={(e) => setAssignForm({ ...assignForm, pickup_point: e.target.value })}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  Assign Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast notifications managed globally */}
    </Layout>
  );
}
