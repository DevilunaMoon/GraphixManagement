import CustomerMonitoring from '../../../CustomerSide/CustomerMonitoring';
import { getSession } from '../../../../lib/session';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  let user = null;
  if (session?.userId) {
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, phone: true }
      });
    } catch (err) {
      console.warn("User fetch error:", err);
    }
  }

  return <CustomerMonitoring initialUser={user} />;
}
