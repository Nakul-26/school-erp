import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import './RecipientBuilder.css';
import { Users, BookOpen, Layers, Briefcase, ShieldAlert, User, Search, Check } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  course_code: string;
}

interface Section {
  id: string;
  name: string;
  course_name?: string;
  course_id?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
}

export interface RecipientFilter {
  type: 'all' | 'class' | 'section' | 'department' | 'role' | 'custom';
  classIds?: string[] | undefined;
  sectionIds?: string[] | undefined;
  departmentIds?: string[] | undefined;
  roles?: string[] | undefined;
  userIds?: string[] | undefined;
  includeStudents: boolean;
  includeParents: boolean;
  includeTeachers: boolean;
}

interface RecipientBuilderProps {
  value: RecipientFilter;
  onChange: (filter: RecipientFilter) => void;
}

export default function RecipientBuilder({ value, onChange }: RecipientBuilderProps) {
  const [classes, setClasses] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const [programsData, sectionsData, deptsData, contactsData] = await Promise.all([
        api.get('/programs').catch(() => []),
        api.get('/sections').catch(() => []),
        api.get('/departments').catch(() => []),
        api.get('/messaging/contacts').catch(() => [])
      ]);
      setClasses(programsData || []);
      setSections(sectionsData || []);
      setDepartments(deptsData || []);
      setContacts(contactsData || []);
    } catch (e) {
      console.error('Failed to load recipient meta-data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: RecipientFilter['type']) => {
    onChange({
      ...value,
      type,
      classIds: type === 'class' ? [] : value.classIds,
      sectionIds: type === 'section' ? [] : value.sectionIds,
      departmentIds: type === 'department' ? [] : value.departmentIds,
      roles: type === 'role' ? [] : value.roles,
      userIds: type === 'custom' ? [] : value.userIds
    });
  };

  const toggleClass = (classId: string) => {
    const current = value.classIds || [];
    const next = current.includes(classId)
      ? current.filter(id => id !== classId)
      : [...current, classId];
    onChange({ ...value, classIds: next });
  };

  const toggleSection = (sectionId: string) => {
    const current = value.sectionIds || [];
    const next = current.includes(sectionId)
      ? current.filter(id => id !== sectionId)
      : [...current, sectionId];
    onChange({ ...value, sectionIds: next });
  };

  const toggleDepartment = (deptId: string) => {
    const current = value.departmentIds || [];
    const next = current.includes(deptId)
      ? current.filter(id => id !== deptId)
      : [...current, deptId];
    onChange({ ...value, departmentIds: next });
  };

  const toggleRole = (role: string) => {
    const current = value.roles || [];
    const next = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    onChange({ ...value, roles: next });
  };

  const toggleUser = (userId: string) => {
    const current = value.userIds || [];
    const next = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    onChange({ ...value, userIds: next });
  };

  const toggleAudience = (field: 'includeStudents' | 'includeParents' | 'includeTeachers') => {
    onChange({
      ...value,
      [field]: !value[field]
    });
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="recipient-builder-card">
      <div className="rb-title-section">
        <Users size={16} className="rb-icon-purple" />
        <h4 className="rb-heading">Select Targets & Target Audience</h4>
      </div>

      {/* Target Type Selector */}
      <div className="rb-type-grid">
        {[
          { id: 'all', label: 'All School', icon: Users },
          { id: 'class', label: 'By Class', icon: BookOpen },
          { id: 'section', label: 'By Section', icon: Layers },
          { id: 'department', label: 'By Dept', icon: Briefcase },
          { id: 'role', label: 'By Role', icon: ShieldAlert },
          { id: 'custom', label: 'Custom List', icon: User }
        ].map(t => {
          const Icon = t.icon;
          const isActive = value.type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`rb-type-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleTypeChange(t.id as any)}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Target Content Selection */}
      <div className="rb-content-body">
        {loading && <p className="rb-meta-text">Loading school structure details...</p>}

        {/* 1. BY CLASS */}
        {value.type === 'class' && (
          <div className="rb-scroll-box">
            <label className="rb-section-label">Select Classes / Programs</label>
            {classes.length === 0 ? (
              <p className="rb-meta-text">No Classes/Programs found.</p>
            ) : (
              <div className="rb-checkbox-list">
                {classes.map(c => {
                  const checked = (value.classIds || []).includes(c.id);
                  return (
                    <label key={c.id} className={`rb-checkbox-item ${checked ? 'selected' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleClass(c.id)} />
                      <span>{c.name} ({c.course_code})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. BY SECTION */}
        {value.type === 'section' && (
          <div className="rb-scroll-box">
            <label className="rb-section-label">Select Sections</label>
            {sections.length === 0 ? (
              <p className="rb-meta-text">No Sections found.</p>
            ) : (
              <div className="rb-checkbox-list">
                {sections.map(s => {
                  const checked = (value.sectionIds || []).includes(s.id);
                  return (
                    <label key={s.id} className={`rb-checkbox-item ${checked ? 'selected' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSection(s.id)} />
                      <span>{s.course_name ? `${s.course_name} - ` : ''}{s.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. BY DEPARTMENT */}
        {value.type === 'department' && (
          <div className="rb-scroll-box">
            <label className="rb-section-label">Select Departments</label>
            {departments.length === 0 ? (
              <p className="rb-meta-text">No Departments found.</p>
            ) : (
              <div className="rb-checkbox-list">
                {departments.map(d => {
                  const checked = (value.departmentIds || []).includes(d.id);
                  return (
                    <label key={d.id} className={`rb-checkbox-item ${checked ? 'selected' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleDepartment(d.id)} />
                      <span>{d.name} ({d.code})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. BY ROLE */}
        {value.type === 'role' && (
          <div className="rb-scroll-box">
            <label className="rb-section-label">Select Roles</label>
            <div className="rb-checkbox-list">
              {['Student', 'Parent', 'Teacher', 'Admin', 'Accountant'].map(role => {
                const checked = (value.roles || []).includes(role);
                return (
                  <label key={role} className={`rb-checkbox-item ${checked ? 'selected' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleRole(role)} />
                    <span>{role}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. CUSTOM LIST */}
        {value.type === 'custom' && (
          <div className="rb-custom-container">
            <div className="rb-search-wrapper">
              <Search size={14} className="rb-search-icon" />
              <input
                type="text"
                placeholder="Search students, staff, parents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rb-search-input"
              />
            </div>
            <div className="rb-scroll-box-custom">
              {filteredContacts.length === 0 ? (
                <p className="rb-meta-text">No matching contacts found.</p>
              ) : (
                <div className="rb-contacts-list">
                  {filteredContacts.map(c => {
                    const checked = (value.userIds || []).includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`rb-contact-card ${checked ? 'selected' : ''}`}
                        onClick={() => toggleUser(c.id)}
                      >
                        <div className="rb-contact-avatar">
                          <User size={14} />
                        </div>
                        <div className="rb-contact-info">
                          <div className="rb-contact-name">{c.name}</div>
                          <div className="rb-contact-role">{c.role}</div>
                        </div>
                        {checked && <Check size={14} className="rb-check-icon" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="rb-custom-summary">
              Selected: <strong>{(value.userIds || []).length} users</strong>
            </div>
          </div>
        )}

        {/* 6. ALL SCHOOL */}
        {value.type === 'all' && (
          <p className="rb-meta-text-all">This broadcast will target the entire institution.</p>
        )}
      </div>

      {/* Targets Audience Checkbox Flags (Not applicable for 'role' or 'custom') */}
      {value.type !== 'role' && value.type !== 'custom' && (
        <div className="rb-audience-section">
          <label className="rb-audience-title">Include target audience roles:</label>
          <div className="rb-audience-checkboxes">
            <label className={`rb-audience-checkbox ${value.includeStudents ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={value.includeStudents}
                onChange={() => toggleAudience('includeStudents')}
              />
              <span>Students</span>
            </label>
            <label className={`rb-audience-checkbox ${value.includeParents ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={value.includeParents}
                onChange={() => toggleAudience('includeParents')}
              />
              <span>Parents</span>
            </label>
            <label className={`rb-audience-checkbox ${value.includeTeachers ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={value.includeTeachers}
                onChange={() => toggleAudience('includeTeachers')}
              />
              <span>Teachers</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
