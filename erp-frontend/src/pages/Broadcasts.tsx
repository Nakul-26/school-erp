import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RecipientBuilder, { type RecipientFilter } from '../components/RecipientBuilder';
import { 
  Radio, Plus, Trash2, Calendar, FileText, Download, CheckCircle, 
  AlertTriangle, Search, Info, Send, Clock, ChevronDown, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import './Broadcasts.css';

interface BroadcastAttachment {
  file_name: string;
  file_url: string;
  mime_type?: string;
  size_bytes?: number;
}

interface Broadcast {
  id: string;
  subject: string;
  body: string;
  category: string;
  priority: 'normal' | 'important' | 'urgent';
  recipient_type: string;
  recipient_filter: string;
  status: 'draft' | 'sent' | 'archived';
  channel?: string;
  sent_at: string | null;
  expires_at: string | null;
  total_recipients: number;
  read_count: number;
  is_read?: number;
  attachments?: BroadcastAttachment[];
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

export default function Broadcasts({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const { user } = useAuth();
  
  // Tab/Navigation within Broadcast Workspace
  const [activeSubTab, setActiveSubTab] = useState<'received' | 'compose' | 'history'>('received');
  
  // Received Broadcasts States
  const [receivedBroadcasts, setReceivedBroadcasts] = useState<Broadcast[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Compose Broadcast States
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({
    type: 'all',
    classIds: [],
    sectionIds: [],
    departmentIds: [],
    roles: [],
    userIds: [],
    includeStudents: true,
    includeParents: true,
    includeTeachers: false
  });
  const [attachments, setAttachments] = useState<BroadcastAttachment[]>([]);
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [sending, setSending] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[]>(['erp']);

  // Message Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Sent History States
  const [sentBroadcasts, setSentBroadcasts] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canCompose = userRoles.some(r => 
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Teacher', 'teacher'].includes(r)
  );

  useEffect(() => {
    fetchReceivedBroadcasts();
    if (canCompose) {
      fetchTemplates();
      fetchSentHistory();
      
      const comp = searchParams.get('compose');
      if (comp === 'true') {
        setActiveSubTab('compose');
      } else {
        setActiveSubTab('received');
      }
    } else {
      setActiveSubTab('received');
    }
  }, [searchParams]);

  const fetchReceivedBroadcasts = async () => {
    try {
      setLoadingReceived(true);
      const data = await api.get('/broadcasts/inbox');
      setReceivedBroadcasts(data || []);
    } catch (e) {
      console.error('Failed to load received broadcasts', e);
    } finally {
      setLoadingReceived(false);
    }
  };

  const fetchSentHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api.get('/broadcasts');
      setSentBroadcasts(data || []);
    } catch (e) {
      console.error('Failed to load sent history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await api.get('/message-templates');
      setTemplates(data || []);
      
      const tId = searchParams.get('templateId');
      if (tId && data) {
        const t = data.find((temp: any) => temp.id === tId);
        if (t) {
          setSubject(t.subject);
          setBody(t.body);
          setCategory(t.category);
          setSelectedTemplateId(tId);
        }
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  };

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const t = templates.find(temp => temp.id === templateId);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
      setCategory(t.category);
    }
  };

  const handleAddAttachment = () => {
    if (!attName.trim() || !attUrl.trim()) return;
    setAttachments([...attachments, { file_name: attName, file_url: attUrl }]);
    setAttName('');
    setAttUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleComposeSubmit = async (e: React.FormEvent, status: 'draft' | 'sent') => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      alert('Subject and Message Body are required.');
      return;
    }

    try {
      setSending(true);
      const payload = {
        subject,
        body,
        category,
        priority,
        recipient_type: recipientFilter.type,
        recipient_filter: JSON.stringify(recipientFilter),
        channel: channels.join(','),
        status,
        expires_at: hasExpiry && expiryDate ? new Date(expiryDate).toISOString() : null,
        attachments
      };

      if (editingDraftId) {
        await api.put(`/broadcasts/${editingDraftId}`, payload);
        alert(status === 'sent' ? 'Broadcast sent successfully!' : 'Draft updated successfully.');
      } else {
        await api.post('/broadcasts', payload);
        alert(status === 'sent' ? 'Broadcast sent successfully!' : 'Broadcast saved as draft.');
      }
      
      // Reset compose fields
      setSubject('');
      setBody('');
      setCategory('general');
      setPriority('normal');
      setRecipientFilter({
        type: 'all',
        classIds: [],
        sectionIds: [],
        departmentIds: [],
        roles: [],
        userIds: [],
        includeStudents: true,
        includeParents: true,
        includeTeachers: false
      });
      setAttachments([]);
      setHasExpiry(false);
      setExpiryDate('');
      setSelectedTemplateId('');
      setChannels(['erp']);
      setEditingDraftId(null);

      // Refresh Data
      fetchReceivedBroadcasts();
      fetchSentHistory();

      // Go to Tab
      setActiveSubTab(status === 'sent' ? 'history' : 'received');
    } catch (err) {
      alert('Failed to send/save broadcast.');
    } finally {
      setSending(false);
    }
  };

  const handleReadBroadcast = async (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);

    // If unread, mark as read on backend and locally
    if (broadcast.is_read === 0) {
      try {
        await api.post(`/broadcasts/${broadcast.id}/read`, {});
        setReceivedBroadcasts(prev =>
          prev.map(b => b.id === broadcast.id ? { ...b, is_read: 1 } : b)
        );
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
  };

  const handleViewAnalytics = async (broadcastId: string) => {
    try {
      setLoadingAnalytics(true);
      setAnalyticsData(null);
      const data = await api.get(`/broadcasts/${broadcastId}/analytics`);
      setAnalyticsData(data);
    } catch (e) {
      console.error('Failed to load read analytics', e);
      alert('Failed to load read tracking details.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleEditDraft = (b: Broadcast) => {
    setSubject(b.subject);
    setBody(b.body);
    setCategory(b.category);
    setPriority(b.priority);
    setEditingDraftId(b.id);
    if (b.channel) {
      setChannels(b.channel.split(','));
    } else {
      setChannels(['erp']);
    }

    try {
      const parsedFilter = JSON.parse(b.recipient_filter);
      setRecipientFilter(parsedFilter);
    } catch {
      // fallback
    }

    if (b.expires_at) {
      setHasExpiry(true);
      setExpiryDate(b.expires_at.slice(0, 16));
    } else {
      setHasExpiry(false);
      setExpiryDate('');
    }

    // Load attachments
    api.get(`/broadcasts/${b.id}`).then(details => {
      if (details && details.attachments) {
        setAttachments(details.attachments);
      }
    }).catch(() => {
      setAttachments([]);
    });

    setActiveSubTab('compose');
  };

  const handleToggleChannel = (chan: string) => {
    if (chan === 'erp') return;
    if (channels.includes(chan)) {
      setChannels(channels.filter(c => c !== chan));
    } else {
      setChannels([...channels, chan]);
    }
  };

  // Filters & Sorting logic
  const filteredReceived = receivedBroadcasts
    .filter(b => {
      const matchCat = categoryFilter === 'All' || b.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchSearch = b.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.body.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      // Prioritize urgent unread messages to the top
      const aUrgentUnread = a.priority === 'urgent' && a.is_read === 0 ? 1 : 0;
      const bUrgentUnread = b.priority === 'urgent' && b.is_read === 0 ? 1 : 0;
      
      if (aUrgentUnread !== bUrgentUnread) {
        return bUrgentUnread - aUrgentUnread;
      }
      
      // Fallback: sort by date
      const dateA = new Date(a.sent_at || a.sent_at || 0).getTime();
      const dateB = new Date(b.sent_at || b.sent_at || 0).getTime();
      return dateB - dateA;
    });

  const getPriorityBadge = (p: Broadcast['priority']) => {
    switch (p) {
      case 'urgent': return <span className="bc-badge bc-urgent">🔴 Urgent</span>;
      case 'important': return <span className="bc-badge bc-important">🟠 Important</span>;
      default: return null;
    }
  };

  const getCategoryLabel = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className="broadcast-workspace">
      {/* Tab Navigation header */}
      <div className="bc-subtabs">
        <button 
          className={`bc-subtab ${activeSubTab === 'received' ? 'active' : ''}`}
          onClick={() => { setActiveSubTab('received'); setSelectedBroadcast(null); }}
        >
          Received Broadcasts
        </button>
        {canCompose && (
          <>
            <button 
              className={`bc-subtab ${activeSubTab === 'compose' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('compose')}
            >
              Compose Broadcast
            </button>
            <button 
              className={`bc-subtab ${activeSubTab === 'history' ? 'active' : ''}`}
              onClick={() => { setActiveSubTab('history'); setAnalyticsData(null); }}
            >
              Sent History
            </button>
          </>
        )}
      </div>

      <div className="bc-workspace-content">
        {/* ==================== 1. RECEIVED TAB ==================== */}
        {activeSubTab === 'received' && (
          <div className="bc-received-container">
            {selectedBroadcast ? (
              // Read Single Broadcast View
              <div className="bc-reader-card">
                <button className="bc-back-link" onClick={() => setSelectedBroadcast(null)}>
                  &larr; Back to received broadcasts
                </button>
                <div className="bc-reader-header">
                  <div className="bc-reader-meta">
                    <span className={`bc-cat-tag bc-cat-${selectedBroadcast.category}`}>
                      {getCategoryLabel(selectedBroadcast.category)}
                    </span>
                    {getPriorityBadge(selectedBroadcast.priority)}
                    <span className="bc-date">
                      <Clock size={12} />
                      {new Date(selectedBroadcast.sent_at || '').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <h3 className="bc-reader-title">{selectedBroadcast.subject}</h3>
                </div>

                <div className="bc-reader-body">
                  {selectedBroadcast.body.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {selectedBroadcast.attachments && selectedBroadcast.attachments.length > 0 && (
                  <div className="bc-reader-attachments">
                    <h4>Attachments</h4>
                    <div className="bc-att-links">
                      {selectedBroadcast.attachments.map((att, idx) => (
                        <a key={idx} href={att.file_url} target="_blank" rel="noopener noreferrer" className="bc-att-link">
                          <Download size={14} />
                          <span>{att.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // List Broadcasts View
              <div className="bc-list-layout">
                {/* Filters */}
                <div className="bc-filters-bar">
                  <div className="bc-search-wrapper">
                    <Search size={14} className="bc-search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search messages..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bc-search-input"
                    />
                  </div>
                  <div className="bc-category-tabs">
                    {['All', 'Academic', 'Fees', 'Attendance', 'Events', 'Emergency', 'General'].map(cat => (
                      <button
                        key={cat}
                        className={`bc-cat-tab ${categoryFilter === cat ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List items */}
                {loadingReceived ? (
                  <p className="bc-status-text">Loading incoming broadcasts...</p>
                ) : filteredReceived.length === 0 ? (
                  <div className="bc-empty-state">
                    <Radio size={40} className="bc-empty-icon" />
                    <h4>Inbox Clean</h4>
                    <p>No incoming broadcasts found in this category.</p>
                  </div>
                ) : (
                  <div className="bc-list-wrapper">
                    {filteredReceived.map(b => (
                      <div 
                        key={b.id} 
                        className={`bc-list-item ${b.is_read === 0 ? 'unread' : ''}`}
                        onClick={() => handleReadBroadcast(b)}
                      >
                        <div className="bc-item-left">
                          <div className="bc-item-status-dot" />
                          <div className="bc-item-meta">
                            <span className={`bc-cat-dot bc-cat-${b.category}`} />
                            <span className="bc-item-cat">{getCategoryLabel(b.category)}</span>
                            {getPriorityBadge(b.priority)}
                          </div>
                          <h4 className="bc-item-title">{b.subject}</h4>
                          <p className="bc-item-snippet">{b.body.slice(0, 120)}{b.body.length > 120 ? '...' : ''}</p>
                          
                          {b.attachments && b.attachments.length > 0 && (
                            <span className="bc-item-attachments-count">
                              📎 {b.attachments.length} attachment{b.attachments.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="bc-item-right">
                          <span className="bc-item-time">
                            {new Date(b.sent_at || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <ChevronRight size={16} className="bc-item-arrow" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. COMPOSE TAB ==================== */}
        {activeSubTab === 'compose' && (
          <form onSubmit={(e) => handleComposeSubmit(e, 'sent')} className="bc-compose-form">
            <div className="bc-compose-grid">
              
              {/* Left Column: Message Content Details */}
              <div className="bc-compose-content-panel">
                <div className="bc-form-row">
                  <div className="bc-form-field">
                    <label className="bc-label">Select Message Template (Optional)</label>
                    <select 
                      value={selectedTemplateId} 
                      onChange={handleSelectTemplate}
                      className="bc-select"
                    >
                      <option value="">-- Choose Template --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({getCategoryLabel(t.category)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bc-form-row">
                  <div className="bc-form-field">
                    <label className="bc-label">Subject Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mid-Term Report Cards / Fee Overdue Notice" 
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                      className="bc-input"
                    />
                  </div>
                </div>

                <div className="bc-form-row-grid">
                  <div className="bc-form-field">
                    <label className="bc-label">Category</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)}
                      className="bc-select"
                    >
                      <option value="general">General Notice</option>
                      <option value="academic">Academic / Course</option>
                      <option value="fees">Fees Ledger</option>
                      <option value="attendance">Attendance / Absentee</option>
                      <option value="events">Events & Activities</option>
                      <option value="transport">Transport / Bus</option>
                      <option value="hostel">Hostellers</option>
                      <option value="placement">Placement Cell</option>
                      <option value="examination">Examination Schedule</option>
                      <option value="emergency">Emergency / Alert</option>
                    </select>
                  </div>

                  <div className="bc-form-field">
                    <label className="bc-label">Priority Impact</label>
                    <div className="bc-priority-options">
                      {[
                        { id: 'normal', label: '🟢 Normal', colorClass: 'normal' },
                        { id: 'important', label: '🟠 Important', colorClass: 'important' },
                        { id: 'urgent', label: '🔴 Urgent', colorClass: 'urgent' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className={`bc-priority-btn ${priority === p.id ? 'active' : ''} ${p.colorClass}`}
                          onClick={() => setPriority(p.id as any)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bc-form-row">
                  <div className="bc-form-field">
                    <label className="bc-label">Detailed Message Body</label>
                    <textarea 
                      placeholder="Write your broadcast message description context here..." 
                      rows={6}
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      required
                      className="bc-textarea"
                    />
                  </div>
                </div>

                {/* Expiry Date */}
                <div className="bc-expiry-section">
                  <label className="bc-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={hasExpiry} 
                      onChange={() => setHasExpiry(!hasExpiry)} 
                    />
                    <span>Auto-Archive after specific expiry date</span>
                  </label>
                  {hasExpiry && (
                    <input 
                      type="datetime-local" 
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      required
                      className="bc-input bc-expiry-input"
                    />
                  )}
                </div>

                {/* Multi Attachments Builder */}
                <div className="bc-attachments-composer">
                  <label className="bc-label">Attachments Link (PDFs, Circular Docs, Images)</label>
                  <div className="bc-att-inputs">
                    <input 
                      type="text" 
                      placeholder="Attachment Name (e.g. Schedule PDF)" 
                      value={attName}
                      onChange={e => setAttName(e.target.value)}
                      className="bc-input"
                    />
                    <input 
                      type="text" 
                      placeholder="https://example.com/file.pdf" 
                      value={attUrl}
                      onChange={e => setAttUrl(e.target.value)}
                      className="bc-input"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddAttachment}
                      className="bc-add-att-btn"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="bc-added-atts-list">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="bc-added-att-tag">
                          <span>{att.file_name}</span>
                          <button type="button" onClick={() => handleRemoveAttachment(idx)} className="bc-remove-att-btn">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Channels Selection */}
                <div className="bc-channels-section">
                  <label className="bc-label">Delivery Notification Channels</label>
                  <div className="bc-channels-list">
                    <label className={`bc-channel-item ${channels.includes('erp') ? 'active' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={channels.includes('erp')} 
                        disabled={true} 
                      />
                      <span>ERP Inbox (Internal)</span>
                    </label>
                    <label className={`bc-channel-item ${channels.includes('email') ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={channels.includes('email')} 
                        onChange={() => handleToggleChannel('email')} 
                      />
                      <span>Email Delivery</span>
                    </label>
                    <label className={`bc-channel-item ${channels.includes('sms') ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={channels.includes('sms')} 
                        onChange={() => handleToggleChannel('sms')} 
                      />
                      <span>SMS Alert</span>
                    </label>
                    <label className={`bc-channel-item ${channels.includes('whatsapp') ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={channels.includes('whatsapp')} 
                        onChange={() => handleToggleChannel('whatsapp')} 
                      />
                      <span>WhatsApp Message</span>
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="bc-compose-actions">
                  <button 
                    type="button" 
                    onClick={(e) => handleComposeSubmit(e, 'draft')}
                    disabled={sending}
                    className="bc-btn-secondary"
                  >
                    Save as Draft
                  </button>
                  <button 
                    type="submit" 
                    disabled={sending}
                    className="bc-btn-primary"
                  >
                    <Send size={14} /> {sending ? 'Sending...' : 'Send Broadcast Now'}
                  </button>
                </div>
              </div>

              {/* Right Column: Recipient Target Builder */}
              <div className="bc-compose-recipients-panel">
                <RecipientBuilder value={recipientFilter} onChange={setRecipientFilter} />
              </div>

            </div>
          </form>
        )}

        {/* ==================== 3. SENT HISTORY TAB ==================== */}
        {activeSubTab === 'history' && (
          <div className="bc-history-container">
            {analyticsData ? (
              // Analytics Drawer/Detailed View
              <div className="bc-analytics-card">
                <button className="bc-back-link" onClick={() => setAnalyticsData(null)}>
                  &larr; Back to sent history
                </button>
                
                <div className="bc-analytics-header">
                  <div>
                    <h3 className="bc-analytics-title">{analyticsData.broadcast.subject}</h3>
                    <div className="bc-analytics-subtitle">
                      <span className={`bc-cat-tag bc-cat-${analyticsData.broadcast.category}`}>
                        {getCategoryLabel(analyticsData.broadcast.category)}
                      </span>
                      <span className="bc-date">
                        <Clock size={12} />
                        Sent At: {new Date(analyticsData.broadcast.sent_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Summary Cards */}
                <div className="bc-stats-cards">
                  <div className="bc-stat-card">
                    <span className="bc-stat-num">{analyticsData.stats.total}</span>
                    <span className="bc-stat-lbl">Total Targets</span>
                  </div>
                  <div className="bc-stat-card">
                    <span className="bc-stat-num bc-stat-green">{analyticsData.stats.read}</span>
                    <span className="bc-stat-lbl">Read Receipts</span>
                  </div>
                  <div className="bc-stat-card">
                    <span className="bc-stat-num bc-stat-orange">{analyticsData.stats.unread}</span>
                    <span className="bc-stat-lbl">Unread Users</span>
                  </div>
                  <div className="bc-stat-card">
                    <span className="bc-stat-num">{analyticsData.stats.readPercentage}%</span>
                    <span className="bc-stat-lbl">Read Ratio</span>
                  </div>
                </div>

                {/* Recipient Details List Table */}
                <div className="bc-recipients-table-wrapper">
                  <div className="bc-table-header">
                    <h4>Recipient Read Receipts Ledger</h4>
                    <div className="bc-table-search-wrapper">
                      <Search size={12} className="bc-search-icon" />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={analyticsSearchQuery}
                        onChange={e => setAnalyticsSearchQuery(e.target.value)}
                        className="bc-table-search-input"
                      />
                    </div>
                  </div>
                  
                  <table className="bc-recipients-table">
                    <thead>
                      <tr>
                        <th>Target User</th>
                        <th>Associated Roles</th>
                        <th>Status</th>
                        <th>Read Time</th>
                        <th>Delivered Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.recipients
                        .filter((r: any) => 
                          r.name.toLowerCase().includes(analyticsSearchQuery.toLowerCase()) ||
                          r.roles.some((role: string) => role.toLowerCase().includes(analyticsSearchQuery.toLowerCase()))
                        )
                        .map((rec: any, idx: number) => (
                          <tr key={idx} className={rec.is_read === 1 ? 'read-row' : 'unread-row'}>
                            <td>
                              <div className="bc-user-cell">
                                <span className="bc-user-name">{rec.name}</span>
                                <span className="bc-user-email">{rec.email}</span>
                              </div>
                            </td>
                            <td>
                              <div className="bc-roles-tags">
                                {rec.roles.map((r: string, ridx: number) => (
                                  <span key={ridx} className="bc-role-tag">{r}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              {rec.is_read === 1 ? (
                                <span className="bc-status-tag read"><CheckCircle size={10} /> Read</span>
                              ) : (
                                <span className="bc-status-tag unread"><Clock size={10} /> Delivered</span>
                              )}
                            </td>
                            <td>{rec.read_at ? new Date(rec.read_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                            <td>{new Date(rec.delivered_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Sent List History
              <div className="bc-history-layout">
                {loadingHistory ? (
                  <p className="bc-status-text">Loading sent history...</p>
                ) : sentBroadcasts.length === 0 ? (
                  <div className="bc-empty-state">
                    <Radio size={40} className="bc-empty-icon" />
                    <h4>No Sent Broadcasts</h4>
                    <p>You haven't composed and sent any broadcasts yet.</p>
                  </div>
                ) : (
                  <div className="bc-history-table-wrapper">
                    <table className="bc-history-table">
                      <thead>
                        <tr>
                          <th>Subject Title</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Total Targets</th>
                          <th>Read count</th>
                          <th>Sent date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sentBroadcasts.map(b => (
                          <tr key={b.id}>
                            <td className="bc-history-subject-cell">
                              <strong>{b.subject}</strong>
                              {b.status === 'draft' && <span className="bc-draft-badge">Draft</span>}
                              <p className="bc-item-snippet">{b.body.slice(0, 50)}{b.body.length > 50 ? '...' : ''}</p>
                            </td>
                            <td>
                              <span className={`bc-cat-dot bc-cat-${b.category}`} />
                              <span>{getCategoryLabel(b.category)}</span>
                            </td>
                            <td>{b.priority === 'normal' ? '🟢 Normal' : b.priority === 'important' ? '🟠 Important' : '🔴 Urgent'}</td>
                            <td>{b.status === 'draft' ? '—' : `${b.total_recipients} resolved`}</td>
                            <td>{b.status === 'draft' ? '—' : `${b.read_count} read (${b.total_recipients > 0 ? Math.round((b.read_count / b.total_recipients) * 100) : 0}%)`}</td>
                            <td>{b.sent_at ? new Date(b.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td>
                              {b.status === 'draft' ? (
                                <button 
                                  className="bc-action-btn edit-draft-btn"
                                  onClick={() => handleEditDraft(b)}
                                >
                                  Edit &amp; Send Draft &rarr;
                                </button>
                              ) : (
                                <button 
                                  className="bc-action-btn"
                                  onClick={() => handleViewAnalytics(b.id)}
                                >
                                  View Analytics &rarr;
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
