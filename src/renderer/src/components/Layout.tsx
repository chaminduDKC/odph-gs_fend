import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Car, Wrench, Package, Truck, 
  ShoppingCart, DollarSign, Bike, UserCircle, Calendar, 
  CreditCard, FileText, BarChart, LogOut, ChevronLeft, ChevronRight, Menu 
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/customers', label: 'Customers', icon: Users },
        { path: '/vehicles', label: 'Vehicles', icon: Car },
        { path: '/jobs', label: 'Jobs', icon: Wrench },
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { path: '/inventory', label: 'Inventory', icon: Package },
        { path: '/suppliers', label: 'Suppliers', icon: Truck },
        { path: '/purchases', label: 'Purchases', icon: ShoppingCart },
        { path: '/sales', label: 'Sales', icon: DollarSign },
      ]
    },
    {
      title: 'BICYCLES',
      items: [
        { path: '/bicycles', label: 'Bicycles', icon: Bike },
      ]
    },
    {
      title: 'HR',
      items: [
        { path: '/workers', label: 'Workers', icon: UserCircle },
        { path: '/attendance', label: 'Attendance', icon: Calendar },
        { path: '/salary', label: 'Salary', icon: CreditCard },
        { path: '/paysheet', label: 'Paysheet', icon: FileText },
      ]
    },
    {
      title: 'ANALYTICS',
      items: [
        { path: '/reports', label: 'Reports', icon: BarChart },
      ]
    }
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-300 ${
          isCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border)] no-drag">
          {!isCollapsed && (
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <Wrench className="w-5 h-5 text-[var(--color-accent)]" />
              <span>OGPH Admin</span>
            </div>
          )}
          {isCollapsed && <Wrench className="w-6 h-6 mx-auto text-[var(--color-accent)]" />}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] no-drag"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 no-drag">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-6">
              {!isCollapsed && (
                <div className="px-4 mb-2 text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">
                  {group.title}
                </div>
              )}
              <nav className="space-y-1 px-2">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-md transition-colors
                      ${isActive 
                        ? 'bg-[rgba(245,158,11,0.1)] text-[var(--color-accent)]' 
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-white'
                      }
                    `}
                  >
                    <item.icon size={20} className={isCollapsed ? 'mx-auto' : ''} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] no-drag">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate">{user?.username}</span>
                <span className="text-xs text-[var(--color-text-muted)] capitalize">{user?.role.toLowerCase()}</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] -webkit-app-region drag">
          <div className="no-drag font-medium text-lg text-white">
            {/* Could inject dynamic page title here via context, but we will rely on page headers */}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        
        <div className="flex-1 overflow-auto bg-[var(--color-bg-primary)] p-6 no-drag">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
