import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { getSession } from '../../../../lib/session';
import { triggerStockAlert } from '../../../../lib/stock-alerts';

function formatProductId(modelName: string, variantName?: string, customProductId?: string) {
  if (customProductId && customProductId.trim()) {
    return customProductId.trim().toUpperCase();
  }
  const cleanModel = (modelName || 'DEVICE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const cleanVariant = (variantName || 'STD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${cleanModel}-${cleanVariant}`;
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        variations: {
          include: {
            branchStocks: true
          }
        },
        category: true,
        branchStocks: true
      }
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    let hasPurchased = false;
    const session = await getSession();
    if (session && session.userId) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId: session.userId,
          deviceId: id
        }
      });
      if (purchase) {
        hasPurchased = true;
      }
    }

    const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];
    const branchAvailability: Record<string, {
      deviceId: string;
      stock: number;
      isAvailable: boolean;
      price: number;
      discount: number;
      discountStartDate?: Date | string | null;
      discountEndDate?: Date | string | null;
      variations: any[];
    }> = {};

    for (const b of branches) {
      const bVariants = (device.variations || []).map(v => {
        const bs = (v.branchStocks || []).find(s => s.branch === b);
        return {
          id: v.id,
          name: v.name,
          type: v.type,
          productId: v.productId || formatProductId(device.name, v.name),
          price: v.price,
          cost: v.cost,
          stock: bs ? bs.stock : 0
        };
      });

      const totalBranchStock = bVariants.reduce((sum, v) => sum + v.stock, 0);

      branchAvailability[b] = {
        deviceId: device.id,
        stock: totalBranchStock,
        isAvailable: totalBranchStock > 0,
        price: device.price,
        discount: device.discount || 0,
        discountStartDate: device.discountStartDate || null,
        discountEndDate: device.discountEndDate || null,
        variations: bVariants
      };
    }

    return NextResponse.json({
      ...device,
      hasPurchased,
      branchAvailability
    });
  } catch (error) {
    console.error('Error fetching device:', error);
    return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    await prisma.device.delete({
      where: { id }
    });
    return NextResponse.json({ message: 'Device deleted' });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
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

    const discountStr = formData.get('deviceDiscount') ?? formData.get('discount');
    const discountStartDateStr = formData.get('discountStartDate');
    const discountEndDateStr = formData.get('discountEndDate');

    const isPreOwnedVal = formData.get('isPreOwned');
    const isPreOwned = isPreOwnedVal !== null ? isPreOwnedVal === 'true' : undefined;
    const typeStr = (formData.get('deviceType') as string) || (formData.get('type') as string);

    let variations: any[] = [];
    if (variationsStr) {
      try {
        variations = JSON.parse(variationsStr);
      } catch (e) { }
    }

    const existingImagesStr = formData.get('existingImages') as string | null;
    let existingImages: string[] = [];
    if (existingImagesStr) {
      try {
        const parsed = JSON.parse(existingImagesStr);
        if (Array.isArray(parsed)) {
          existingImages = parsed.filter(url => typeof url === 'string' && url.trim().length > 0);
        }
      } catch (e) {
        existingImages = [];
      }
    }

    const filesToUpload = imagesForm.length > 0 ? imagesForm : (singleImage ? [singleImage] : []);
    let newImageUrls: string[] = [];

    if (filesToUpload.length > 0) {
      for (const file of filesToUpload) {
        if (file && file.name && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const imageUrl = await uploadToCloudinary(buffer, 'devices');
          newImageUrls.push(imageUrl);
        }
      }
    }

    // Combine existing images with newly uploaded images, limited to 5
    let finalImages: string[] | undefined = undefined;
    if (existingImagesStr !== null || filesToUpload.length > 0) {
      finalImages = [...existingImages, ...newImageUrls].slice(0, 5);
    }

    const primaryImage = finalImages !== undefined
      ? (finalImages.length > 0 ? finalImages[0] : null)
      : undefined;

    let downpaymentImageUrl = undefined;
    if (downpaymentFormImage && downpaymentFormImage.name && downpaymentFormImage.size > 0) {
      const buffer = Buffer.from(await downpaymentFormImage.arrayBuffer());
      downpaymentImageUrl = await uploadToCloudinary(buffer, 'devices/downpayments');
    }

    const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];

    const device = await prisma.$transaction(async (tx) => {
      const updatedDevice = await tx.device.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(priceStr && { price: parseFloat(priceStr) }),
          ...(costStr && { cost: parseFloat(costStr) }),
          ...(stockStr && { stock: parseInt(stockStr, 10) }),
          ...(typeStr && { type: typeStr }),
          ...(discountStr !== null && discountStr !== undefined && { 
            discount: Math.max(0, Math.min(100, parseFloat(discountStr as string) || 0)) 
          }),
          ...(discountStartDateStr !== null && {
            discountStartDate: discountStartDateStr ? new Date(discountStartDateStr as string) : null
          }),
          ...(discountEndDateStr !== null && {
            discountEndDate: discountEndDateStr ? new Date(discountEndDateStr as string) : null
          }),
          ...(isPreOwned !== undefined && { isPreOwned }),
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(specs !== null && { specs: specs || null }),
          ...(asLowAs !== null && { asLowAs: asLowAs || null }),
          ...(warranty !== null && { warranty: warranty || null }),
          ...(downpayment !== null && { downpayment: downpayment || null }),
          ...(primaryImage !== undefined && { image: primaryImage }),
          ...(finalImages !== undefined && { images: finalImages }),
          ...(downpaymentImageUrl && { downpaymentImage: downpaymentImageUrl }),
        }
      });

      if (variationsStr) {
        // Delete old variations and recreate with fresh branch stocks
        await tx.deviceVariation.deleteMany({ where: { deviceId: id } });

        if (variations.length > 0) {
          for (const v of variations) {
            const prodId = formatProductId(name || updatedDevice.name, v.name, v.productId);
            const varStock = parseInt(v.stock || 0, 10);

            const createdVar = await tx.deviceVariation.create({
              data: {
                deviceId: id,
                type: v.type || 'Storage',
                name: v.name,
                productId: prodId,
                price: parseFloat(v.price || updatedDevice.price),
                cost: parseFloat(v.cost || updatedDevice.cost),
                stock: varStock
              }
            });

            const tagStock = v.tagoloanStock !== undefined ? parseInt(v.tagoloanStock, 10) : (v.branchStocks?.Tagoloan ?? varStock);
            const vilStock = v.villanuevaStock !== undefined ? parseInt(v.villanuevaStock, 10) : (v.branchStocks?.Villanueva ?? 0);
            const jasStock = v.jasaanStock !== undefined ? parseInt(v.jasaanStock, 10) : (v.branchStocks?.Jasaan ?? 0);

            const bStockMap: Record<string, number> = {
              Tagoloan: isNaN(tagStock) ? 0 : tagStock,
              Villanueva: isNaN(vilStock) ? 0 : vilStock,
              Jasaan: isNaN(jasStock) ? 0 : jasStock
            };

            for (const b of branches) {
              await tx.branchStock.create({
                data: {
                  deviceId: id,
                  variationId: createdVar.id,
                  branch: b,
                  productId: prodId,
                  stock: bStockMap[b] || 0,
                  sold: 0
                }
              });
            }
          }
        }
      }

      return updatedDevice;
    });

    await triggerStockAlert({ deviceId: id });

    return NextResponse.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}
