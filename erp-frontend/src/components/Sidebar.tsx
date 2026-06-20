import { NavLink } from 'react-router-dom';
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
  Award
} from 'lucide-react';

export default function Sidebar() {
  const userStr = localStorage.getItem('erp_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  
  const isAdmin = roles.includes('super_admin') || roles.includes('Super Admin') || roles.includes('admin') || roles.includes('Principal');
  const isHOD = roles.includes('HOD') || roles.includes('hod');
  const isTeacher = roles.includes('Teacher') || roles.includes('teacher');

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (isAdmin) {
    links.push(
      { to: '/users', label: 'Manage Users', icon: UserCog },
      { to: '/institution-setup', label: 'Institution Setup', icon: Building2 },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList }
    );
  }

  if (isAdmin || isHOD) {
    links.push(
      { to: '/academic-years', label: 'Academic Years', icon: Calendar },
      { to: '/departments', label: 'Departments', icon: Layers },
      { to: '/programs', label: 'Courses/Programs', icon: GraduationCap },
      { to: '/classes', label: 'Classes/Sections', icon: School },
      { to: '/subjects', label: 'Subjects', icon: BookOpen }
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
      { to: '/attendance', label: 'Attendance', icon: ClipboardCheck }
    );
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
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
