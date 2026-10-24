import { DashboardShell } from '../components/dashboard-shell';
import { AuthenticatedDashboard } from '@features/auth/components/authenticated-dashboard';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedDashboard><DashboardShell>{children}</DashboardShell></AuthenticatedDashboard>;
}
