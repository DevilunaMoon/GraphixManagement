import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';

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
    const linkUrl = formData.get('bannerLink') as string | null;

    if (!image || !image.name || image.size === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const imageUrl = await uploadToCloudinary(buffer, 'banners');

    const banner = await prisma.banner.create({
      data: {
        imageUrl,
        name: name || null,
        linkUrl: linkUrl || null,
      }
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Error uploading banner:', error);
    return NextResponse.json({ error: 'Failed to upload banner' }, { status: 500 });
  }
}
