import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(categories);
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
