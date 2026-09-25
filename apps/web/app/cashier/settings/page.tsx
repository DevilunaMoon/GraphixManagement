import CashierSettings from '../../CashierSide/CashierSettings';
import { getSession } from '../../../lib/session';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export default async function CashierSettingsPage() {
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
          role: true,
          branch: true,
          status: true,
        },
      } as any);
    } catch (err) {
      console.warn("Database user fetch fallback in cashier settings:", err);
    }
  }

  return <CashierSettings initialUser={user} />;
}
