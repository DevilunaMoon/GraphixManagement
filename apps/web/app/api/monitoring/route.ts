import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const requests = await prisma.repairRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    return NextResponse.json({ error: 'Failed to fetch repair requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const deviceName = formData.get('deviceName') as string;
    const ownerName = formData.get('ownerName') as string;
    const progress = formData.get('progress') as string;
    const cause = formData.get('cause') as string;
    const technician = formData.get('technician') as string;
    const repairCost = formData.get('repairCost') as string;
    const image = formData.get('image') as File | null;

    if (!deviceName || !ownerName || !progress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let imageUrl = null;
    if (image && image.name && image.size > 0) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileName = `${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      
      await mkdir(uploadDir, { recursive: true }).catch(() => {});
      
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      
      imageUrl = `/uploads/${fileName}`;
    }

    const request = await prisma.repairRequest.create({
      data: {
        deviceName,
        ownerName,
        progress,
        cause: cause || null,
        technician: technician || null,
        repairCost: repairCost || null,
        image: imageUrl,
      }
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error('Error creating repair request:', error);
    return NextResponse.json({ error: 'Failed to create repair request' }, { status: 500 });
  }
}
