import CashierProfile from '../../CashierSide/CashierProfile';
import { getSession } from '../../../lib/session';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          gender: true,
          dateOfBirth: true,
          role: true,
          branch: true,
          status: true,
          createdAt: true,
        }
      } as any);
    } catch (err) {
      console.warn("Database user fetch fallback in cashier profile:", err);
    }
  }

  return <CashierProfile user={user} />;
}
