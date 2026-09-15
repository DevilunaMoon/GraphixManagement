import CustomerDashboard from '../../../CustomerSide/CustomerDashboard';
import { getSession } from '../../../../lib/session';
import { prisma } from 'database';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true }
      } as any);
    } catch (err) {
      console.warn("Database user fetch fallback in customer dashboard:", err);
    }
  }

  return <CustomerDashboard user={user ? { ...user, name: user.name || "Customer" } : null} />;
}
