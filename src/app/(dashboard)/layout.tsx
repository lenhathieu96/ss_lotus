import { DashboardShell } from '../../components/layout/dashboard-shell';
import { AuthenticatedDashboard } from '../../features/auth/authenticated-dashboard';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedDashboard><DashboardShell>{children}</DashboardShell></AuthenticatedDashboard>;
}
