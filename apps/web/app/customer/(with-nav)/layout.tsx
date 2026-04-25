import CustomerLayout from '../../../components/CustomerSide/CustomerLayout';
import { getSession } from '../../../lib/session';
import { prisma } from 'database';
import { ThemeProvider } from '../../../context/ThemeContext';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, role: true, image: true }
    } as any);
  }

  return (
    <ThemeProvider>
      <CustomerLayout user={user}>{children}</CustomerLayout>
    </ThemeProvider>
  );
}
