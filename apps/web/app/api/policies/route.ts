import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

const DEFAULT_POLICIES = [
  {
    type: 'PURCHASE',
    content: 'All product purchases made through Graphix are subject to store availability and verification. Customers must inspect physical items upon delivery or in-store pickup. Warranty terms apply according to manufacturer and store standards. Returns and exchanges are accepted within 7 days of purchase with valid proof of receipt and in original packaging.'
  },
  {
    type: 'PAYMENT',
    content: 'Graphix supports cash, GCash, and verified digital payment methods. For installment and downpayment transactions, remaining balances must be settled according to the agreed schedule prior to final device release. All transactions are securely processed and recorded with corresponding official reference receipts.'
  },
  {
    type: 'REPAIR',
    content: 'Devices submitted for repair undergo initial intake diagnostics. Customers will receive quotation estimates for required parts and labor. Work commences only upon customer confirmation. Graphix provides a 30-day service warranty on replaced parts and diagnostic labor, excluding subsequent liquid or accidental physical damage.'
  },
  {
    type: 'PRIVACY',
    content: 'Graphix values your privacy and is committed to protecting your personal data. We collect customer information including name, email, phone number, and branch preferences solely for account authentication, order fulfillment, repair tracking, and service notifications. We do not sell or disclose your personal data to unauthorized third parties.'
  }
];

export const DEFAULT_FACEBOOK_BRANCHES = [
  {
    id: 'branch-1',
    branch: 'Tagoloan',
    title: 'Tagoloan Branch',
    link: 'https://www.facebook.com/Graphixtagoloan',
    image: '/Images/storefront-bg.jpg'
  },
  {
    id: 'branch-2',
    branch: 'Jasaan',
    title: 'Jasaan Branch',
    link: 'https://www.facebook.com/profile.php?id=61587565422103',
    image: '/Images/storefront-bg.jpg'
  },
  {
    id: 'branch-3',
    branch: 'Villanueva',
    title: 'Villanueva Branch',
    link: 'https://www.facebook.com/GraceGeraldizoSaludares',
    image: '/Images/storefront-bg.jpg'
  }
];

/**
 * Match a branch entry by branch field, title, id, or index
 */
function isMatchingBranch(branchObj: any, targetBranchName: string, index?: number): boolean {
  if (!branchObj || !targetBranchName) return false;
  const target = targetBranchName.toLowerCase().trim();
  const bBranch = String(branchObj.branch || '').toLowerCase().trim();
  const bTitle = String(branchObj.title || '').toLowerCase().trim();
  const bId = String(branchObj.id || '').toLowerCase().trim();

  if (target === 'tagoloan') {
    return bBranch === 'tagoloan' || bTitle.includes('tagoloan') || bTitle.includes('main') || bId.includes('tagoloan') || bId === 'branch-1' || index === 0;
  }
  if (target === 'jasaan') {
    return bBranch === 'jasaan' || bTitle.includes('jasaan') || bId.includes('jasaan') || bId === 'branch-2' || index === 1;
  }
  if (target === 'villanueva') {
    return bBranch === 'villanueva' || bTitle.includes('villanueva') || bId.includes('villanueva') || bId === 'branch-3' || index === 2;
  }
  return bBranch === target || bTitle.includes(target) || bId.includes(target);
}

export async function GET() {
  try {
    let policies = await prisma.policy.findMany();

    // If database has no policies yet, return defaults
    if (!policies || policies.length === 0) {
      return NextResponse.json(DEFAULT_POLICIES);
    }

    // Ensure all standard policy types exist in the response
    const existingTypes = new Set(policies.map(p => p.type.toUpperCase()));
    const missingDefaults = DEFAULT_POLICIES.filter(dp => !existingTypes.has(dp.type));

    const combined = [...policies, ...missingDefaults];
    return NextResponse.json(combined);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(DEFAULT_POLICIES);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    // Strict Role check
    if (session.role === 'CASHIER') {
      return NextResponse.json(
        { error: 'Forbidden: Cashiers do not have access to manage Facebook Store Branches or policies.' },
        { status: 403 }
      );
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage this resource.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ==========================================
    // 1. SUPER ADMIN: Full Access to All Branches & Policies
    // ==========================================
    if (session.role === 'SUPER_ADMIN') {
      // Support batch saving: { policies: [{ type, content }, ...] }
      if (Array.isArray(body.policies)) {
        const results = [];
        for (const p of body.policies) {
          if (p.type && typeof p.content === 'string') {
            const upserted = await prisma.policy.upsert({
              where: { type: p.type.toUpperCase() },
              update: { content: p.content },
              create: { type: p.type.toUpperCase(), content: p.content },
            });
            results.push(upserted);
          }
        }
        return NextResponse.json({ success: true, policies: results });
      }

      // Support single policy save: { type, content }
      const { type, content } = body;
      if (!type) {
        return NextResponse.json({ error: 'Missing policy type' }, { status: 400 });
      }

      const policy = await prisma.policy.upsert({
        where: { type: type.toUpperCase() },
        update: { content: content || '' },
        create: { type: type.toUpperCase(), content: content || '' },
      });

      return NextResponse.json({ success: true, policy });
    }

    // ==========================================
    // 2. BRANCH ADMIN: Assigned Branch ONLY
    // ==========================================
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, role: true, branch: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const userBranch = dbUser.branch || session.branch || 'Tagoloan';

    // Disallow Branch Admin from modifying global website policies
    const containsGlobalPolicies = Array.isArray(body.policies)
      ? body.policies.some((p: any) => p.type && p.type.toUpperCase() !== 'ABOUT_FACEBOOK_BRANCHES')
      : body.type && body.type.toUpperCase() !== 'ABOUT_FACEBOOK_BRANCHES';

    if (containsGlobalPolicies) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin has permission to modify global website policies and descriptions.' },
        { status: 403 }
      );
    }

    // Load existing Facebook store branches from database
    let existingBranches: any[] = [...DEFAULT_FACEBOOK_BRANCHES];
    const currentFbRecord = await prisma.policy.findUnique({
      where: { type: 'ABOUT_FACEBOOK_BRANCHES' }
    });

    if (currentFbRecord?.content) {
      try {
        const parsed = JSON.parse(currentFbRecord.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          existingBranches = parsed;
        }
      } catch (e) {
        console.error('Error parsing stored facebook branches, using defaults:', e);
      }
    }

    // Extract incoming branch update for user's assigned branch
    let incomingBranchData: any = null;

    if (Array.isArray(body.policies)) {
      const fbPolicy = body.policies.find((p: any) => p.type && p.type.toUpperCase() === 'ABOUT_FACEBOOK_BRANCHES');
      if (fbPolicy && fbPolicy.content) {
        try {
          const parsed = JSON.parse(fbPolicy.content);
          if (Array.isArray(parsed)) {
            // Find the item matching user's assigned branch
            incomingBranchData = parsed.find((b: any, idx: number) => isMatchingBranch(b, userBranch, idx));
          } else if (typeof parsed === 'object') {
            incomingBranchData = parsed;
          }
        } catch {
          return NextResponse.json({ error: 'Invalid JSON content for facebook branches' }, { status: 400 });
        }
      }
    } else if (body.type && body.type.toUpperCase() === 'ABOUT_FACEBOOK_BRANCHES') {
      if (body.branchData && typeof body.branchData === 'object') {
        incomingBranchData = body.branchData;
      } else if (typeof body.content === 'string') {
        try {
          const parsed = JSON.parse(body.content);
          if (Array.isArray(parsed)) {
            incomingBranchData = parsed.find((b: any, idx: number) => isMatchingBranch(b, userBranch, idx));
          } else if (typeof parsed === 'object') {
            incomingBranchData = parsed;
          }
        } catch {
          return NextResponse.json({ error: 'Invalid JSON format in content' }, { status: 400 });
        }
      }
    } else if (body.branchData && typeof body.branchData === 'object') {
      incomingBranchData = body.branchData;
    }

    if (!incomingBranchData) {
      return NextResponse.json(
        { error: `No valid branch information provided for your assigned branch (${userBranch} Branch).` },
        { status: 400 }
      );
    }

    // Strict Backend check: Ensure Branch Admin cannot target another branch
    if (incomingBranchData.branch && !isMatchingBranch(incomingBranchData, userBranch)) {
      return NextResponse.json(
        { error: `Forbidden: You are only authorized to manage ${userBranch} Branch.` },
        { status: 403 }
      );
    }

    // Find and update ONLY the assigned branch within existingBranches
    let targetIndex = existingBranches.findIndex((b: any, idx: number) => isMatchingBranch(b, userBranch, idx));

    if (targetIndex === -1) {
      // Create record for assigned branch if not found
      existingBranches.push({
        id: `branch-${Date.now()}`,
        branch: userBranch,
        title: incomingBranchData.title || `${userBranch} Branch`,
        link: incomingBranchData.link || 'https://www.facebook.com',
        image: incomingBranchData.image || '/Images/storefront-bg.jpg'
      });
    } else {
      // Update only the authorized branch
      existingBranches[targetIndex] = {
        ...existingBranches[targetIndex],
        branch: userBranch,
        title: incomingBranchData.title !== undefined ? incomingBranchData.title : existingBranches[targetIndex].title,
        link: incomingBranchData.link !== undefined ? incomingBranchData.link : existingBranches[targetIndex].link,
        image: incomingBranchData.image !== undefined ? incomingBranchData.image : existingBranches[targetIndex].image
      };
    }

    // Save merged branches array back to DB
    const updatedPolicy = await prisma.policy.upsert({
      where: { type: 'ABOUT_FACEBOOK_BRANCHES' },
      update: { content: JSON.stringify(existingBranches) },
      create: { type: 'ABOUT_FACEBOOK_BRANCHES', content: JSON.stringify(existingBranches) },
    });

    return NextResponse.json({
      success: true,
      message: `Facebook store details for ${userBranch} Branch updated successfully!`,
      policy: updatedPolicy,
      branches: existingBranches
    });

  } catch (error: any) {
    console.error('Error saving policy:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save policy' }, { status: 500 });
  }
}
