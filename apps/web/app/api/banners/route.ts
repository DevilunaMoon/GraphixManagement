import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  // Force hot module reload
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const image = formData.get('bannerImage') as File | null;
    const name = formData.get('bannerName') as string | null;

    if (!image || !image.name || image.size === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const fileName = `${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
    const uploadDir = join(process.cwd(), 'public', 'banners');
    
    // Ensure the banners directory exists just in case
    await mkdir(uploadDir, { recursive: true }).catch(() => {});
    
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    // Web-accessible path starts with /banners/
    const imageUrl = `/banners/${fileName}`;

    const banner = await prisma.banner.create({
      data: {
        imageUrl,
        name: name || null,
      }
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Error uploading banner:', error);
    return NextResponse.json({ error: 'Failed to upload banner' }, { status: 500 });
  }
}
