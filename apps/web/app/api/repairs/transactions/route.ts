import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

const PAPER_RECEIPTS = [
  {
    id: "rp_0193672",
    repairId: "repair_0193672",
    createdAt: "2026-08-01T04:00:00.000Z", // 8/1/26
    amount: 500,
    quantity: 1,
    variations: "Repair Payment Labor",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 250,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 3, Mohon / Tagoloan",
    user: {
      id: "u_pixter",
      name: "Pixter Andrew Gabatan",
      email: "pixter@gmail.com",
      phone: "N/A"
    },
    device: {
      id: "dev_pixter",
      name: "Repair Labor Service",
      price: 500,
      image: null,
      technician: "Lead Tech"
    }
  },
  {
    id: "rp_0193697",
    repairId: "repair_0193697",
    createdAt: "2026-08-01T05:00:00.000Z", // 8/1/26
    amount: 3000,
    quantity: 1,
    variations: "Repair Payment LCD (iPhone 11, 3 Days Warranty)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1500,
    remainingBalance: 0,
    isSettled: true,
    address: "Sihuyon Zone 8 Sta. Cruz",
    user: {
      id: "u_vincent",
      name: "Mumaril, Vincent A.",
      email: "vincent@gmail.com",
      phone: "N/A"
    },
    device: {
      id: "dev_vincent",
      name: "iPhone 11",
      price: 3000,
      image: null,
      technician: "Lead Tech"
    }
  },
  {
    id: "rp_0193673",
    repairId: "repair_0193673",
    createdAt: "2026-08-02T02:00:00.000Z", // 8/2/26
    amount: 2800,
    quantity: 1,
    variations: "iPhone 11 LCD",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1400,
    remainingBalance: 0,
    isSettled: true,
    address: "Proper Sta. Ines Malitbog Buk",
    user: {
      id: "u_april",
      name: "Ocero, April Maiza Dhaine G.",
      email: "april@gmail.com",
      phone: "N/A"
    },
    device: {
      id: "dev_april",
      name: "iPhone 11",
      price: 2800,
      image: null,
      technician: "Lead Tech"
    }
  },
  {
    id: "rp_0036002",
    repairId: "repair_0036002",
    createdAt: "2026-08-01T06:00:00.000Z", // 8/1/26
    amount: 2900,
    quantity: 1,
    variations: "iPhone XR LCD",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1450,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 6 Pulot Tagoloan",
    user: {
      id: "u_juana",
      name: "Juana Mae Mahusay",
      email: "juana@gmail.com",
      phone: "N/A"
    },
    device: {
      id: "dev_juana",
      name: "iPhone XR",
      price: 2900,
      image: null,
      technician: "Lead Tech"
    }
  },
  {
    id: "rp_0193671",
    repairId: "repair_0193671",
    createdAt: "2026-08-02T03:00:00.000Z", // 8/2/26
    amount: 2000,
    quantity: 1,
    variations: "iPhone XR Battery",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1000,
    remainingBalance: 0,
    isSettled: true,
    address: "Malitbog, Bukidnon",
    user: {
      id: "u_joram",
      name: "Joram Pacana",
      email: "joram@gmail.com",
      phone: "N/A"
    },
    device: {
      id: "dev_joram",
      name: "iPhone XR",
      price: 2000,
      image: null,
      technician: "Lead Tech"
    }
  }
];

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'full' or 'downpayment'
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';

    // Build where clause for Database
    const whereClause: any = {
      repairCost: {
        not: null,
      },
    };

    if (type === 'downpayment') {
      whereClause.progress = {
        in: ['25%', '50%', '75%'],
      };
    } else {
      whereClause.progress = '100%';
    }

    // Filter database by search query
    if (search) {
      whereClause.OR = [
        {
          id: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          deviceName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          ownerName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Filter database by date
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Fetch from database
    const repairs = await prisma.repairRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, id: true, phone: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format DB repairs as transaction objects
    const dbTransactions = repairs.map((repair) => {
      const costStr = repair.repairCost || '0';
      const totalCost = parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0;

      const downpaymentAmount = totalCost / 2;
      const remainingBalance = type === 'downpayment' ? totalCost / 2 : 0;
      const amount = type === 'downpayment' ? downpaymentAmount : totalCost;

      return {
        id: `rp_${repair.id.substring(0, 10)}`,
        repairId: repair.id,
        createdAt: repair.createdAt,
        amount,
        quantity: 1,
        variations: repair.cause || 'General Repair',
        paymentType: type === 'downpayment' ? 'Downpayment' : 'Full',
        source: 'In-Store',
        status: repair.status || 'Active',
        isExpired: false,
        downpaymentAmount,
        remainingBalance,
        isSettled: type === 'full',
        address: 'Walk-In / Online Request',
        user: {
          id: repair.userId || 'guest',
          name: repair.ownerName || repair.user?.name || 'Walk-In Customer',
          email: repair.user?.email || 'walkin@graphix.com',
          phone: repair.user?.phone || 'N/A',
        },
        device: {
          id: repair.id,
          name: repair.deviceName,
          price: totalCost,
          image: repair.image || null,
          technician: repair.technician || 'N/A',
        },
      };
    });

    // Handle Paper Receipts
    let matchedPaper: any[] = [];
    if (type !== 'downpayment') {
      matchedPaper = PAPER_RECEIPTS.filter((tx) => {
        // Filter by date
        if (date) {
          const txDateStr = new Date(tx.createdAt).toDateString();
          const filterDateStr = new Date(date).toDateString();
          if (txDateStr !== filterDateStr) return false;
        }
        // Filter by search query
        if (search) {
          const s = search.toLowerCase();
          return (
            tx.id.toLowerCase().includes(s) ||
            tx.user.name.toLowerCase().includes(s) ||
            tx.device.name.toLowerCase().includes(s) ||
            tx.variations.toLowerCase().includes(s)
          );
        }
        return true;
      });
    }

    // Combine database results + paper receipts
    const allTransactions = [...dbTransactions, ...matchedPaper];

    // Sort combined transactions by date (newest first)
    allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Pagination
    const total = allTransactions.length;
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
    const skip = (page - 1) * limit;

    const paginatedTransactions = allTransactions.slice(skip, skip + limit);

    // Calculate Total Sales of combined matches
    const totalSales = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      transactions: paginatedTransactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalSales,
    });
  } catch (error) {
    console.error('Error fetching repair transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch repair transactions' }, { status: 500 });
  }
}
