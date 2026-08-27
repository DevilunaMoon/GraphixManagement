import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';

import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';
    const typeFilter = searchParams.get('type') || '';
    const branchParam = searchParams.get('branch');

    const activeBranch = (session && (session.role === 'ADMIN' || session.role === 'CASHIER'))
      ? (session.branch || 'Tagoloan')
      : (branchParam || undefined);

    // If page parameter is supplied, perform paginated fetch
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '15', 10) || 15);
      const skip = (page - 1) * limit;

      const categoryId = searchParams.get('categoryId') || '';

      const where: any = {};
      
      if (activeBranch) {
        where.branch = activeBranch;
      }
      
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

      if (categoryId && categoryId !== 'All' && categoryId !== 'All Categories') {
        where.categoryId = categoryId;
      }

      const devices = await prisma.device.findMany({
        where,
        include: { category: true, variations: true },
        orderBy: { createdAt: 'desc' }
      });

      // Filter by type in JavaScript
      let filteredDevices = devices;
      if (typeFilter && typeFilter !== 'all') {
        filteredDevices = devices.filter(p => {
          const pName = (p.name || '').toLowerCase();
          const pSpecs = (p.specs || '').toLowerCase();
          const pCat = (p.category?.name || '').toLowerCase();

          if (typeFilter === 'smartphone') {
            const isPhoneWord = pName.includes('phone') || pName.includes('mobile') || pName.includes('smartphone') || 
                                pSpecs.includes('phone') || pSpecs.includes('mobile') ||
                                pCat.includes('phone') || pCat.includes('mobile') || pCat.includes('smartphone');
            
            const isPhoneBrand = ['apple', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'infinix', 'itel', 'huawei', 'oneplus'].some(b => 
              pName.includes(b) || pCat.includes(b)
            );

            const isAccessory = pName.includes('case') || pName.includes('charger') || pName.includes('cable') || 
                                pName.includes('earphone') || pName.includes('headset') || pName.includes('buds') || 
                                pName.includes('watch') || pName.includes('peripherals') || pName.includes('accessories') ||
                                pName.includes('keyboard') || pName.includes('mouse') || pName.includes('tempered') ||
                                pCat.includes('accessories') || pCat.includes('peripherals');
                                
            const isIpadOrLaptop = pName.includes('ipad') || pName.includes('tablet') || pName.includes('tab') || 
                                   pName.includes('laptop') || pName.includes('macbook') || pName.includes('notebook') ||
                                   pSpecs.includes('ipad') || pSpecs.includes('tablet') || pSpecs.includes('laptop');

            return (isPhoneWord || isPhoneBrand) && !isAccessory && !isIpadOrLaptop;
          } 
          else if (typeFilter === 'laptop') {
            return pName.includes('laptop') || pName.includes('macbook') || pName.includes('notebook') || 
                   pName.includes('thinkpad') || pName.includes('zenbook') || pName.includes('chromebook') ||
                   pSpecs.includes('laptop') || pSpecs.includes('macbook') || pSpecs.includes('notebook') ||
                   pCat.includes('laptop') || pCat.includes('macbook');
          } 
          else if (typeFilter === 'ipad') {
            return pName.includes('ipad') || pName.includes('tablet') || pName.includes('tab') || pName.includes('pad') ||
                   pSpecs.includes('ipad') || pSpecs.includes('tablet') || pSpecs.includes('tab') ||
                   pCat.includes('ipad') || pCat.includes('tablet') || pCat.includes('tab');
          } 
          else if (typeFilter === 'tv') {
            return pName.includes('tv') || pName.includes('television') || pName.includes('smart tv') || pName.includes('led tv') ||
                   pSpecs.includes('tv') || pSpecs.includes('television') ||
                   pCat.includes('tv') || pCat.includes('television');
          } 
          else if (typeFilter === 'speaker') {
            return pName.includes('speaker') || pName.includes('audio') || pName.includes('soundbar') || pName.includes('subwoofer') ||
                   pSpecs.includes('speaker') || pSpecs.includes('audio') ||
                   pCat.includes('speaker') || pCat.includes('audio');
          } 
          else if (typeFilter === 'phone accessories') {
            return pName.includes('case') || pName.includes('charger') || pName.includes('cable') || 
                   pName.includes('earphone') || pName.includes('headset') || pName.includes('buds') || 
                   pName.includes('watch') || pName.includes('peripherals') || pName.includes('accessories') ||
                   pName.includes('tempered') || pName.includes('powerbank') || pName.includes('hub') ||
                   pCat.includes('accessories') || pCat.includes('peripherals');
          }
          return true;
        });
      }

      const total = filteredDevices.length;
      const paginated = filteredDevices.slice(skip, skip + limit);

      return NextResponse.json({
        devices: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      });
    }

    const whereClause: any = {};
    if (activeBranch) {
      whereClause.branch = activeBranch;
    }

    const devices = await prisma.device.findMany({
      where: whereClause,
      include: { category: true, variations: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(devices, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const branch = (session && (session.role === 'ADMIN' || session.role === 'CASHIER'))
      ? (session.branch || 'Tagoloan')
      : 'Tagoloan';

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

    const type = (formData.get('deviceType') as string) || (formData.get('type') as string) || 'Smartphone';
    const isPreOwned = formData.get('isPreOwned') === 'true';

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
        branch,
        type,
        isPreOwned,
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
