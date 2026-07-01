import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Send, Search, User, MessageSquare, Shield, Clock } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  role: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: number;
}

export default function Messaging() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  // Poll for messages when chat is open
  useEffect(() => {
    if (!activeContactId) return;

    fetchMessages(activeContactId);
    markAsRead(activeContactId);

    const interval = setInterval(() => {
      fetchMessages(activeContactId);
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(interval);
  }, [activeContactId]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await api.get('/messaging/contacts');
      setContacts(data);
      if (data.length > 0) {
        setActiveContactId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching messaging contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const data = await api.get(`/messaging/history/${contactId}`);
      setMessages(data);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const markAsRead = async (contactId: string) => {
    try {
      await api.post(`/messaging/read/${contactId}`, {});
    } catch {
      // silent
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeContactId || sending) return;

    try {
      setSending(true);
      const content = typedMessage;
      setTypedMessage('');
      
      await api.post('/messaging/send', {
        receiver_id: activeContactId,
        message: content
      });

      // Optimistic local update
      const optimisticMsg: Message = {
        id: crypto.randomUUID(),
        sender_id: user?.id || (user as any)?.sub || '',
        receiver_id: activeContactId,
        message: content,
        created_at: new Date().toISOString(),
        is_read: 0
      };
      setMessages(prev => [...prev, optimisticMsg]);
    } catch (err) {
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getActiveContact = () => {
    return contacts.find(c => c.id === activeContactId);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContact = getActiveContact();
  const currentUserId = user?.id || (user as any)?.sub || '';

  return (
    <Layout>
      <PageGuidance
        title="Direct Chat Channels"
        description="Communicate directly with staff, department heads, and guardians in a secure messaging inbox."
        steps={["Select a contact from the left panel conversation list.","Write and send direct chat responses.","Chat window will automatically pull new incoming messages."]}
      />

      <div className="page-header">
        <div>
          <h2>Direct Messaging Workspace</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Built-in communication channel for parents, teachers, and administration staff
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        height: 'calc(100vh - 280px)',
        minHeight: '450px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }} className="chat-container">
        
        {/* Left Panel: Contacts list */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8fafc'
        }}>
          {/* Search Contacts */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search conversation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.25rem',
                fontSize: '0.85rem',
                marginBottom: 0,
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Contacts Scrolling wrapper */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading contacts...</p>
            ) : filteredContacts.length === 0 ? (
              <p style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                No active contacts found.
              </p>
            ) : (
              filteredContacts.map(c => {
                const isActive = c.id === activeContactId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveContactId(c.id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                      borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                      transition: 'background 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                    className="contact-item"
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? 'var(--primary)' : '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      <User size={18} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.role}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Chat Window */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff' }}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: '#ffffff'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {activeContact.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {activeContact.role}
                  </span>
                </div>
              </div>

              {/* Message history */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }} className="chat-messages-box">
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <MessageSquare size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isOutgoing = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isOutgoing ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          padding: '0.75rem 1rem',
                          borderRadius: isOutgoing ? '12px 12px 0 12px' : '12px 12px 12px 0',
                          backgroundColor: isOutgoing ? 'var(--primary)' : '#ffffff',
                          color: isOutgoing ? '#ffffff' : 'var(--text-main)',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          wordBreak: 'break-word'
                        }}>
                          {msg.message}
                        </div>
                        <span style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Clock size={10} />
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Send Input Form */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '0.75rem',
                  backgroundColor: '#ffffff'
                }}
              >
                <input
                  type="text"
                  placeholder={`Send message to ${activeContact.name}...`}
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  required
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 1rem' }}
                  disabled={sending || !typedMessage.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>Select a Conversation</h3>
              <p>Choose a contact from the left panel list to begin messaging.</p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
