import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
    const formData = await req.formData(); 423423

    const name = formData.get('categoryName') as string;
    const image = formData.get('categoryImage') as File | null;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: categoryName' }, { status: 400 });
    }

    let logoUrl = null;
    if (image && image.name && image.size > 0) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileName = `${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
      const uploadDir = join(process.cwd(), 'public', 'categories');

      await mkdir(uploadDir, { recursive: true }).catch(() => { });

      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);

      logoUrl = `/categories/${fileName}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        logoUrl: logoUrl,
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
