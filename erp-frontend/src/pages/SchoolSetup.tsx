import './SchoolSetup.css';
import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Users, Calendar, Layers, Award, Settings,
  FileSpreadsheet, ClipboardList, GraduationCap, BookOpen,
  ArrowRight, Shield, School, ChevronRight, Clock
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
          label: 'General Settings',
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
        {
          label: 'Period Timings',
          description: 'Configure standard school periods and timings',
          to: '/timetable?tab=periods',
          icon: <Clock size={16} />
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
          to: '/settings?tab=grades',
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
          <p className="school-setup-text-1">
            Everything you need to configure your school — all in one place
          </p>
        </div>
      </div>

      <div className="school-setup-col-2">
        {visibleSections.map(section => (
          <div key={section.title}>
            {/* Section Header */}
            <div className="school-setup-row-3">
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
                background: section.colorSoft, color: section.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {section.icon}
              </div>
              <div>
                <h3 className="school-setup-title-4">
                  {section.title}
                </h3>
                <p className="school-setup-text-5">
                  {section.description}
                </p>
              </div>
            </div>

            {/* Cards grid */}
            <div className="school-setup-grid-6">
              {section.items.map(item => (
                <Link key={item.to} to={item.to} className="school-setup-Link-7">
                  <div className="card school-setup-card" onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = section.color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 3px ${section.colorSoft}`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
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
                    <div className="school-setup-div-9">
                      <div className="school-setup-div-10">
                        {item.label}
                      </div>
                      <div className="school-setup-div-11">
                        {item.description}
                      </div>
                    </div>
                    <ChevronRight size={16} className="school-setup-ChevronRight-12"  />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Quick actions footer */}
        <div className="school-setup-row-13">
          <div>
            <div className="school-setup-div-14">
              First time setting up?
            </div>
            <div className="school-setup-div-15">
              Start with School Profile → Academic Years → Departments → Classes
            </div>
          </div>
          <Link to="/institution-setup">
            <button className="btn btn-primary school-setup-btn">
              Start Setup <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
