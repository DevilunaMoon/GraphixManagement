import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      include: { category: true, variations: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const name = formData.get('deviceName') as string;
    const priceStr = formData.get('devicePrice') as string;
    const costStr = formData.get('deviceCost') as string;
    const stockStr = formData.get('deviceStocks') as string;
    const categoryId = formData.get('deviceCategory') as string;
    const specs = formData.get('deviceSpecs') as string;
    const imagesForm = formData.getAll('deviceImages') as File[];
    const singleImage = formData.get('deviceImage') as File | null;
    const variationsStr = formData.get('variations') as string;

    let variations = [];
    if (variationsStr) {
      try {
        variations = JSON.parse(variationsStr);
      } catch (e) {}
    }

    if (!name || !priceStr || !costStr || !stockStr || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const filesToUpload = imagesForm.length > 0 ? imagesForm : (singleImage ? [singleImage] : []);
    let imageUrls: string[] = [];

    if (filesToUpload.length > 0) {
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true }).catch(() => {});
      
      for (const file of filesToUpload) {
        if (file && file.name && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
          const filePath = join(uploadDir, fileName);
          await writeFile(filePath, buffer);
          imageUrls.push(`/uploads/${fileName}`);
        }
      }
    }

    const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;

    const device = await prisma.device.create({
      data: {
        name,
        price: parseFloat(priceStr),
        cost: parseFloat(costStr),
        stock: parseInt(stockStr, 10),
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        specs: specs || null,
        image: primaryImage,
        images: imageUrls,
        variations: variations.length > 0 ? {
          create: variations.map((v: any) => ({
            type: v.type,
            name: v.name,
            price: parseFloat(v.price),
            cost: parseFloat(v.cost || 0),
            stock: parseInt(v.stock || 0, 10),
          }))
        } : undefined,
      }
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 });
  }
}
