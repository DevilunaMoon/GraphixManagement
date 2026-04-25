import CustomerDashboard from '../../../CustomerSide/CustomerDashboard';
import { getSession } from '../../../../lib/session';
import { prisma } from 'database';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true }
    } as any); // Using as any avoids strict type mismatch if schema changes
  }

  return <CustomerDashboard user={user ? { ...user, name: user.name || "Customer" } : null} />;
}
