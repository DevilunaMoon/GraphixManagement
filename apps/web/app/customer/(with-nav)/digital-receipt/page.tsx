import CustomerDigitalReceipt from '../../../CustomerSide/CustomerDigitalReceipt';
import { getSession } from '../../../../lib/session';
import { prisma } from 'database';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, image: true }
    } as any);
  }

  return <CustomerDigitalReceipt user={user} />;
}
