import CashierChangePassword from '../../CashierSide/CashierChangePassword';
import { getSession } from '../../../lib/session';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, image: true }
    } as any);
  }

  return <CashierChangePassword user={user} />;
}
