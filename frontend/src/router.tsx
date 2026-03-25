import { Navigate, type RouteObject } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import RoomsPage from '@/pages/rooms/RoomsPage';
import BookingsPage from '@/pages/bookings/BookingsPage';
import CalendarPage from '@/pages/bookings/CalendarPage';
import GuestsPage from '@/pages/guests/GuestsPage';
import GuestDetailPage from '@/pages/guests/GuestDetailPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import PublicLayout from '@/components/public/PublicLayout';
import PublicBookingPage from '@/pages/public/PublicBookingPage';
import BookingDetailPage from '@/pages/bookings/BookingDetailPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import LandingPage from '@/pages/LandingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <PublicRoute><LoginPage /></PublicRoute>,
  },
  {
    path: '/register',
    element: <PublicRoute><RegisterPage /></PublicRoute>,
  },
  {
    path: '/book/:slug',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicBookingPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'bookings/:id', element: <BookingDetailPage /> },
      { path: 'rooms', element: <RoomsPage /> },
      { path: 'guests', element: <GuestsPage /> },
      { path: 'guests/:id', element: <GuestDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
