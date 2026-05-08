import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    
    if (!yearParam) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    const year = parseInt(yearParam, 10);
    
    // Fetch users created in the specified year (and December of previous year for trend calculation of Jan)
    const startDate = new Date(year - 1, 11, 1); // Dec 1st of previous year
    const endDate = new Date(year + 1, 0, 1);    // Jan 1st of next year
    
    const users = await prisma.user.findMany({
      select: { createdAt: true },
      where: { 
        role: 'CUSTOMER',
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    const monthlyCounts: Record<number, number> = {};
    for (let i = 0; i <= 12; i++) {
        monthlyCounts[i] = 0; // 0 is Dec prev year, 1-12 are Jan-Dec
    }
    
    users.forEach(u => {
      const d = new Date(u.createdAt);
      if (d.getFullYear() === year) {
        monthlyCounts[d.getMonth() + 1]++; // getMonth is 0-indexed (0=Jan -> 1)
      } else if (d.getFullYear() === year - 1 && d.getMonth() === 11) {
        monthlyCounts[0]++; // Dec prev year
      }
    });

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const result: { month: string, users: string, trend: string, trendUp: boolean }[] = [];
    
    for (let i = 1; i <= 12; i++) {
      const currentMonthCount = monthlyCounts[i] || 0;
      const prevMonthCount = monthlyCounts[i - 1] || 0;
      
      let trendStr = "0%";
      let trendUp = true;
      
      if (prevMonthCount > 0) {
        const diff = currentMonthCount - prevMonthCount;
        const percent = Math.round((Math.abs(diff) / prevMonthCount) * 100);
        trendStr = `${percent}%`;
        trendUp = diff >= 0;
      } else if (currentMonthCount > 0) {
        trendStr = "100%";
        trendUp = true;
      }

      result.push({
        month: months[i - 1],
        users: currentMonthCount.toLocaleString(),
        trend: trendStr,
        trendUp: trendUp
      });
    }

    // We want the most recent month at the top, or chronological? 
    // The dashboard has recent at the top (Dec, Nov, Oct...)
    return NextResponse.json(result.reverse());

  } catch (error) {
    console.error('Failed to fetch yearly user growth:', error);
    return NextResponse.json({ error: 'Failed to fetch user growth' }, { status: 500 });
  }
}
