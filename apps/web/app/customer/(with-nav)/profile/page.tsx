import CustomerProfile from '../../../CustomerSide/CustomerProfile';
import { getSession } from '../../../../lib/session';
import { prisma } from 'database';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, phone: true, image: true, gender: true, dateOfBirth: true }
    } as any);
  }

  return <CustomerProfile user={user} />;
}
