import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Clock, CreditCard, GraduationCap, Bell } from 'lucide-react'

export default function Sidebar() {
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/fees', label: 'Fees', icon: CreditCard },
    { to: '/exams', label: 'Exams', icon: GraduationCap },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>ERP v1</h3>
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
