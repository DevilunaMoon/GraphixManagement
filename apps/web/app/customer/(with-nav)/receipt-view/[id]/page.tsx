import CustomerReceiptView from '../../../../CustomerSide/CustomerReceiptView';
import { getSession } from '../../../../../lib/session';
import { prisma } from 'database';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, image: true }
    } as any);
  }

  return <CustomerReceiptView user={user} orderId={resolvedParams.id} />;
}
