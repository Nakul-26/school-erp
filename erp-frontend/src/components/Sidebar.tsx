import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../services/api';
import { 
  LayoutDashboard, 
  UserCog, 
  Building2, 
  ClipboardList, 
  Calendar, 
  Layers, 
  GraduationCap, 
  School, 
  BookOpen,
  Clock,
  CalendarDays,
  ClipboardCheck,
  Users,
  UserCheck,
  Award,
  Megaphone,
  Bell,
  FileSpreadsheet,
  IndianRupee,
  Receipt,
  BarChart3,
  Upload,
  Settings,
  CheckSquare,
  UserPlus,
  Briefcase,
  Landmark,
  Clipboard,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const userStr = localStorage.getItem('erp_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  
  const isAdmin = roles.includes('super_admin') || roles.includes('Super Admin') || roles.includes('admin') || roles.includes('Principal');
  const isHOD = roles.includes('HOD') || roles.includes('hod');
  const isTeacher = roles.includes('Teacher') || roles.includes('teacher');
  const isAccountant = roles.includes('Accountant') || roles.includes('accountant');

  const [unreadCount, setUnreadCount] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  
  // Sidebar category toggles for collapsing (persisted)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    const saved = sessionStorage.getItem('sidebar_collapsed_categories');
    return saved ? JSON.parse(saved) : {
      'Setup & System': false,
      'Academics': false,
      'Finance & HR': false,
      'Admissions': false
    };
  });

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await api.get('/notifications');
        const count = data.filter((n: any) => n.is_read === 0).length;
        setUnreadCount(count);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUnread();
    window.addEventListener('notifications_updated', fetchUnread);
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      window.removeEventListener('notifications_updated', fetchUnread);
      clearInterval(interval);
    };
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('sidebar_scroll_top');
    if (savedScroll && navRef.current) {
      navRef.current.scrollTop = Number(savedScroll);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sessionStorage.setItem('sidebar_scroll_top', String(e.currentTarget.scrollTop));
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [cat]: !prev[cat] };
      sessionStorage.setItem('sidebar_collapsed_categories', JSON.stringify(next));
      return next;
    });
  };

  // Group links dynamically based on roles
  const groups: Array<{
    title: string;
    links: Array<{ to: string; label: string; icon: any; badge?: number }>;
  }> = [];

  // 1. Overview & General Links (Uncollapsible)
  const overviewLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { to: '/profile', label: 'My Profile', icon: UserCog }
  ];
  groups.push({ title: 'Overview', links: overviewLinks });

  // 2. Admissions Portal
  const admissionLinks: any[] = [];
  if (isAdmin || isHOD) {
    admissionLinks.push(
      { to: '/admissions/inquiries', label: 'Inquiries', icon: UserPlus },
      { to: '/admissions/applications', label: 'Applications', icon: Briefcase }
    );
  }
  if (admissionLinks.length > 0) {
    groups.push({ title: 'Admissions', links: admissionLinks });
  }

  // 3. Core Academics Portal
  const academicLinks: any[] = [];
  if (isAdmin || isHOD || isTeacher) {
    academicLinks.push(
      { to: '/students', label: 'Students List', icon: Users },
      { to: '/timetable', label: 'Weekly Timetable', icon: CalendarDays },
      { to: '/attendance', label: 'Student Attendance', icon: ClipboardCheck },
      { to: '/homework', label: 'Homework Logs', icon: Clipboard },
      { to: '/exams', label: 'Exams & Grading', icon: Award }
    );
  }
  if (isAdmin || isHOD) {
    academicLinks.push(
      { to: '/teachers', label: 'Teachers Directory', icon: UserCheck },
      { to: '/teacher-attendance', label: 'Teacher Attendance', icon: UserCheck }
    );
  }
  academicLinks.push({ to: '/calendar', label: 'Academic Calendar', icon: Calendar });

  if (academicLinks.length > 0) {
    groups.push({ title: 'Academics', links: academicLinks });
  }

  // 4. Finance & HR Portal
  const financeHRLinks: any[] = [];
  if (isAdmin || isHOD || isAccountant) {
    financeHRLinks.push({ to: '/fee-structures', label: 'Fee Structures', icon: IndianRupee });
  }
  if (isAdmin || isHOD || isTeacher || isAccountant) {
    financeHRLinks.push({ to: '/student-fees', label: 'Student Fees', icon: Receipt });
  }
  if (isAdmin || isAccountant) {
    financeHRLinks.push({ to: '/fee-reports', label: 'Fee Reports', icon: BarChart3 });
  }
  if (isAdmin) {
    financeHRLinks.push(
      { to: '/payroll/salary-structures', label: 'Staff Salary Scales', icon: Landmark },
      { to: '/payroll/runs', label: 'Monthly Payroll', icon: Landmark }
    );
  }
  if (isAdmin || isHOD) {
    financeHRLinks.push(
      { to: '/leave/types', label: 'Leave Quotas', icon: BookOpen },
      { to: '/leave/approvals', label: 'Staff Leaves Inbox', icon: ClipboardCheck }
    );
  }
  if (isAdmin || isHOD || isTeacher) {
    financeHRLinks.push({ to: '/student-leaves/approvals', label: 'Student Leaves Inbox', icon: ClipboardCheck });
  }
  financeHRLinks.push({ to: '/leave/my', label: 'My Leave History', icon: CalendarDays });

  if (financeHRLinks.length > 0) {
    groups.push({ title: 'Finance & HR', links: financeHRLinks });
  }

  // 5. System Setup & Configuration
  const setupLinks: any[] = [];
  if (isAdmin || isHOD) {
    setupLinks.push(
      { to: '/academic-years', label: 'Academic Years', icon: Calendar },
      { to: '/departments', label: 'Departments', icon: Layers },
      { to: '/programs', label: 'Courses/Programs', icon: GraduationCap },
      { to: '/classes', label: 'Classes/Sections', icon: School },
      { to: '/subjects', label: 'Subjects', icon: BookOpen },
      { to: '/allocations', label: 'Teaching Allocations', icon: ClipboardList },
      { to: '/timetable-slots', label: 'Timetable Slots', icon: Clock },
      { to: '/approvals', label: 'Approvals Inbox', icon: CheckSquare }
    );
  }
  if (isAdmin) {
    setupLinks.push(
      { to: '/users', label: 'Manage Users', icon: UserCog },
      { to: '/institution-setup', label: 'Institution Setup', icon: Building2 },
      { to: '/settings', label: 'System Settings', icon: Settings },
      { to: '/settings/grades', label: 'Grade Scaling', icon: Award },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { to: '/exports', label: 'Data Export', icon: FileSpreadsheet },
      { to: '/imports', label: 'Bulk Import', icon: Upload }
    );
  }
  if (setupLinks.length > 0) {
    groups.push({ title: 'Setup & System', links: setupLinks });
  }

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0f172a' }}>
      <div className="sidebar-header" style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b' }}>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem', color: '#38bdf8', letterSpacing: '-0.025em' }}>School ERP</h3>
      </div>
      
      <nav className="sidebar-nav" ref={navRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {groups.map((group) => {
          const isOverview = group.title === 'Overview';
          const isCollapsed = collapsedCategories[group.title];

          return (
            <div key={group.title} style={{ marginBottom: '1.25rem' }}>
              {/* Category Header */}
              {!isOverview ? (
                <div 
                  onClick={() => toggleCategory(group.title)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.4rem 0.5rem', 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    cursor: 'pointer',
                    borderRadius: '4px',
                    userSelect: 'none'
                  }}
                  className="sidebar-category-header"
                >
                  <span>{group.title}</span>
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </div>
              ) : (
                <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {group.title}
                </div>
              )}

              {/* Links list */}
              {(!isCollapsed || isOverview) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem', paddingLeft: isOverview ? '0' : '0.25rem' }}>
                  {group.links.map((link) => (
                    <NavLink 
                      key={link.to} 
                      to={link.to} 
                      className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                      onClick={onNavigate}
                    >
                      <link.icon size={16} />
                      <span>{link.label}</span>
                      {link.badge !== undefined && link.badge > 0 && (
                        <span className="badge badge-danger" style={{ marginLeft: 'auto', padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                          {link.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
