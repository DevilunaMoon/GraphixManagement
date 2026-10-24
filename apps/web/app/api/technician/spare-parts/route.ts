import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch');
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const session = await getSession();
    const activeBranch = branch || session?.branch || 'Tagoloan';

    const where: any = {};

    if (activeBranch && activeBranch !== 'all') {
      where.branch = { equals: activeBranch, mode: 'insensitive' };
    }

    if (category && category !== 'All Categories') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { compatibleDevice: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const spareParts = await prisma.sparePart.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(spareParts);
  } catch (error: any) {
    console.error('Error fetching spare parts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch spare parts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const formData = await req.formData();

    const name = (formData.get('name') as string) || (formData.get('deviceName') as string);
    const compatibleDevice = (formData.get('compatibleDevice') as string) || (formData.get('compatibleModel') as string) || '';
    const category = (formData.get('category') as string) || 'Other Materials';
    const branch = (formData.get('branch') as string) || session?.branch || 'Tagoloan';
    const stockStr = (formData.get('stock') as string) || (formData.get('deviceStocks') as string) || '0';
    const costStr = (formData.get('cost') as string) || (formData.get('deviceCost') as string) || '0';
    const priceStr = (formData.get('price') as string) || (formData.get('devicePrice') as string) || '0';

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Part / Material name is required' }, { status: 400 });
    }

    const stock = parseInt(stockStr, 10) || 0;
    const cost = parseFloat(costStr) || 0;
    const price = parseFloat(priceStr) || 0;

    // Image Upload
    let imageUrl: string | null = null;
    const imageFile = (formData.get('image') as File | null) || (formData.get('deviceImage') as File | null);
    if (imageFile && imageFile.name && imageFile.size > 0) {
      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        imageUrl = await uploadToCloudinary(buffer, 'spare-parts');
      } catch (uploadErr) {
        console.warn('Image upload error for spare part:', uploadErr);
      }
    }

    const status = stock === 0 ? 'Out of Stock' : stock < 5 ? 'Low Stock' : 'In Stock';
    const sku = `SP-${branch.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPart = await prisma.sparePart.create({
      data: {
        name: name.trim(),
        compatibleDevice: compatibleDevice.trim() || 'Universal',
        category,
        branch,
        stock,
        cost,
        price,
        image: imageUrl,
        sku,
        status
      }
    });

    return NextResponse.json(newPart, { status: 201 });
  } catch (error: any) {
    console.error('Error creating spare part:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create spare part' }, { status: 500 });
  }
}
