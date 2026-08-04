import './Canteen.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  UtensilsCrossed, Plus, Search, Edit, Trash2, IndianRupee, XCircle,
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: number;
}

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  meal_types: string;
}

interface Subscription {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  meal_plan_id: string;
  plan_name: string;
  monthly_price: number;
  start_date: string;
}

export default function Canteen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu' | 'plans' | 'subscriptions' | 'billing'>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);

  const [menuForm, setMenuForm] = useState({ name: '', category: 'General', price: 0, is_available: true });
  const [planForm, setPlanForm] = useState({ name: '', description: '', monthly_price: 0, meal_types: 'Lunch' });
  const [subscribeForm, setSubscribeForm] = useState({ student_id: '', meal_plan_id: '' });
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
      const [menuData, plansData, subsData] = await Promise.all([
        api.get('/canteen/menu'),
        api.get('/canteen/plans'),
        api.get('/canteen/subscriptions'),
      ]);
      setMenuItems(menuData);
      setMealPlans(plansData);
      setSubscriptions(subsData);

      if (canManage) {
        const studentsData = await api.get('/students');
        setStudents(studentsData);
      }
    } catch (err) {
      console.error('Error fetching canteen data:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetMenuForm = () => setMenuForm({ name: '', category: 'General', price: 0, is_available: true });
  const resetPlanForm = () => setPlanForm({ name: '', description: '', monthly_price: 0, meal_types: 'Lunch' });

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.name) { showToast('Item name is required', 'error'); return; }
    try {
      setSubmitting(true);
      if (editingMenuItem) await api.put(`/canteen/menu/${editingMenuItem.id}`, menuForm);
      else await api.post('/canteen/menu', menuForm);
      showToast(editingMenuItem ? 'Menu item updated' : 'Menu item added');
      setShowMenuModal(false);
      setEditingMenuItem(null);
      resetMenuForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error saving menu item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name) { showToast('Plan name is required', 'error'); return; }
    try {
      setSubmitting(true);
      if (editingPlan) await api.put(`/canteen/plans/${editingPlan.id}`, planForm);
      else await api.post('/canteen/plans', planForm);
      showToast(editingPlan ? 'Meal plan updated' : 'Meal plan added');
      setShowPlanModal(false);
      setEditingPlan(null);
      resetPlanForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error saving meal plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeForm.student_id || !subscribeForm.meal_plan_id) { showToast('Student and meal plan are required', 'error'); return; }
    try {
      setSubmitting(true);
      await api.post('/canteen/subscriptions', subscribeForm);
      showToast('Student subscribed to meal plan');
      setShowSubscribeModal(false);
      setSubscribeForm({ student_id: '', meal_plan_id: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error subscribing student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async (id: string) => {
    if (!confirm('Cancel this canteen subscription?')) return;
    try {
      await api.post(`/canteen/subscriptions/${id}/cancel`, {});
      showToast('Subscription cancelled');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error cancelling subscription', 'error');
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/canteen/menu/${id}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting menu item', 'error');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this meal plan?')) return;
    try {
      await api.delete(`/canteen/plans/${id}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting meal plan', 'error');
    }
  };

  const handleGenerateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.billing_month_name || !billingForm.due_date) { showToast('Billing month and due date are required', 'error'); return; }
    if (!confirm(`Generate canteen fees for all active subscriptions for "${billingForm.billing_month_name}"?`)) return;
    try {
      setSubmitting(true);
      const res = await api.post('/canteen/billing/generate', billingForm);
      showToast(res.message || 'Billing generated successfully.');
      setBillingForm({ billing_month_name: '', due_date: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to generate billing.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenu = menuItems.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPlans = mealPlans.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSubs = subscriptions.filter(s =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.admission_number.includes(searchQuery)
  );

  return (
    <Layout>
      <PageGuidance
        title="Canteen & Meal Plans"
        description="Manage the canteen menu, set up subscription-based meal plans, and enroll students. Bill monthly like transport/hostel."
        steps={["Add menu items under the Menu tab.", "Create subscription meal plans with a monthly price.", "Subscribe students to a plan, then use Billing to generate monthly dues."]}
      />

      <div className="page-header">
        <div>
          <h2>Canteen &amp; Meal Plans</h2>
          <p className="canteen-text-1">Manage menu items, meal plan subscriptions, and canteen fee billing</p>
        </div>
        {canManage && (
          <div className="canteen-row-2">
            <button className="btn btn-outline" onClick={() => setShowSubscribeModal(true)}>
              <Plus size={16} /> Subscribe Student
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingMenuItem(null); resetMenuForm(); setShowMenuModal(true); }}>
              <Plus size={16} /> Add Menu Item
            </button>
          </div>
        )}
      </div>

      <div className="page-tabs canteen-page-tabs">
        <button className={`page-tab ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => { setActiveTab('menu'); setSearchQuery(''); }}>
          Menu ({menuItems.length})
        </button>
        <button className={`page-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => { setActiveTab('plans'); setSearchQuery(''); }}>
          Meal Plans ({mealPlans.length})
        </button>
        <button className={`page-tab ${activeTab === 'subscriptions' ? 'active' : ''}`} onClick={() => { setActiveTab('subscriptions'); setSearchQuery(''); }}>
          Subscriptions ({subscriptions.length})
        </button>
        {canManage && (
          <button className={`page-tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSearchQuery(''); }}>
            Generate Billing
          </button>
        )}
      </div>

      {activeTab !== 'billing' && (
        <div className="card canteen-card">
          <div className="canteen-div-5">
            <Search size={16} className="canteen-Search-6" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="canteen-input-7"
            />
          </div>
        </div>
      )}

      {loading ? <p>Loading canteen details...</p> : (
        <>
          {activeTab === 'menu' && (
            <div className="card canteen-card-full">
              {filteredMenu.length === 0 ? (
                <p className="no-data canteen-no-data">No menu items found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th className="canteen-th-right">Price</th>
                        <th>Available</th>
                        {canManage && <th className="canteen-th-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMenu.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.name}</strong></td>
                          <td><span className="badge canteen-badge">{item.category}</span></td>
                          <td className="canteen-th-right">₹{item.price.toLocaleString('en-IN')}</td>
                          <td>{item.is_available ? 'Yes' : 'No'}</td>
                          {canManage && (
                            <td className="canteen-th-center">
                              <button className="btn btn-outline canteen-btn" onClick={() => { setEditingMenuItem(item); setMenuForm({ name: item.name, category: item.category, price: item.price, is_available: !!item.is_available }); setShowMenuModal(true); }}>
                                <Edit size={12} />
                              </button>
                              <button className="btn btn-outline canteen-btn" onClick={() => handleDeleteMenuItem(item.id)}>
                                <Trash2 size={12} />
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

          {activeTab === 'plans' && (
            <div className="canteen-grid-8">
              {filteredPlans.length === 0 ? (
                <div className="card canteen-card">
                  <UtensilsCrossed size={48} className="canteen-icon-muted" />
                  <h3 className="canteen-title-11">No Meal Plans Found</h3>
                  <p className="canteen-text-12">Create a subscription-based meal plan to get started.</p>
                </div>
              ) : (
                filteredPlans.map(plan => (
                  <div key={plan.id} className="card canteen-plan-card">
                    <div>
                      <div className="canteen-row-14">
                        <span className="badge canteen-badge">{plan.meal_types}</span>
                        <span className="canteen-span-16">₹{plan.monthly_price.toLocaleString('en-IN')}<span className="canteen-span-17">/mo</span></span>
                      </div>
                      <h3 className="canteen-title-18">{plan.name}</h3>
                      {plan.description && <p className="canteen-text-12">{plan.description}</p>}
                    </div>
                    {canManage && (
                      <div className="canteen-row-32">
                        <button className="btn btn-outline canteen-btn" onClick={() => { setEditingPlan(plan); setPlanForm({ name: plan.name, description: plan.description || '', monthly_price: plan.monthly_price, meal_types: plan.meal_types }); setShowPlanModal(true); }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button className="btn btn-outline canteen-btn" onClick={() => handleDeletePlan(plan.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {canManage && (
                <div className="card canteen-plan-card canteen-add-card" onClick={() => { setEditingPlan(null); resetPlanForm(); setShowPlanModal(true); }}>
                  <Plus size={32} />
                  <span>Add Meal Plan</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="card canteen-card-full">
              {filteredSubs.length === 0 ? (
                <p className="no-data canteen-no-data">No active subscriptions found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Meal Plan</th>
                        <th>Since</th>
                        <th className="canteen-th-right">Monthly Rate</th>
                        {canManage && <th className="canteen-th-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map(sub => (
                        <tr key={sub.id}>
                          <td>
                            <strong>{sub.student_name}</strong>
                            <div className="canteen-div-41">Admission No: {sub.admission_number}</div>
                          </td>
                          <td>{sub.plan_name}</td>
                          <td>{new Date(sub.start_date).toLocaleDateString()}</td>
                          <td className="canteen-th-right">₹{sub.monthly_price.toLocaleString('en-IN')}</td>
                          {canManage && (
                            <td className="canteen-th-center">
                              <button className="btn btn-outline canteen-btn" onClick={() => handleCancelSubscription(sub.id)}>
                                <XCircle size={12} /> Cancel
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
            <div className="canteen-div-46">
              <div className="card canteen-card">
                <h3 className="canteen-row-48">
                  <IndianRupee className="canteen-IndianRupee-49" /> Monthly Canteen Billing Generator
                </h3>
                <p className="canteen-text-50">
                  Processes all active canteen subscriptions and generates a <strong>"Canteen Fee - [Month Year]"</strong> invoice directly into each student's outstanding ledger. Duplicate billing runs for the same month are automatically blocked.
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
                  </div>
                  <div className="form-group canteen-form-group">
                    <label>Payment Due Date</label>
                    <input type="date" value={billingForm.due_date} onChange={(e) => setBillingForm({ ...billingForm, due_date: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn btn-primary canteen-btn-wide" disabled={submitting}>
                    {submitting ? 'Generating Ledgers...' : 'Generate Canteen Billing Run'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Menu Item Modal */}
      {showMenuModal && (
        <div className="modal">
          <div className="modal-content canteen-modal-content">
            <h3>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
            <form onSubmit={handleMenuSubmit}>
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" placeholder="e.g. Veg Thali" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required />
              </div>
              <div className="canteen-grid-55">
                <div className="form-group">
                  <label>Category</label>
                  <select value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Beverages">Beverages</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input type="number" min={0} value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="canteen-checkbox-label">
                  <input type="checkbox" checked={menuForm.is_available} onChange={(e) => setMenuForm({ ...menuForm, is_available: e.target.checked })} />
                  Currently Available
                </label>
              </div>
              <div className="modal-actions canteen-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowMenuModal(false); setEditingMenuItem(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{editingMenuItem ? 'Update Item' : 'Create Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meal Plan Modal */}
      {showPlanModal && (
        <div className="modal">
          <div className="modal-content canteen-modal-content">
            <h3>{editingPlan ? 'Edit Meal Plan' : 'Add Meal Plan'}</h3>
            <form onSubmit={handlePlanSubmit}>
              <div className="form-group">
                <label>Plan Name</label>
                <input type="text" placeholder="e.g. Standard Monthly Lunch Plan" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input type="text" placeholder="e.g. Lunch on all working days" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
              </div>
              <div className="canteen-grid-55">
                <div className="form-group">
                  <label>Meal Types Covered</label>
                  <input type="text" placeholder="e.g. Lunch or Breakfast,Lunch" value={planForm.meal_types} onChange={(e) => setPlanForm({ ...planForm, meal_types: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Monthly Price (₹)</label>
                  <input type="number" min={0} value={planForm.monthly_price} onChange={(e) => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="modal-actions canteen-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{editingPlan ? 'Update Plan' : 'Create Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="modal">
          <div className="modal-content canteen-modal-content">
            <h3>Subscribe Student to Meal Plan</h3>
            <form onSubmit={handleSubscribeSubmit}>
              <div className="form-group">
                <label>Select Student</label>
                <select value={subscribeForm.student_id} onChange={(e) => setSubscribeForm({ ...subscribeForm, student_id: e.target.value })} required>
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Admission: {s.admission_number})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Select Meal Plan</label>
                <select value={subscribeForm.meal_plan_id} onChange={(e) => setSubscribeForm({ ...subscribeForm, meal_plan_id: e.target.value })} required>
                  <option value="">-- Choose Plan --</option>
                  {mealPlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.monthly_price}/mo)</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions canteen-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubscribeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Subscribe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
