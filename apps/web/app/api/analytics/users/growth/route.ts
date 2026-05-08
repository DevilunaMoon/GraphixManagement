import { NextResponse } from 'next/server';
import { prisma } from 'database';

export const revalidate = 3600; // Cache this route for 1 hour to optimize database hits

export async function GET() {
  try {
    const now = new Date();
    // Get the start date of the month, 5 months ago
    const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Optimized: Only fetch the 'createdAt' field for customers who registered in the last 5 months
    const users = await prisma.user.findMany({
      select: { createdAt: true },
      where: { 
        role: 'CUSTOMER',
        createdAt: {
          gte: fiveMonthsAgo
        }
      }
    });

    const monthlyCounts: Record<string, number> = {};
    
    // Group users by month and year
    users.forEach(u => {
      const date = new Date(u.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`; 
      if (!monthlyCounts[key]) {
        monthlyCounts[key] = 0;
      }
      monthlyCounts[key]++;
    });

    const lastMonths: { key: string, monthName: string, count: number }[] = [];
    
    // Get data for the last 5 months (to show 4 months + 1 for trend calculation)
    for (let i = 0; i < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = d.toLocaleString('default', { month: 'long' });
      
      lastMonths.push({
        key,
        monthName,
        count: monthlyCounts[key] || 0
      });
    }

    // Calculate trends
    const result = lastMonths.map((m, i) => {
      let trendStr = "0%";
      let trendUp = true;
      
      // Look at the PREVIOUS chronological month (which is index i+1 in our array)
      if (i < lastMonths.length - 1) {
        const prevMonthCount = lastMonths[i + 1]?.count || 0;
        if (prevMonthCount > 0) {
          const diff = m.count - prevMonthCount;
          const percent = Math.round((Math.abs(diff) / prevMonthCount) * 100);
          trendStr = `${percent}%`;
          trendUp = diff >= 0;
        } else if (m.count > 0) {
          trendStr = "100%"; 
          trendUp = true;
        }
      }

      return {
        month: m.monthName,
        users: m.count.toLocaleString(),
        trend: trendStr,
        trendUp: trendUp
      };
    });

    // Return the 4 most recent months (removing the 5th which was just for trend calculation)
    return NextResponse.json(result.slice(0, 4));

  } catch (error) {
    console.error('Failed to fetch user growth:', error);
    return NextResponse.json({ error: 'Failed to fetch user growth' }, { status: 500 });
  }
}
