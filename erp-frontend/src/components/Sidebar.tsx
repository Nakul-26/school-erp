import './Sidebar.css';
import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
import { useAuth } from '../contexts/AuthContext';

const FEATURES = {
  homework: true,
  library: false,
  transport: false,
  certificates: false,
  alumni: false,
  visitors: false,
  assets: false,
  calendar: false,
  leave: false,
  approvals: false,
};

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  const permissions: string[] = user?.permissions || [];
  const navigate = useNavigate();
  const location = useLocation();

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
    return saved ? JSON.parse(saved) : {};
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
    return () => {
      window.removeEventListener('notifications_updated', fetchUnread);
      clearInterval(iv);
    };
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

  const isTeacherOnly = isTeacher && !isAdmin && !isHOD;

  type Link = { to: string; label: string; icon: any; badge?: number; feature?: keyof typeof FEATURES };
  type Group = { key: string; label: string; links: Link[]; always?: boolean };

  const allGroups: Group[] = [
    {
      key: 'core', label: 'Core', always: true,
      links: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/communication', label: 'Communication', icon: MessageSquare, badge: unreadMessages + unreadCount },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      key: 'people', label: 'People',
      links: [
        { to: '/admissions', label: 'Admissions', icon: UserPlus },
        { to: '/students', label: isTeacherOnly ? 'My Students' : 'Students', icon: Users },
        { to: '/teachers', label: 'Teachers', icon: UserCheck },
        { to: '/alumni', label: 'Alumni', icon: GraduationCap, feature: 'alumni' },
      ],
    },
    {
      key: 'academics', label: 'Academics',
      links: [
        { to: '/academic-setup', label: 'Academic Setup', icon: Layers },
        { to: '/classes', label: 'Classes', icon: School },
        { to: '/subjects', label: 'Subjects', icon: BookOpen },
        { to: '/timetable', label: 'Timetable', icon: CalendarDays },
        { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
        { to: '/exams', label: 'Exams & Results', icon: Award },
        { to: '/homework', label: 'Homework', icon: Clipboard, feature: 'homework' },
        { to: '/calendar', label: 'Calendar', icon: Calendar, feature: 'calendar' },
      ],
    },
    {
      key: 'finance', label: 'Finance & Operations',
      links: [
        { to: '/finance', label: 'Finance', icon: IndianRupee },
        { to: '/library', label: 'Library', icon: Library, feature: 'library' },
        { to: '/transport', label: 'Transport', icon: Bus, feature: 'transport' },
        { to: '/certificates', label: 'Certificates', icon: Award, feature: 'certificates' },
        { to: '/visitors', label: 'Visitors', icon: UserPlus, feature: 'visitors' },
        { to: '/assets', label: 'Assets', icon: Package, feature: 'assets' },
      ],
    },
    {
      key: 'leave', label: 'Leave & Approvals',
      links: [
        { to: '/leave/my', label: 'My Leave', icon: CalendarDays, feature: 'leave' },
        { to: '/leave/types', label: 'Leave Types', icon: ClipboardList, feature: 'leave' },
        { to: '/leave/approvals', label: 'Leave Approvals', icon: CheckSquare, feature: 'leave' },
        { to: '/student-leaves/approvals', label: 'Student Leave', icon: ClipboardCheck, feature: 'leave' },
        { to: '/approvals', label: 'Approvals Inbox', icon: CheckSquare, feature: 'approvals' },
      ],
    },
    {
      key: 'admin', label: 'Administration',
      links: [
        { to: '/setup', label: 'School Setup', icon: Settings },
        { to: '/institution-setup', label: 'Institution Setup', icon: Building2 },
        { to: '/settings', label: 'Settings', icon: Settings },
        { to: '/data-tools', label: 'Data Tools', icon: FileSpreadsheet },
        { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
        { to: '/access-control', label: 'Access Control', icon: UserCog },
      ],
    },
  ];

  const groups: Group[] = allGroups.map(group => {
    const filteredLinks = group.links.filter(link => {
      if (link.feature && !FEATURES[link.feature]) return false;
      if (link.to === '/dashboard') return true;
      const pathOnly = link.to.split('?')[0] || '';
      return isAllowedNav(roles, permissions, pathOnly);
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
            <span className="sidebar-brand-tag">Management Portal</span>
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
          const isFlat = group.label === '';
          const isCollapsed = !isFlat && !group.always && collapsed[group.key];
          return (
            <div key={group.key} style={{ marginBottom: isFlat ? '0.5rem' : '0' }}>
              {!isFlat && (
                <div onClick={() => toggle(group.key)} className="sidebar-row-6">
                  <span>{group.label}</span>
                  <span className="sidebar-span-7">
                    {isCollapsed ? <ChevronRight size={9} /> : <ChevronDown size={9} />}
                  </span>
                </div>
              )}
              {(!isCollapsed || isFlat || group.always) && (
                <div className="sidebar-col-8">
                  {group.links.map((link) => {
                    const isLinkActive = (() => {
                      const linkPath = link.to.split('?')[0];
                      const linkQuery = link.to.split('?')[1] || '';
                      
                      const isPathMatch = location.pathname === linkPath;
                      let isQueryMatch = true;
                      
                      if (linkQuery) {
                        const searchParams = new URLSearchParams(location.search);
                        const linkParams = new URLSearchParams(linkQuery);
                        for (const [key, val] of linkParams.entries()) {
                          if (searchParams.get(key) !== val) {
                            isQueryMatch = false;
                            break;
                          }
                        }
                      }
                      
                      return isPathMatch && isQueryMatch;
                    })();

                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={isLinkActive ? 'nav-link active' : 'nav-link'}
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
                    );
                  })}
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
