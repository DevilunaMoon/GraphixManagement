import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';

export const revalidate = 30;

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(categories, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = formData.get('categoryName') as string;
    const image = formData.get('categoryImage') as File | null;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: categoryName' }, { status: 400 });
    }

    let logoUrl = null;
    if (image && image.name && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      logoUrl = await uploadToCloudinary(buffer, 'categories');
    }

    const category = await prisma.category.create({
      data: {
        name,
        logoUrl: logoUrl,
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No category IDs provided' }, { status: 400 });
    }

    // Prisma deleteMany
    await prisma.category.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error: any) {
    console.error('Error deleting categories:', error);
    return NextResponse.json({ error: 'Failed to delete categories. Some categories might be in use by devices.' }, { status: 500 });
  }
}
