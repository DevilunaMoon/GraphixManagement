import AdminLayout from '../../components/AdminSide/AdminLayout';
import { ThemeProvider } from '../../context/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AdminLayout>{children}</AdminLayout>
    </ThemeProvider>
  );
}
