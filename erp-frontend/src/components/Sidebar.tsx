import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Clock, CreditCard, GraduationCap, Bell, UserCog, Calendar, BookOpen, Settings, Library, Layers, Bookmark } from 'lucide-react'

export default function Sidebar() {
  const userStr = localStorage.getItem('erp_user')
  const user = userStr ? JSON.parse(userStr) : null
  const role = user?.role

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  if (role === 'admin' || role === 'super_admin') {
    links.push(
      { to: '/academic-years', label: 'Academic Years', icon: Calendar },
      { to: '/programs', label: 'Programs', icon: Library },
      { to: '/sections', label: 'Sections', icon: Layers },
      { to: '/subjects', label: 'Subjects', icon: Bookmark },
    )
  }

  links.push({ to: '/students', label: 'Students', icon: Users })
  links.push({ to: '/teachers', label: 'Teachers', icon: UserCog })

  links.push(
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/timetable', label: 'Timetable', icon: Calendar },
    { to: '/fees', label: 'Fees', icon: CreditCard },
    { to: '/exams', label: 'Exams', icon: GraduationCap },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  )

  if (role === 'admin' || role === 'super_admin') {
    links.push({ to: '/users', label: 'Manage Users', icon: UserCog })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>ERP v2</h3>
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
  )
}
