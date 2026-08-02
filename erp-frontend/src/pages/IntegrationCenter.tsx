import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { authFetch } from '../services/api';
import './IntegrationCenter.css';

interface Integration {
  id: string;
  name: string;
  provider: string;
  type: string;
  status: string;
  base_url?: string | null;
  auth_type: string;
  rate_limit_rpm: number;
  created_at: string;
}

interface WebhookSubscription {
  id: string;
  integration_id?: string | null;
  name: string;
  event_type: string;
  target_url: string;
  secret: string;
  is_active: number;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  subscription_id?: string | null;
  event_type: string;
  target_url: string;
  signature?: string | null;
  response_status?: number | null;
  duration_ms: number;
  attempt: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING' | 'DLQ';
  created_at: string;
}

const IntegrationCenter: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'integrations' | 'subscriptions' | 'deliveries' | 'testing'>('integrations');
  const [loading, setLoading] = useState<boolean>(true);

  // States
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');

  // Modals
  const [showIntegrationModal, setShowIntegrationModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);

  // Integration Form
  const [intName, setIntName] = useState<string>('Custom Student Sync Webhook');
  const [intProvider, setIntProvider] = useState<string>('CustomWebhook');
  const [intType, setIntType] = useState<string>('OUTBOUND_WEBHOOK');
  const [intBaseUrl, setIntBaseUrl] = useState<string>('https://webhook.site/demo-endpoint');
  const [intApiKey, setIntApiKey] = useState<string>('');
  const [intSenderId, setIntSenderId] = useState<string>('');
  const [intAccountSid, setIntAccountSid] = useState<string>('');

  const SMS_PROVIDERS = ['Fast2SMS', 'MSG91', 'Twilio', 'GenericSMS'];
  const isSmsProvider = SMS_PROVIDERS.includes(intProvider);

  // Test SMS
  const [showTestSmsModal, setShowTestSmsModal] = useState<boolean>(false);
  const [testSmsIntegrationId, setTestSmsIntegrationId] = useState<string>('');
  const [testSmsPhone, setTestSmsPhone] = useState<string>('');
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; provider: string } | null>(null);

  // Subscription Form
  const [subName, setSubName] = useState<string>('Student Admission Dispatcher');
  const [subEventType, setSubEventType] = useState<string>('StudentCreated');
  const [subTargetUrl, setSubTargetUrl] = useState<string>('https://httpbin.org/post');
  const [subSecret, setSubSecret] = useState<string>('whsec_hmac_secret_2026');

  // Testing Console
  const [selectedSubForTest, setSelectedSubForTest] = useState<string>('');
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, deliveryFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const iRes = await authFetch('/integrations');
      if (iRes.ok) setIntegrations(await iRes.json());

      const sRes = await authFetch('/integrations/webhooks/subscriptions');
      if (sRes.ok) {
        const subsData = await sRes.json();
        setSubscriptions(subsData);
        if (subsData.length > 0 && !selectedSubForTest) {
          setSelectedSubForTest(subsData[0].id);
        }
      }

      let dUrl = '/integrations/webhooks/deliveries';
      if (deliveryFilter) dUrl += `?status=${deliveryFilter}`;
      const dRes = await authFetch(dUrl);
      if (dRes.ok) setDeliveries(await dRes.json());
    } catch (err) {
      console.error('Failed to load Integrations data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: intName,
          provider: intProvider,
          type: isSmsProvider ? 'SMS_GATEWAY' : intType,
          baseUrl: isSmsProvider && intProvider === 'Twilio' ? undefined : (intBaseUrl || undefined),
          authType: isSmsProvider ? 'API_KEY' : 'HMAC_SECRET'
        })
      });
      if (!res.ok) {
        toast.error('Failed to register integration');
        return;
      }
      const created = await res.json();

      if (isSmsProvider) {
        if (intApiKey) {
          await authFetch(`/integrations/${created.id}/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: intApiKey, credentialType: 'API_KEY' })
          });
        }
        if ((intProvider === 'MSG91' || intProvider === 'Twilio') && intSenderId) {
          await authFetch(`/integrations/${created.id}/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: intSenderId, credentialType: 'SENDER_ID' })
          });
        }
        if (intProvider === 'Twilio' && intAccountSid) {
          await authFetch(`/integrations/${created.id}/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: intAccountSid, credentialType: 'ACCOUNT_SID' })
          });
        }
      }

      toast.success('Integration registered successfully!');
      setShowIntegrationModal(false);
      setIntApiKey('');
      setIntSenderId('');
      setIntAccountSid('');
      fetchData();
    } catch (err) {
      toast.error('Failed to register integration');
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/integrations/${testSmsIntegrationId}/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testSmsPhone })
      });
      const data = await res.json();
      setTestSmsResult(data);
      if (data.success) toast.success('Test SMS dispatched!');
      else toast.error('Test SMS failed to send — check credentials.');
    } catch (err) {
      toast.error('Failed to send test SMS');
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/integrations/webhooks/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subName,
          eventType: subEventType,
          targetUrl: subTargetUrl,
          secret: subSecret
        })
      });
      if (res.ok) {
        toast.success('Webhook subscription created successfully!');
        setShowSubscriptionModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to create subscription');
    }
  };

  const handleSendTestWebhook = async (subId: string) => {
    try {
      const res = await authFetch(`/integrations/webhooks/subscriptions/${subId}/test`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data.delivery);
        toast.success('Test webhook dispatched with HMAC signature!');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to send test webhook');
    }
  };

  const handleReplayDelivery = async (deliveryId: string) => {
    try {
      const res = await authFetch(`/integrations/webhooks/deliveries/${deliveryId}/replay`, { method: 'POST' });
      if (res.ok) {
        toast.success('Webhook delivery replayed!');
        fetchData();
      }
    } catch (err) {
      toast.error('Replay failed');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'SUCCESS') return <span className="status-badge status-success">SUCCESS</span>;
    if (status === 'FAILED') return <span className="status-badge status-failed">FAILED</span>;
    if (status === 'RETRYING') return <span className="status-badge status-retrying">RETRYING</span>;
    if (status === 'DLQ') return <span className="status-badge status-dlq">DLQ</span>;
    return <span className="status-badge" style={{ background: '#f1f5f9' }}>{status}</span>;
  };

  return (
    <div className="integrations-container">
      {/* Header */}
      <div className="integrations-header">
        <div className="integrations-title-group">
          <h1>
            🔌 Webhooks & External Integrations Platform
            <span className="status-badge status-success">
              HMAC SHA-256 Signed
            </span>
          </h1>
          <p className="integrations-subtitle">
            Central integration registry, EventBus webhook dispatch engine, delivery queues, retries & Dead Letter Queue (DLQ)
          </p>
        </div>
        <div className="integrations-actions">
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => setShowIntegrationModal(true)}>
            + Add Integration
          </button>
          <button className="btn btn-primary" onClick={() => setShowSubscriptionModal(true)}>
            + Webhook Subscription
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="integrations-metrics-grid">
        <div className="integration-metric-card" style={{ borderTop: '4px solid #2563eb' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>REGISTERED INTEGRATIONS</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{integrations.length}</span>
        </div>
        <div className="integration-metric-card" style={{ borderTop: '4px solid #16a34a' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>WEBHOOK SUBSCRIPTIONS</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{subscriptions.length}</span>
        </div>
        <div className="integration-metric-card" style={{ borderTop: '4px solid #9333ea' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>DELIVERY ATTEMPTS</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#9333ea' }}>{deliveries.length}</span>
        </div>
        <div className="integration-metric-card" style={{ borderTop: '4px solid #dc2626' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>DEAD LETTER QUEUE (DLQ)</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626' }}>
            {deliveries.filter(d => d.status === 'DLQ').length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="integrations-tabs">
        <button
          className={`integrations-tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          🔌 Integration Registry ({integrations.length})
        </button>
        <button
          className={`integrations-tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          🪝 Webhook Subscriptions ({subscriptions.length})
        </button>
        <button
          className={`integrations-tab-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          📜 Delivery History & DLQ ({deliveries.length})
        </button>
        <button
          className={`integrations-tab-btn ${activeTab === 'testing' ? 'active' : ''}`}
          onClick={() => setActiveTab('testing')}
        >
          🧪 Testing Console & Signature Inspector
        </button>
      </div>

      {/* TAB 1: INTEGRATION REGISTRY */}
      {activeTab === 'integrations' && (
        <div className="integrations-table-container">
          <table className="integrations-table">
            <thead>
              <tr>
                <th>Integration Name</th>
                <th>Provider</th>
                <th>Type</th>
                <th>Base URL</th>
                <th>Auth Type</th>
                <th>Rate Limit</th>
                <th>Status</th>
                <th>Registered At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {integrations.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No external integrations registered yet.
                  </td>
                </tr>
              ) : (
                integrations.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{i.name}</td>
                    <td><span className="status-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{i.provider}</span></td>
                    <td><code>{i.type}</code></td>
                    <td><code style={{ fontSize: '12px' }}>{i.base_url || 'N/A'}</code></td>
                    <td><code>{i.auth_type}</code></td>
                    <td>{i.rate_limit_rpm} rpm</td>
                    <td><span className="status-badge status-success">{i.status}</span></td>
                    <td>{new Date(i.created_at).toLocaleDateString()}</td>
                    <td>
                      {SMS_PROVIDERS.includes(i.provider) && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setTestSmsIntegrationId(i.id);
                            setTestSmsResult(null);
                            setShowTestSmsModal(true);
                          }}
                        >
                          📱 Send Test SMS
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: WEBHOOK SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="integrations-table-container">
          <table className="integrations-table">
            <thead>
              <tr>
                <th>Subscription Name</th>
                <th>Subscribed Event</th>
                <th>Target URL</th>
                <th>HMAC Secret</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No active webhook subscriptions.
                  </td>
                </tr>
              ) : (
                subscriptions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td><span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>{s.event_type}</span></td>
                    <td><code style={{ fontSize: '12px' }}>{s.target_url}</code></td>
                    <td><code style={{ fontSize: '11px', color: '#2563eb' }}>{s.secret.slice(0, 6)}****</code></td>
                    <td><span className="status-badge status-success">ACTIVE</span></td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleSendTestWebhook(s.id)}>
                        ⚡ Send Test Ping
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: DELIVERY HISTORY & DLQ */}
      {activeTab === 'deliveries' && (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">All Delivery Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="RETRYING">RETRYING</option>
              <option value="DLQ">Dead Letter Queue (DLQ)</option>
            </select>
          </div>

          <div className="integrations-table-container">
            <table className="integrations-table">
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Event Type</th>
                  <th>Target Endpoint</th>
                  <th>Status Code</th>
                  <th>Duration</th>
                  <th>Attempt</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No delivery logs recorded.
                    </td>
                  </tr>
                ) : (
                  deliveries.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>{d.id}</td>
                      <td><strong>{d.event_type}</strong></td>
                      <td><code style={{ fontSize: '11px' }}>{d.target_url}</code></td>
                      <td>
                        <span style={{ fontWeight: 700, color: d.response_status === 200 ? '#16a34a' : '#dc2626' }}>
                          {d.response_status || 'ERR'}
                        </span>
                      </td>
                      <td>{d.duration_ms} ms</td>
                      <td>{d.attempt}</td>
                      <td>{getStatusBadge(d.status)}</td>
                      <td>{new Date(d.created_at).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleReplayDelivery(d.id)}>
                          🔄 Replay
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TESTING CONSOLE */}
      {activeTab === 'testing' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="integrations-table-container" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>🧪 Webhook Signature & Dispatch Console</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select Subscription to Test</label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={selectedSubForTest}
                  onChange={(e) => setSelectedSubForTest(e.target.value)}
                >
                  {subscriptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.event_type})</option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                disabled={!selectedSubForTest}
                onClick={() => selectedSubForTest && handleSendTestWebhook(selectedSubForTest)}
              >
                ⚡ Trigger Test HMAC SHA-256 Webhook Ping
              </button>
            </div>
          </div>

          <div className="integrations-table-container" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>🔍 Signature & HTTP Response Inspector</h3>
            {testResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div><strong>Delivery ID:</strong> <code>{testResult.id}</code></div>
                <div><strong>HMAC SHA-256 Signature Header:</strong></div>
                <code style={{ background: '#f1f5f9', padding: '8px', borderRadius: '4px', wordBreak: 'break-all', color: '#2563eb' }}>
                  {testResult.signature || 'sha256=a89f...'}
                </code>
                <div><strong>Status Code:</strong> <span style={{ fontWeight: 700, color: '#16a34a' }}>{testResult.response_status}</span></div>
                <div><strong>Duration:</strong> {testResult.duration_ms} ms</div>
                <div><strong>Response Body Snippet:</strong></div>
                <pre style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '11px', maxHeight: '150px', overflowY: 'auto' }}>
                  {testResult.response_body || 'HTTP 200 OK'}
                </pre>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Select a subscription and trigger a test ping to inspect headers and response.</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD INTEGRATION */}
      {showIntegrationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>+ Register External System Integration</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowIntegrationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateIntegration}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Integration Name</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={intName}
                    onChange={(e) => setIntName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Provider</label>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={intProvider}
                    onChange={(e) => setIntProvider(e.target.value)}
                  >
                    <option value="CustomWebhook">Custom Webhook</option>
                    <option value="Moodle">Moodle LMS</option>
                    <option value="GoogleWorkspace">Google Workspace</option>
                    <option value="Razorpay">Razorpay Payments</option>
                    <option value="Stripe">Stripe</option>
                    <option value="GenericREST">Generic REST System</option>
                    <option value="Fast2SMS">SMS: Fast2SMS</option>
                    <option value="MSG91">SMS: MSG91</option>
                    <option value="Twilio">SMS: Twilio</option>
                    <option value="GenericSMS">SMS: Generic SMS Gateway</option>
                  </select>
                </div>
                {!(isSmsProvider && intProvider === 'Twilio') && (
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      {isSmsProvider ? 'Gateway Endpoint URL (optional — default provider endpoint used if blank)' : 'Target Base URL'}
                    </label>
                    <input
                      type="url"
                      required={!isSmsProvider}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={intBaseUrl}
                      onChange={(e) => setIntBaseUrl(e.target.value)}
                    />
                  </div>
                )}
                {isSmsProvider && (
                  <>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        {intProvider === 'Twilio' ? 'Auth Token' : 'API Key'}
                      </label>
                      <input
                        type="password"
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={intApiKey}
                        onChange={(e) => setIntApiKey(e.target.value)}
                      />
                    </div>
                    {intProvider === 'Twilio' && (
                      <div>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account SID</label>
                        <input
                          type="text"
                          required
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          value={intAccountSid}
                          onChange={(e) => setIntAccountSid(e.target.value)}
                        />
                      </div>
                    )}
                    {(intProvider === 'MSG91' || intProvider === 'Twilio') && (
                      <div>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          {intProvider === 'Twilio' ? 'From Number (e.g. +14155552671)' : 'Sender ID (6-char DLT-approved, e.g. MSGIND)'}
                        </label>
                        <input
                          type="text"
                          required={intProvider === 'Twilio'}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          value={intSenderId}
                          onChange={(e) => setIntSenderId(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowIntegrationModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Register Integration</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD WEBHOOK SUBSCRIPTION */}
      {showSubscriptionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>+ Create Event Webhook Subscription</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowSubscriptionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubscription}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Subscription Name</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Subscribed Event</label>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={subEventType}
                    onChange={(e) => setSubEventType(e.target.value)}
                  >
                    <option value="StudentCreated">StudentCreated</option>
                    <option value="AttendanceMarked">AttendanceMarked</option>
                    <option value="FeePaid">FeePaid</option>
                    <option value="ExamPublished">ExamPublished</option>
                    <option value="DocumentUploaded">DocumentUploaded</option>
                    <option value="NotificationDelivered">NotificationDelivered</option>
                    <option value="*">All Events (* Wildcard)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Webhook Endpoint URL</label>
                  <input
                    type="url"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={subTargetUrl}
                    onChange={(e) => setSubTargetUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>HMAC Shared Secret Key</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={subSecret}
                    onChange={(e) => setSubSecret(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSubscriptionModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Subscription</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: SEND TEST SMS */}
      {showTestSmsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>📱 Send Test SMS</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowTestSmsModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendTestSms}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={testSmsPhone}
                    onChange={(e) => setTestSmsPhone(e.target.value)}
                  />
                </div>
                {testSmsResult && (
                  <div style={{ fontSize: '13px' }}>
                    <span className={`status-badge ${testSmsResult.success ? 'status-success' : 'status-failed'}`}>
                      {testSmsResult.success ? 'SENT' : 'FAILED'}
                    </span>{' '}
                    via <code>{testSmsResult.provider}</code>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTestSmsModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary">Send Test SMS</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationCenter;
