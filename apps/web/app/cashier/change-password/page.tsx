import CashierChangePassword from '../../CashierSide/CashierChangePassword';
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
        select: { id: true, name: true, image: true }
      } as any);
    } catch (err) {
      console.warn("Database user fetch fallback in cashier change-password:", err);
    }
  }

  return <CashierChangePassword user={user} />;
}
