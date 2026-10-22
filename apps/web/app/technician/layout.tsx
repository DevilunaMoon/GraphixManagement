import TechnicianLayout from '../../components/TechnicianSide/TechnicianLayout';
import { ThemeProvider } from '../../context/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TechnicianLayout>{children}</TechnicianLayout>
    </ThemeProvider>
  );
}
