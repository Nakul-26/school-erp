import './BottomNav.css';
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare, Clipboard,
  Award, IndianRupee, BarChart3, CalendarDays, Library, UserPlus, CheckSquare, Bell
} from 'lucide-react';
import { canAccessPath } from '../config/roleNav';

interface BottomNavProps {
  roles: string[];
  permissions?: string[];
}

export default function BottomNav({ roles, permissions = [] }: BottomNavProps) {
  const primaryRole = roles[0] || 'Teacher';
  const roleKey = primaryRole.toLowerCase().replace(' ', '_').replace('role-', '');

  type NavItem = { to: string; label: string; icon: any };

  // Define 5 key items per role for bottom navigation
  const bottomNavMap: Record<string, NavItem[]> = {
    super_admin: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admissions', label: 'Admissions', icon: UserPlus },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/setup', label: 'Setup', icon: CheckSquare },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    principal: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admissions', label: 'Admissions', icon: UserPlus },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    admin: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admissions', label: 'Admissions', icon: UserPlus },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    hod: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/timetable', label: 'Timetable', icon: CalendarDays },
      { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    teacher: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/homework', label: 'Homework', icon: Clipboard },
      { to: '/exams', label: 'Exams', icon: Award },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    accountant: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/student-fees', label: 'Collect', icon: IndianRupee },
      { to: '/fee-structures', label: 'Plans', icon: IndianRupee },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    student: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/timetable', label: 'Timetable', icon: CalendarDays },
      { to: '/homework', label: 'Homework', icon: Clipboard },
      { to: '/library', label: 'Library', icon: Library },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ],
    parent: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/timetable', label: 'Timetable', icon: CalendarDays },
      { to: '/homework', label: 'Homework', icon: Clipboard },
      { to: '/student-fees', label: 'Fees', icon: IndianRupee },
      { to: '/communication?tab=inbox', label: 'Chat', icon: MessageSquare }
    ]
  };

  const subject = { roles, permissions };
  const navItems = (bottomNavMap[roleKey] || bottomNavMap['teacher'] || []).filter(item => canAccessPath(subject, item.to));

  return (
    <div className="bottom-nav bottom-nav">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link') + " bottom-nav-col-2"}>
          <item.icon size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
