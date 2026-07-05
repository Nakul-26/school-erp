import './Sidebar.css';
import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  LayoutDashboard, GraduationCap, UserCheck, School, ClipboardCheck,
  Award, IndianRupee, Settings, Megaphone, Bell, UserCog,
  ChevronDown, ChevronRight, LogOut, Users, Calendar,
  ClipboardList, FileSpreadsheet, Building2, Layers, BookOpen,
  BarChart3, Landmark, CalendarDays, UserPlus, Clipboard, CheckSquare,
  Library, Bus, MessageSquare, Package
} from 'lucide-react';
import { isAllowedNav } from '../config/roleNav';

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const userStr = localStorage.getItem('erp_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  const navigate = useNavigate();

  const normalizedRoles = roles.map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  const isAdmin = normalizedRoles.some(r => ['super_admin', 'admin', 'principal'].includes(r));
  const isHOD = normalizedRoles.some(r => ['hod'].includes(r));
  const isTeacher = normalizedRoles.some(r => ['teacher'].includes(r));
  const isAccountant = normalizedRoles.some(r => ['accountant'].includes(r));
  const canAdmin = isAdmin || isHOD;
  const canStaff = isAdmin || isHOD || isTeacher;

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);

  // Multi-branch state (Phase C)
  const [branches, setBranches] = useState<any[]>([]);
  const isSuperAdmin = normalizedRoles.some(r => ['super_admin'].includes(r));

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/institutions')
        .then(data => setBranches(data))
        .catch(err => console.error('Failed to load branches:', err));
    }
  }, [isSuperAdmin]);

  const handleBranchSwitch = async (instId: string) => {
    if (!instId) return;
    try {
      const res = await api.post('/auth/switch-branch', { institution_id: instId });
      localStorage.setItem('erp_token', res.token);
      localStorage.setItem('erp_user', JSON.stringify(res.user));
      window.location.reload();
    } catch (err) {
      alert('Failed to switch branch.');
    }
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const saved = sessionStorage.getItem('sidebar_v2_collapsed');
    return saved ? JSON.parse(saved) : {
      Admissions: false, People: false, Academics: false,
      'Finance & HR': false, Reports: false, 'Settings & Setup': true,
    };
  });

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await api.get('/notifications');
        setUnreadCount(data.filter((n: any) => n.is_read === 0).length);
      } catch { /* silent */ }
      try {
        const msgData = await api.get('/messaging/unread-count');
        setUnreadMessages(msgData.count || 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    window.addEventListener('notifications_updated', fetchUnread);
    const iv = setInterval(fetchUnread, 30000);
    return () => { window.removeEventListener('notifications_updated', fetchUnread); clearInterval(iv); };
  }, []);

  useEffect(() => {
    const s = sessionStorage.getItem('sidebar_scroll_top');
    if (s && navRef.current) navRef.current.scrollTop = Number(s);
  }, []);

  const toggle = (key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      sessionStorage.setItem('sidebar_v2_collapsed', JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    navigate('/login');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = roles[0] || 'Staff';

  type Link = { to: string; label: string; icon: any; badge?: number };
  type Group = { key: string; label: string; links: Link[]; always?: boolean };

  const allGroups: Group[] = [
    {
      key: '__overview', label: '', always: true,
      links: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/messaging', label: 'Direct Messages', icon: MessageSquare, badge: unreadMessages },
      ],
    },
    {
      key: 'Admissions', label: 'Admissions',
      links: [{ to: '/admissions', label: 'Admission Pipeline', icon: UserPlus }],
    },
    {
      key: 'People', label: 'People',
      links: [
        { to: '/students', label: 'Students', icon: Users },
        { to: '/teachers', label: 'Teachers', icon: UserCheck },
        { to: '/alumni', label: 'Alumni Directory', icon: GraduationCap },
        { to: '/visitors', label: 'Visitor Log', icon: ClipboardList },
      ],
    },
    {
      key: 'Academics', label: 'Academics',
      links: [
        { to: '/classes', label: 'Classes & Sections', icon: School },
        { to: '/subjects', label: 'Subjects', icon: BookOpen },
        { to: '/timetable', label: 'Timetable', icon: CalendarDays },
        { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
        { to: '/homework', label: 'Homework', icon: Clipboard },
        { to: '/exams', label: 'Exams & Results', icon: Award },
        { to: '/library', label: 'Library', icon: Library },
        { to: '/calendar', label: 'School Calendar', icon: Calendar },
      ],
    },
    {
      key: 'Finance & HR', label: 'Finance & HR',
      links: [
        { to: '/fee-structures', label: 'Fee Plans', icon: IndianRupee },
        { to: '/student-fees', label: 'Student Fees', icon: IndianRupee },
        { to: '/payroll/salary-structures', label: 'Salary Scales', icon: Landmark },
        { to: '/payroll/runs', label: 'Payroll Runs', icon: Landmark },
        { to: '/leave/approvals', label: 'Leave Approvals', icon: CheckSquare },
        { to: '/student-leaves/approvals', label: 'Student Leave', icon: CheckSquare },
        { to: '/leave/my', label: 'My Leave', icon: CalendarDays },
        { to: '/transport', label: 'Transport', icon: Bus },
        { to: '/assets', label: 'School Assets', icon: Package },
      ],
    },
    {
      key: 'Reports', label: 'Reports',
      links: [
        { to: '/reports', label: 'All Reports', icon: BarChart3 },
        { to: '/certificates', label: 'Official Certificates', icon: Award },
      ],
    },
    {
      key: 'Settings & Setup', label: 'Settings & Setup',
      links: [
        { to: '/approvals', label: 'Approvals Inbox', icon: CheckSquare },
        { to: '/setup', label: 'School Setup', icon: Settings },
      ],
    },
  ];

  const groups: Group[] = allGroups.map(group => {
    const filteredLinks = group.links.filter(link => {
      if (link.to === '/dashboard') return true;
      return isAllowedNav(roles, link.to);
    });
    return { ...group, links: filteredLinks };
  }).filter(group => group.always || group.links.length > 0);

  return (
    <div className="sidebar-col-1">
      {/* Brand */}
      <div className="sidebar-div-2">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <School size={16} color="white" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">{user?.institution_name || 'School ERP'}</span>
            <span className="sidebar-brand-tag">Management aaaa Portal</span>
          </div>
        </div>

        {isSuperAdmin && branches.length > 0 && (
          <div className="sidebar-div-3">
            <select value={user?.institution_id || ''} onChange={(e) => handleBranchSwitch(e.target.value)} className="sidebar-select-4">
              <option value="">-- Switch Branch --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav ref={navRef} onScroll={(e) => sessionStorage.setItem('sidebar_scroll_top', String(e.currentTarget.scrollTop))} className="sidebar-col-5">
        {groups.map((group) => {
          const isOverview = group.key === '__overview';
          const isCollapsed = !isOverview && !group.always && collapsed[group.key];
          return (
            <div key={group.key} style={{ marginBottom: isOverview ? '0.5rem' : '0' }}>
              {!isOverview && (
                <div onClick={() => toggle(group.key)} className="sidebar-row-6">
                  <span>{group.label}</span>
                  <span className="sidebar-span-7">
                    {isCollapsed ? <ChevronRight size={9} /> : <ChevronDown size={9} />}
                  </span>
                </div>
              )}
              {(!isCollapsed || isOverview || group.always) && (
                <div className="sidebar-col-8">
                  {group.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                      onClick={onNavigate}
                    >
                      <link.icon size={14} />
                      <span className="sidebar-span-9">{link.label}</span>
                      {(link.badge ?? 0) > 0 && (
                        <span className="sidebar-span-10">
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

        <div className="sidebar-div-11">
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={onNavigate}>
            <UserCog size={14} />
            <span>My Profile</span>
          </NavLink>
        </div>
      </nav>

      {/* User pill */}
      <div className="sidebar-user-pill sidebar-user-pill" onClick={() => { navigate('/profile'); if (onNavigate) onNavigate(); }} title="View profile">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-role">{roleLabel}</div>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="sidebar-row-13" onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.backgroundColor = 'transparent'; }} title="Logout">
          <LogOut size={13} className="sidebar-LogOut-14"  />
        </button>
      </div>
    </div>
  );
}
