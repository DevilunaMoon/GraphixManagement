import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';

export const revalidate = 30;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';

    // If page parameter is supplied, perform paginated database fetch
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '15', 10) || 15);
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive'
        };
      }

      if (brand && brand !== 'All Brands') {
        where.name = {
          ...(where.name || {}),
          contains: brand,
          mode: 'insensitive'
        };
      }

      const [devices, total] = await Promise.all([
        prisma.device.findMany({
          where,
          skip,
          take: limit,
          include: { category: true, variations: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.device.count({ where })
      ]);

      return NextResponse.json({
        devices,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    const devices = await prisma.device.findMany({
      include: { category: true, variations: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(devices, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
      }
    });
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
    const asLowAs = formData.get('deviceAsLowAs') as string;
    const warranty = formData.get('deviceWarranty') as string;
    const downpayment = formData.get('deviceDownpayment') as string;
    const imagesForm = formData.getAll('deviceImages') as File[];
    const singleImage = formData.get('deviceImage') as File | null;
    const downpaymentFormImage = formData.get('deviceDownpaymentImage') as File | null;
    const variationsStr = formData.get('variations') as string;

    let variations = [];
    if (variationsStr) {
      try {
        variations = JSON.parse(variationsStr);
      } catch (e) { }
    }

    if (!name || !priceStr || !costStr || !stockStr || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const filesToUpload = imagesForm.length > 0 ? imagesForm : (singleImage ? [singleImage] : []);
    let imageUrls: string[] = [];

    if (filesToUpload.length > 0) {
      for (const file of filesToUpload) {
        if (file && file.name && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const imageUrl = await uploadToCloudinary(buffer, 'devices');
          imageUrls.push(imageUrl);
        }
      }
    }

    const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;

    let downpaymentImageUrl = null;
    if (downpaymentFormImage && downpaymentFormImage.name && downpaymentFormImage.size > 0) {
      const buffer = Buffer.from(await downpaymentFormImage.arrayBuffer());
      downpaymentImageUrl = await uploadToCloudinary(buffer, 'devices/downpayments');
    }

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
        downpaymentImage: downpaymentImageUrl,
        asLowAs: asLowAs || null,
        warranty: warranty || null,
        downpayment: downpayment || null,
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
