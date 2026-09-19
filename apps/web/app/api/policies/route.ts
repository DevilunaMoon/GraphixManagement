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
    // 1. Strict backend RBAC: Only Super Admin can modify/create policies
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin has permission to modify policies.' },
        { status: 403 }
      );
    }

    const body = await req.json();

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
  } catch (error) {
    console.error('Error saving policy:', error);
    return NextResponse.json({ error: 'Failed to save policy' }, { status: 500 });
  }
}
