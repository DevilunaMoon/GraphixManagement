import CashierLayout from '../../components/CashierSide/CashierLayout';
import { ThemeProvider } from '../../context/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  // If the layout doesn't naturally accept children yet, this wrapper passes it.
  return (
    <ThemeProvider>
      <CashierLayout>{children}</CashierLayout>
    </ThemeProvider>
  );
}
