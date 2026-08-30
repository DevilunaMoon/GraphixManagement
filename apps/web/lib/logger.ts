import { prisma } from 'database';
import { getSession } from './session';

interface LogOptions {
  action: string;
  description: string;
  details?: string | null;
  branch?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
}

export async function logActivity(options: LogOptions) {
  try {
    let { userId, userName, userRole, branch } = options;

    if (!userId || !userRole) {
      const session = await getSession();
      if (session) {
        userId = userId || session.userId;
        userRole = userRole || session.role;
        branch = branch || session.branch;
        if (!userName && userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
          });
          userName = user?.name || user?.email || 'Unknown User';
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        action: options.action,
        description: options.description,
        details: options.details || null,
        branch: branch || 'Tagoloan',
        userId: userId || null,
        userName: userName || 'System',
        userRole: userRole || 'SUPER_ADMIN'
      }
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
