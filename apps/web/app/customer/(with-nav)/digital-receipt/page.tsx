import CustomerDigitalReceipt from '../../../CustomerSide/CustomerDigitalReceipt';
import { getSession } from '../../../../lib/session';
import { prisma } from 'database';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, image: true }
      } as any);
    } catch (err) {
      console.warn("Database user fetch fallback in digital-receipt:", err);
    }
  }

  return <CustomerDigitalReceipt user={user} />;
}
