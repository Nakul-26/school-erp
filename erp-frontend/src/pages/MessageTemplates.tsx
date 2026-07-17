import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit3, Check, FileText, HelpCircle } from 'lucide-react';
import './MessageTemplates.css';

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export default function MessageTemplates({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Form States
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Category Filter
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.get('/message-templates');
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplate(data[0]);
      }
    } catch (e) {
      console.error('Failed to fetch templates', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
    setName('');
    setCategory('general');
    setSubject('');
    setBody('');
  };

  const handleStartEdit = () => {
    if (!selectedTemplate) return;
    setIsEditing(true);
    setIsCreating(false);
    setName(selectedTemplate.name);
    setCategory(selectedTemplate.category);
    setSubject(selectedTemplate.subject);
    setBody(selectedTemplate.body);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (templates.length > 0) {
      setSelectedTemplate(templates[0] || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('All fields are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = { name, category, subject, body, is_active: 1 };

      if (isCreating) {
        const res = await api.post('/message-templates', payload);
        alert('Template created successfully!');
        const newTemplate = { id: res.id, ...payload };
        setTemplates([...templates, newTemplate]);
        setSelectedTemplate(newTemplate);
      } else if (isEditing && selectedTemplate) {
        await api.put(`/message-templates/${selectedTemplate.id}`, payload);
        alert('Template updated successfully!');
        const updated = templates.map(t => t.id === selectedTemplate.id ? { ...t, ...payload } : t);
        setTemplates(updated);
        setSelectedTemplate({ id: selectedTemplate.id, ...payload });
      }

      setIsEditing(false);
      setIsCreating(false);
    } catch (err) {
      alert('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    if (!confirm(`Are you sure you want to delete template "${selectedTemplate.name}"?`)) return;

    try {
      await api.delete(`/message-templates/${selectedTemplate.id}`);
      alert('Template deleted.');
      const updated = templates.filter(t => t.id !== selectedTemplate.id);
      setTemplates(updated);
      if (updated.length > 0) {
        setSelectedTemplate(updated[0] || null);
      } else {
        setSelectedTemplate(null);
      }
    } catch (err) {
      alert('Failed to delete template.');
    }
  };

  const handleUseInBroadcast = () => {
    if (!selectedTemplate) return;
    // Redirect to broadcast composing and pass template ID in search params
    navigate(`/communication?tab=broadcasts&compose=true&templateId=${selectedTemplate.id}`);
  };

  const getCategoryLabel = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const filteredTemplates = templates.filter(t => 
    activeCategoryFilter === 'All' || t.category.toLowerCase() === activeCategoryFilter.toLowerCase()
  );

  const getDynamicVariables = (text: string) => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const val = match[1];
      if (val && !matches.includes(val)) {
        matches.push(val);
      }
    }
    return matches;
  };

  return (
    <div className="templates-workspace">
      {/* Category filters */}
      <div className="tpl-filters-bar">
        {['All', 'Attendance', 'Fees', 'Exams', 'Events', 'General'].map(cat => (
          <button
            key={cat}
            className={`tpl-cat-tab ${activeCategoryFilter === cat ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="tpl-layout-grid">
        {/* Left Side: Templates List */}
        <div className="tpl-list-panel">
          <div className="tpl-list-header">
            <h4>Templates Ledger</h4>
            <button className="tpl-create-btn" onClick={handleStartCreate}>
              <Plus size={14} /> New Template
            </button>
          </div>

          {loading ? (
            <p className="tpl-status-text">Loading message templates...</p>
          ) : filteredTemplates.length === 0 ? (
            <div className="tpl-empty-list">
              <FileText size={24} className="tpl-empty-icon" />
              <p>No templates found.</p>
            </div>
          ) : (
            <div className="tpl-list">
              {filteredTemplates.map(t => {
                const isSelected = selectedTemplate?.id === t.id;
                return (
                  <div
                    key={t.id}
                    className={`tpl-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectTemplate(t)}
                  >
                    <div className="tpl-item-info">
                      <div className="tpl-item-name">{t.name}</div>
                      <div className="tpl-item-category">{getCategoryLabel(t.category)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Form or Details Preview View */}
        <div className="tpl-details-panel">
          {isCreating || isEditing ? (
            // Form editor
            <form onSubmit={handleSubmit} className="tpl-form">
              <h3 className="tpl-form-title">{isCreating ? 'Create Message Template' : 'Edit Template'}</h3>
              
              <div className="tpl-form-field">
                <label className="tpl-label">Template name</label>
                <input
                  type="text"
                  placeholder="e.g. Absent Student Notice"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="tpl-input"
                />
              </div>

              <div className="tpl-form-field">
                <label className="tpl-label">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="tpl-select"
                >
                  <option value="general">General</option>
                  <option value="attendance">Attendance</option>
                  <option value="fees">Fees</option>
                  <option value="exams">Exams</option>
                  <option value="events">Events & Holidays</option>
                </select>
              </div>

              <div className="tpl-form-field">
                <label className="tpl-label">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Student Absentee Notification"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                  className="tpl-input"
                />
              </div>

              <div className="tpl-form-field">
                <label className="tpl-label">Message Body</label>
                <textarea
                  placeholder="Dear {{parentName}}, {{studentName}} (Class {{className}}) was absent today..."
                  rows={8}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  required
                  className="tpl-textarea"
                />
                <span className="tpl-hint-text">
                  💡 Hint: Use <code>{"{{variableName}}"}</code> placeholders (e.g. <code>{"{{parentName}}"}</code>, <code>{"{{studentName}}"}</code>) to inject values dynamically during broadcast compose.
                </span>
              </div>

              <div className="tpl-form-actions">
                <button type="button" onClick={handleCancel} className="tpl-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="tpl-btn-primary">
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          ) : selectedTemplate ? (
            // Details Preview Card
            <div className="tpl-preview-card">
              <div className="tpl-preview-header">
                <div>
                  <span className={`tpl-cat-tag tpl-cat-${selectedTemplate.category}`}>
                    {getCategoryLabel(selectedTemplate.category)}
                  </span>
                  <h3 className="tpl-preview-name">{selectedTemplate.name}</h3>
                </div>
                <div className="tpl-preview-actions">
                  <button className="tpl-action-btn edit" onClick={handleStartEdit}>
                    <Edit3 size={12} /> Edit
                  </button>
                  <button className="tpl-action-btn delete" onClick={handleDelete}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>

              <div className="tpl-preview-content">
                <div className="tpl-preview-row">
                  <span className="tpl-preview-label">Subject Line:</span>
                  <div className="tpl-preview-subject">{selectedTemplate.subject}</div>
                </div>

                <div className="tpl-preview-row">
                  <span className="tpl-preview-label">Message Template:</span>
                  <div className="tpl-preview-body">{selectedTemplate.body}</div>
                </div>

                {/* Variables Resolver */}
                <div className="tpl-variables-section">
                  <div className="tpl-variables-title">
                    <HelpCircle size={12} />
                    <span>Dynamic variables resolved:</span>
                  </div>
                  {getDynamicVariables(selectedTemplate.body).length === 0 ? (
                    <span className="tpl-variable-tag none">None detected</span>
                  ) : (
                    <div className="tpl-variables-list">
                      {getDynamicVariables(selectedTemplate.body).map((v, idx) => (
                        <span key={idx} className="tpl-variable-tag">{"{{"}{v}{"}}"}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="tpl-preview-footer">
                <button className="tpl-use-btn" onClick={handleUseInBroadcast}>
                  Use template to compose broadcast &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="tpl-select-prompt">
              <FileText size={48} className="tpl-prompt-icon" />
              <h3>Choose a Template</h3>
              <p>Select a message template from the left list to view details or edit it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
