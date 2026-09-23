import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

function parseRepairDetails(repairHistory: string | null | undefined) {
  if (!repairHistory) return null;
  try {
    const parsed = JSON.parse(repairHistory);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    // Not JSON
  }
  return null;
}

// 10 Transcribed Physical Store Receipts (Tagoloan Branch)
const STORE_PAPER_RECEIPTS = [
  {
    id: "rp_0199082",
    repairId: "0199082",
    createdAt: "2026-08-01T04:00:00.000Z", // 8/1/26
    amount: 1400,
    quantity: 1,
    variations: "Repair Payment - Battery (iPhone 13)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 700,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 4 Pob. Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_thia",
      name: "Thia Fiorela Adams",
      email: "thia.adams@gmail.com",
      phone: "0917 234 5678",
    },
    device: {
      id: "0199082",
      name: "iPhone 13",
      price: 1400,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0036006",
    repairId: "0036006",
    createdAt: "2026-08-01T05:00:00.000Z", // 8/1/26
    amount: 2700,
    quantity: 1,
    variations: "Repair Payment - LCD (iPhone XR, 3 Days Warranty)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1350,
    remainingBalance: 0,
    isSettled: true,
    address: "Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_princess",
      name: "PRINCESS ABEJARON",
      email: "princess.abejaron@gmail.com",
      phone: "0926 892 1042",
    },
    device: {
      id: "0036006",
      name: "iPhone XR",
      price: 2700,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193666",
    repairId: "0193666",
    createdAt: "2026-08-01T06:00:00.000Z", // 8/1/26
    amount: 700,
    quantity: 1,
    variations: "Repair Payment - Battery (Infinix)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 350,
    remainingBalance: 0,
    isSettled: true,
    address: "Z-1A Natumolan, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_rebecca",
      name: "Rebecca Go",
      email: "rebecca.go@gmail.com",
      phone: "0935 712 9043",
    },
    device: {
      id: "0193666",
      name: "Infinix",
      price: 700,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193673",
    repairId: "0193673",
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
    branch: "Tagoloan Branch",
    user: {
      id: "u_april",
      name: "Ocero, April Maiza Dhaine G.",
      email: "april@gmail.com",
      phone: "0935 829 1042",
    },
    device: {
      id: "0193673",
      name: "iPhone 11",
      price: 2800,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0036002",
    repairId: "0036002",
    createdAt: "2026-08-01T07:00:00.000Z", // 8/1/26
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
    branch: "Tagoloan Branch",
    user: {
      id: "u_juana",
      name: "Juana Mae Mahusay",
      email: "juana@gmail.com",
      phone: "0927 491 8203",
    },
    device: {
      id: "0036002",
      name: "iPhone XR",
      price: 2900,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0036003",
    repairId: "0036003",
    createdAt: "2026-08-01T08:00:00.000Z", // 8/1/26
    amount: 400,
    quantity: 1,
    variations: "Repair Payment - Signal (iPhone XR)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 200,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 6B Baluarte, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_shyren",
      name: "Shyren Kate H. Tagotongan",
      email: "shyren.tagotongan@gmail.com",
      phone: "0917 583 9102",
    },
    device: {
      id: "0036003",
      name: "iPhone XR",
      price: 400,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0199083",
    repairId: "0199083",
    createdAt: "2026-08-01T09:00:00.000Z", // 8/1/26
    amount: 2000,
    quantity: 1,
    variations: "Repair Payment - Motherboard (iPhone 11)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1000,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 6 Agusan, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_marga",
      name: "Marga Picardal",
      email: "marga.picardal@gmail.com",
      phone: "0956 892 3401",
    },
    device: {
      id: "0199083",
      name: "iPhone 11",
      price: 2000,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193697",
    repairId: "0193697",
    createdAt: "2026-08-01T10:00:00.000Z", // 8/1/26
    amount: 3000,
    quantity: 1,
    variations: "Repair Payment - LCD (iPhone 11, 3 Days Warranty)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1500,
    remainingBalance: 0,
    isSettled: true,
    address: "Sihuyon Zone 8 Sta. Cruz, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_vincent",
      name: "Mumaril, Vincent A.",
      email: "vincent.mumaril@gmail.com",
      phone: "0956 712 8493",
    },
    device: {
      id: "0193697",
      name: "iPhone 11",
      price: 3000,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193667",
    repairId: "0193667",
    createdAt: "2026-08-01T11:00:00.000Z", // 8/1/26
    amount: 2800,
    quantity: 1,
    variations: "SAM A15 - LCD w/ Frame",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1400,
    remainingBalance: 0,
    isSettled: true,
    address: "Natumolan, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_may",
      name: "May Zayas",
      email: "may.zayas@gmail.com",
      phone: "0935 892 4105",
    },
    device: {
      id: "0193667",
      name: "Samsung Galaxy A15",
      price: 2800,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193670",
    repairId: "0193670",
    createdAt: "2026-08-02T04:00:00.000Z", // 8/2/26
    amount: 3000,
    quantity: 1,
    variations: "Repair Payment - Battery (iPhone 14 PM, 7 Days Warranty)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1500,
    remainingBalance: 0,
    isSettled: true,
    address: "Baluarte, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_shawn",
      name: "Shawn",
      email: "shawn@gmail.com",
      phone: "0917 849 2039",
    },
    device: {
      id: "0193670",
      name: "iPhone 14 Pro Max",
      price: 3000,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193671",
    repairId: "0193671",
    createdAt: "2026-08-02T05:00:00.000Z", // 8/2/26
    amount: 2000,
    quantity: 1,
    variations: "Repair Payment - Battery (iPhone XR)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 1000,
    remainingBalance: 0,
    isSettled: true,
    address: "Malitbog, Bukidnon",
    branch: "Tagoloan Branch",
    user: {
      id: "u_jordam",
      name: "Jordam Pacam-an",
      email: "jordam.pacaman@gmail.com",
      phone: "0917 654 3210",
    },
    device: {
      id: "0193671",
      name: "iPhone XR",
      price: 2000,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0036005",
    repairId: "0036005",
    createdAt: "2026-08-01T12:00:00.000Z", // 8/1/26
    amount: 1700,
    quantity: 1,
    variations: "Repair Payment - LCD (Redmi Note 10, 3 Days Warranty)",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 850,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 11 Greymar, Baluarte",
    branch: "Tagoloan Branch",
    user: {
      id: "u_nyka",
      name: "Nyka A. Magallanes",
      email: "nyka.magallanes@gmail.com",
      phone: "0926 789 0123",
    },
    device: {
      id: "0036005",
      name: "Redmi Note 10",
      price: 1700,
      image: null,
      technician: "Lead Tech",
    },
  },
  {
    id: "rp_0193672",
    repairId: "0193672",
    createdAt: "2026-08-01T13:00:00.000Z", // 8/1/26
    amount: 500,
    quantity: 1,
    variations: "Repair Payment - Labor",
    paymentType: "Full",
    source: "In-Store",
    status: "Completed",
    isExpired: false,
    downpaymentAmount: 250,
    remainingBalance: 0,
    isSettled: true,
    address: "Zone 3, Mohon, Tagoloan",
    branch: "Tagoloan Branch",
    user: {
      id: "u_dexter",
      name: "Dexter Andrew Gabatan",
      email: "dexter.gabatan@gmail.com",
      phone: "0935 456 7890",
    },
    device: {
      id: "0193672",
      name: "Gadget Repair (Labor)",
      price: 500,
      image: null,
      technician: "Lead Tech",
    },
  },
];

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'full'; // 'full' or 'downpayment'
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const branchParam = searchParams.get('branch');

    // Build database AND conditions
    const andConditions: any[] = [];

    // 1. Branch condition:
    // For Super Admin: if 'all' or empty, no branch filter (fetch all branches). If specific branch, filter by it.
    // For regular Admin / Cashier: restrict strictly to session branch.
    if (isSuperAdmin) {
      if (branchParam && branchParam.toLowerCase() !== 'all') {
        andConditions.push({
          branch: { contains: branchParam, mode: 'insensitive' }
        });
      }
    } else {
      andConditions.push({
        branch: { equals: session.branch || 'Tagoloan', mode: 'insensitive' }
      });
    }

    // 2. Progress / Status condition
    if (type === 'downpayment') {
      andConditions.push({
        OR: [
          { progress: { in: ['25%', '50%', '75%', 'Diagnostic', 'Repairing'] } },
          { downpayment: { not: null } }
        ]
      });
    } else {
      andConditions.push({
        OR: [
          { status: { equals: 'Completed', mode: 'insensitive' } },
          { progress: { in: ['Completed', '100%'] } }
        ]
      });
    }

    // 3. Search condition
    if (search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { deviceName: { contains: q, mode: 'insensitive' } },
          { ownerName: { contains: q, mode: 'insensitive' } },
          { branch: { contains: q, mode: 'insensitive' } },
          { technician: { contains: q, mode: 'insensitive' } },
          { cause: { contains: q, mode: 'insensitive' } },
          {
            user: {
              name: { contains: q, mode: 'insensitive' }
            }
          },
          {
            user: {
              email: { contains: q, mode: 'insensitive' }
            }
          }
        ]
      });
    }

    // 4. Date condition
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      andConditions.push({
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      });
    }

    const whereClause: any = andConditions.length > 0 ? { AND: andConditions } : {};

    // Calculate branch sequence numbers (GRPX-TAG-A1, GRPX-VIL-A1, GRPX-JAS-A1)
    const allBranchRepairs = await prisma.repairRequest.findMany({
      select: { id: true, branch: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const branchCounters: Record<string, number> = {};
    const trackingMap = new Map<string, { trackingNumber: string; orderIndex: number }>();

    for (const r of allBranchRepairs) {
      const bLower = (r.branch || 'Tagoloan').toLowerCase();
      let code = 'TAG';
      if (bLower.includes('vil')) code = 'VIL';
      else if (bLower.includes('jas')) code = 'JAS';

      const count = (branchCounters[code] || 0) + 1;
      branchCounters[code] = count;
      const letterIndex = Math.floor((count - 1) / 1000);
      const letter = String.fromCharCode(65 + (letterIndex % 26));
      const seriesNum = ((count - 1) % 1000) + 1;
      trackingMap.set(r.id, {
        trackingNumber: `GRPX-${code}-${letter}${seriesNum}`,
        orderIndex: count
      });
    }

    // Assign sequential tracking numbers to paper store receipts
    STORE_PAPER_RECEIPTS.forEach(p => {
      const bLower = (p.branch || 'Tagoloan').toLowerCase();
      let code = 'TAG';
      if (bLower.includes('vil')) code = 'VIL';
      else if (bLower.includes('jas')) code = 'JAS';

      const count = (branchCounters[code] || 0) + 1;
      branchCounters[code] = count;
      const letterIndex = Math.floor((count - 1) / 1000);
      const letter = String.fromCharCode(65 + (letterIndex % 26));
      const seriesNum = ((count - 1) % 1000) + 1;
      trackingMap.set(p.id, {
        trackingNumber: `GRPX-${code}-${letter}${seriesNum}`,
        orderIndex: count
      });
    });

    let dbTransactions: any[] = [];
    try {
      // Fetch all matching repair records from Database
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
      dbTransactions = repairs.map((repair) => {
        const costStr = repair.repairCost || '0';
        let totalCost = parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0;

        if (totalCost === 0 && repair.materials) {
          try {
            const mats = JSON.parse(repair.materials);
            if (mats && typeof mats === 'object') {
              const itemsSum = Array.isArray(mats.items)
                ? mats.items.reduce((acc: number, item: any) => acc + (parseFloat(item.total || (item.unitPrice || item.price || item.cost || 0) * (item.qty || item.quantity || 1)) || 0), 0)
                : 0;
              totalCost = itemsSum;
            }
          } catch (e) {
            // Ignore JSON error
          }
        }

        const parsedHistory = parseRepairDetails(repair.repairHistory);

        let downpaymentAmount = 0;
        if (repair.downpayment) {
          downpaymentAmount = parseFloat(repair.downpayment.replace(/[^0-9.]/g, '')) || 0;
        } else {
          downpaymentAmount = totalCost / 2;
        }

        const isDownpayment = type === 'downpayment';
        const remainingBalance = isDownpayment ? Math.max(0, totalCost - downpaymentAmount) : 0;
        const amount = isDownpayment ? (downpaymentAmount > 0 ? downpaymentAmount : totalCost) : totalCost;
        const repairBranch = repair.branch || session.branch || 'Tagoloan';

        const customerName = repair.user?.name || parsedHistory?.customerName || (repair.ownerName && repair.ownerName.trim() ? repair.ownerName : 'Walk-In Customer');
        const customerEmail = repair.user?.email || parsedHistory?.customerEmail || 'walkin@graphix.com';
        const customerPhone = repair.user?.phone || parsedHistory?.customerPhone || 'N/A';
        const photoUrl = repair.proofImage || repair.image || (parsedHistory?.photos && parsedHistory.photos[0]) || null;

        const track = trackingMap.get(repair.id);
        const trackingNumber = track?.trackingNumber || `GRPX-TAG-A1`;
        const orderIndex = track?.orderIndex || 1;

        return {
          id: `rp_${repair.id.substring(0, 10)}`,
          repairId: repair.id,
          trackingNumber,
          orderIndex,
          createdAt: repair.createdAt.toISOString(),
          amount,
          quantity: 1,
          variations: repair.cause || (parsedHistory?.problem ? `${parsedHistory.problem} - ${parsedHistory.problemDescription || ''}` : 'General Repair'),
          paymentType: isDownpayment ? 'Downpayment' : 'Full',
          source: 'In-Store',
          status: repair.status || 'Completed',
          isExpired: false,
          downpaymentAmount,
          remainingBalance,
          isSettled: !isDownpayment,
          address: 'Walk-In / Online Request',
          branch: repairBranch,
          cause: repair.cause,
          technician: repair.technician || 'Lead Tech',
          repairCost: repair.repairCost || String(totalCost),
          downpayment: repair.downpayment || String(downpaymentAmount),
          materials: repair.materials,
          deviceName: repair.deviceName,
          ownerName: customerName,
          user: {
            id: repair.userId || 'guest',
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          device: {
            id: repair.id,
            name: repair.deviceName,
            price: totalCost,
            image: photoUrl,
            technician: repair.technician || 'Lead Tech',
          },
        };
      });
    } catch (dbErr) {
      console.error("Database query warning (falling back to store receipts if needed):", dbErr);
    }

    // Match physical receipts for Tagoloan / All Branches
    let matchedPaper: any[] = [];
    const shouldIncludeTagoloanPaper = type !== 'downpayment' && (
      (isSuperAdmin && (!branchParam || branchParam.toLowerCase() === 'all' || branchParam.toLowerCase().includes('tagoloan'))) ||
      (!isSuperAdmin && (session.branch || 'Tagoloan').toLowerCase().includes('tagoloan'))
    );

    if (shouldIncludeTagoloanPaper) {
      const dbIds = new Set(dbTransactions.map(tx => tx.repairId));
      matchedPaper = STORE_PAPER_RECEIPTS.filter((tx) => {
        if (dbIds.has(tx.repairId)) return false;
        const track = trackingMap.get(tx.id);
        const trackingNo = track?.trackingNumber || '';
        if (date) {
          const txDateStr = new Date(tx.createdAt).toDateString();
          const filterDateStr = new Date(date).toDateString();
          if (txDateStr !== filterDateStr) return false;
        }
        if (search) {
          const s = search.toLowerCase();
          return (
            tx.id.toLowerCase().includes(s) ||
            trackingNo.toLowerCase().includes(s) ||
            tx.user.name.toLowerCase().includes(s) ||
            tx.user.email.toLowerCase().includes(s) ||
            tx.device.name.toLowerCase().includes(s) ||
            tx.variations.toLowerCase().includes(s) ||
            (tx.branch && tx.branch.toLowerCase().includes(s))
          );
        }
        return true;
      }).map(tx => {
        const track = trackingMap.get(tx.id);
        return {
          ...tx,
          trackingNumber: track?.trackingNumber || `GRPX-TAG-A1`,
          orderIndex: track?.orderIndex || 1,
          deviceName: tx.device?.name,
          cause: tx.variations,
          technician: tx.device?.technician,
          repairCost: String(tx.amount),
          downpayment: String(tx.downpaymentAmount || 0),
          ownerName: tx.user?.name,
        };
      });
    }

    // Combine database results + physical store receipts
    const allTransactions = [...dbTransactions, ...matchedPaper];

    // If search term is present, also allow filtering by tracking number for DB records
    let filteredTransactions = allTransactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filteredTransactions = allTransactions.filter(tx => {
        const trackNo = (tx.trackingNumber || '').toLowerCase();
        const idNo = (tx.id || '').toLowerCase();
        const devName = (tx.device?.name || tx.deviceName || '').toLowerCase();
        const uName = (tx.user?.name || '').toLowerCase();
        const uEmail = (tx.user?.email || '').toLowerCase();
        const varText = (tx.variations || tx.cause || '').toLowerCase();
        const brText = (tx.branch || '').toLowerCase();
        return (
          trackNo.includes(q) ||
          idNo.includes(q) ||
          devName.includes(q) ||
          uName.includes(q) ||
          uEmail.includes(q) ||
          varText.includes(q) ||
          brText.includes(q)
        );
      });
    }

    // Sort combined transactions by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Pagination
    const total = filteredTransactions.length;
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
    const skip = (page - 1) * limit;

    const paginatedTransactions = filteredTransactions.slice(skip, skip + limit);

    // Calculate Total Sales
    const totalSales = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

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
