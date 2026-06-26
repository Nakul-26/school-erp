import React, { useEffect, useState } from 'react';
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
  CheckSquare
} from 'lucide-react';

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const userStr = localStorage.getItem('erp_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  
  const isAdmin = roles.includes('super_admin') || roles.includes('Super Admin') || roles.includes('admin') || roles.includes('Principal');
  const isHOD = roles.includes('HOD') || roles.includes('hod');
  const isTeacher = roles.includes('Teacher') || roles.includes('teacher');
  const isAccountant = roles.includes('Accountant') || roles.includes('accountant');

  const [unreadCount, setUnreadCount] = useState(0);

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
    
    // Listen for custom notification update event
    window.addEventListener('notifications_updated', fetchUnread);
    // Poll notifications every 30 seconds for live updates
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      window.removeEventListener('notifications_updated', fetchUnread);
      clearInterval(interval);
    };
  }, []);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (isAdmin) {
    links.push(
      { to: '/users', label: 'Manage Users', icon: UserCog },
      { to: '/institution-setup', label: 'Institution Setup', icon: Building2 },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { to: '/exports', label: 'Data Export', icon: FileSpreadsheet },
      { to: '/imports', label: 'Bulk Import', icon: Upload },
      { to: '/settings', label: 'System Settings', icon: Settings }
    );
  }

  if (isAdmin || isHOD) {
    links.push(
      { to: '/academic-years', label: 'Academic Years', icon: Calendar },
      { to: '/departments', label: 'Departments', icon: Layers },
      { to: '/programs', label: 'Courses/Programs', icon: GraduationCap },
      { to: '/classes', label: 'Classes/Sections', icon: School },
      { to: '/subjects', label: 'Subjects', icon: BookOpen },
      { to: '/allocations', label: 'Teaching Allocations', icon: ClipboardList },
      { to: '/approvals', label: 'Approvals Inbox', icon: CheckSquare }
    );
  }

  // Academic Calendar is viewable by everyone
  links.push({ to: '/calendar', label: 'Academic Calendar', icon: Calendar });

  // Timetable Slots only manage by Admin/HOD
  if (isAdmin || isHOD) {
    links.push({ to: '/timetable-slots', label: 'Timetable Slots', icon: Clock });
  }

  // Weekly Timetable and Attendance for teaching staff/HOD/Admin
  if (isAdmin || isHOD || isTeacher) {
    links.push(
      { to: '/timetable', label: 'Weekly Timetable', icon: CalendarDays },
      { to: '/attendance', label: 'Student Attendance', icon: ClipboardCheck }
    );
  }

  // Teacher Attendance (Principal / Admin / HOD manage)
  if (isAdmin || isHOD) {
    links.push({ to: '/teacher-attendance', label: 'Teacher Attendance', icon: UserCheck });
  }

  // Academic lifecycle (Batch 2) links
  if (isAdmin || isHOD || isTeacher) {
    links.push({ to: '/students', label: 'Students', icon: Users });
  }
  if (isAdmin || isHOD) {
    links.push({ to: '/teachers', label: 'Teachers', icon: UserCheck });
  }
  if (isAdmin || isHOD || isTeacher) {
    links.push({ to: '/exams', label: 'Exams', icon: Award });
  }

  // Finance Phase (Batch 4) links
  if (isAdmin || isHOD || isAccountant) {
    links.push({ to: '/fee-structures', label: 'Fee Structures', icon: IndianRupee });
  }
  if (isAdmin || isHOD || isTeacher || isAccountant) {
    links.push({ to: '/student-fees', label: 'Student Fees', icon: Receipt });
  }
  if (isAdmin || isAccountant) {
    links.push({ to: '/fee-reports', label: 'Fee Reports', icon: BarChart3 });
  }

  // Reports (Batch 3)
  if (isAdmin || isHOD || isTeacher) {
    links.push({ to: '/attendance-reports', label: 'Attendance Reports', icon: FileSpreadsheet });
  }
  if (isAdmin || isHOD) {
    links.push({ to: '/teacher-reports', label: 'Teacher Reports', icon: FileSpreadsheet });
  }

  // Communication (Batch 3)
  links.push(
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/notifications', label: 'Notifications', icon: Bell }
  );

  // Profile (Batch 5)
  links.push({ to: '/profile', label: 'My Profile', icon: UserCog });

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>ERP Foundation</h3>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to} 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={onNavigate}
          >
            <link.icon size={20} />
            <span>{link.label}</span>
            {link.to === '/notifications' && unreadCount > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 'auto', padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
