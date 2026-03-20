import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  BedDouble,
  Users,
  MessageCircle,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Share2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ShareModal from '@/components/share/ShareModal';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
  { to: '/bookings', icon: BookOpen, labelKey: 'nav.bookings' },
  { to: '/rooms', icon: BedDouble, labelKey: 'nav.rooms' },
  { to: '/guests', icon: Users, labelKey: 'nav.guests' },
  { to: '/messages', icon: MessageCircle, labelKey: 'nav.messages' },
  { to: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
] as const;

export default function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ka' ? 'en' : 'ka');
  };

  const sidebar = (
    <nav className="flex flex-col h-full bg-[#0D2137] text-white">
      {/* Logo */}
      <div className="px-5 py-6">
        <span className="text-xl font-bold tracking-tight">GuestFlow.ge</span>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#117A65] text-white font-medium'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>

      {/* Bottom: user + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="text-sm text-gray-400 truncate px-3 mb-2">
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-60 h-full z-50">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {user?.first_name ? `${user.first_name}'s` : ''} GuestFlow
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-[#117A65] text-[#117A65] hover:bg-[#117A65]/10 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.share')}</span>
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {i18n.language === 'ka' ? 'EN' : 'KA'}
            </button>

            {/* Notification bell */}
            <button className="p-2 text-gray-500 hover:text-gray-700 relative">
              <Bell className="w-5 h-5" />
            </button>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-[#117A65] text-white flex items-center justify-center text-sm font-medium">
              {user?.first_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-[#F8F9FA] p-4 lg:p-6">
          <Outlet context={{ openShareModal: () => setShareOpen(true) }} />
        </main>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
