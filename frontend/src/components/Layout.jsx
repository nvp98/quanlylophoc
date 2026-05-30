import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  DollarSign,
  BarChart2,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/students', label: 'Học sinh', icon: Users },
  { path: '/teachers', label: 'Giáo viên', icon: GraduationCap },
  { path: '/classes', label: 'Lớp học', icon: BookOpen },
  { path: '/attendance', label: 'Điểm danh', icon: ClipboardCheck },
  { path: '/finance', label: 'Tài chính', icon: DollarSign },
  { path: '/results', label: 'Kết quả', icon: BarChart2 },
]

export function Layout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const currentNav = navItems.find(item => item.path === location.pathname)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-indigo-900 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Quản Lý</p>
              <p className="text-indigo-300 text-xs">Lớp Học Thêm</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-indigo-300 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-indigo-400 group-hover:text-white'} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-indigo-300" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-indigo-800">
          <p className="text-indigo-400 text-xs text-center">v1.0.0 &copy; 2025</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {title || currentNav?.label || 'Tổng quan'}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-700 font-semibold text-sm">A</span>
            </div>
            <span className="text-sm text-gray-600 hidden sm:inline">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
