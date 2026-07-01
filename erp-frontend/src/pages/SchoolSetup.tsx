import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Users, Calendar, Layers, Award, Settings,
  FileSpreadsheet, ClipboardList, GraduationCap, BookOpen,
  ArrowRight, Shield, School, ChevronRight
} from 'lucide-react';

interface SetupSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  colorSoft: string;
  items: { label: string; description: string; to: string; icon: React.ReactNode }[];
}

export default function SchoolSetup() {
  const { user } = useAuth();
  const roles = (user as any)?.roles || [(user as any)?.role || ''];
  const isAdmin = roles.some((r: string) => ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal'].includes(r));
  const isHOD = roles.some((r: string) => ['HOD', 'hod'].includes(r));
  const canAdmin = isAdmin || isHOD;

  const sections: SetupSection[] = [
    {
      title: 'School Profile',
      description: 'Core school identity and system configuration',
      icon: <School size={22} />,
      color: '#6366f1',
      colorSoft: 'rgba(99,102,241,0.08)',
      items: [
        {
          label: 'School Information',
          description: 'Name, address, logo, affiliation details',
          to: '/institution-setup',
          icon: <Building2 size={16} />
        },
        {
          label: 'System Settings',
          description: 'Academic calendar, term dates, language',
          to: '/settings',
          icon: <Settings size={16} />
        },
        {
          label: 'Manage Users',
          description: 'Staff accounts, roles and access levels',
          to: '/users',
          icon: <Shield size={16} />
        },
      ]
    },
    {
      title: 'Academic Structure',
      description: 'Classes, years and how learning is organised',
      icon: <GraduationCap size={22} />,
      color: '#8b5cf6',
      colorSoft: 'rgba(139,92,246,0.08)',
      items: [
        {
          label: 'School Years',
          description: 'Define academic years and active sessions',
          to: '/academic-years',
          icon: <Calendar size={16} />
        },
        {
          label: 'Departments',
          description: 'Group teachers and subjects into departments',
          to: '/departments',
          icon: <Layers size={16} />
        },
        {
          label: 'Courses / Programs',
          description: 'Standard I–XII or program-level definitions',
          to: '/programs',
          icon: <BookOpen size={16} />
        },
      ]
    },
    {
      title: 'Grading & Evaluation',
      description: 'How performance is measured and reported',
      icon: <Award size={22} />,
      color: '#f59e0b',
      colorSoft: 'rgba(245,158,11,0.08)',
      items: [
        {
          label: 'Grade Scales',
          description: 'Configure A/B/C or percentage-based grading',
          to: '/settings/grades',
          icon: <Award size={16} />
        },
      ]
    },
    {
      title: 'HR & Leave Policies',
      description: 'Staff leave entitlements and academic structures',
      icon: <Users size={22} />,
      color: '#3b82f6',
      colorSoft: 'rgba(59,130,246,0.08)',
      items: [
        {
          label: 'Leave Quotas',
          description: 'Define annual leave allowances per role',
          to: '/leave/types',
          icon: <Calendar size={16} />
        },
        {
          label: 'School Years',
          description: 'Define academic years and active sessions',
          to: '/academic-years',
          icon: <Calendar size={16} />
        },
        {
          label: 'Departments',
          description: 'Organise teachers and subjects into departments',
          to: '/departments',
          icon: <Layers size={16} />
        },
      ]
    },
    {
      title: 'Data & Compliance',
      description: 'Logs, imports, exports and audit trails',
      icon: <FileSpreadsheet size={22} />,
      color: '#10b981',
      colorSoft: 'rgba(16,185,129,0.08)',
      items: [
        {
          label: 'Data Tools',
          description: 'Bulk import students and teachers via CSV',
          to: '/data-tools',
          icon: <FileSpreadsheet size={16} />
        },
        {
          label: 'Audit Logs',
          description: 'Full history of all changes made in the system',
          to: '/audit-logs',
          icon: <ClipboardList size={16} />
        },
      ]
    },
  ];

  // Filter sections for HOD (no admin-only items)
  const visibleSections = isAdmin ? sections : sections.map(s => ({
    ...s,
    items: s.items.filter(i => !['/users', '/institution-setup', '/settings', '/audit-logs'].includes(i.to))
  })).filter(s => s.items.length > 0);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>School Setup</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Everything you need to configure your school — all in one place
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {visibleSections.map(section => (
          <div key={section.title}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
                background: section.colorSoft, color: section.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {section.icon}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {section.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {section.description}
                </p>
              </div>
            </div>

            {/* Cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              {section.items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = section.color;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 3px ${section.colorSoft}`;
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: '38px', height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      background: section.colorSoft,
                      color: section.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {item.description}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Quick actions footer */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.12)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              First time setting up?
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Start with School Profile → Academic Years → Departments → Classes
            </div>
          </div>
          <Link to="/institution-setup">
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              Start Setup <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
