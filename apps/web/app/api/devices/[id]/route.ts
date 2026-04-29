import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { getSession } from '../../../../lib/session';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const device = await prisma.device.findUnique({
      where: { id },
      include: { variations: true }
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

    return NextResponse.json({ ...device, hasPurchased });
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

    const imageUrl = imageUrls.length > 0 ? imageUrls[0] : undefined;
    const updateImages = imageUrls.length > 0 ? imageUrls : undefined;

    let downpaymentImageUrl = undefined;
    if (downpaymentFormImage && downpaymentFormImage.name && downpaymentFormImage.size > 0) {
      const buffer = Buffer.from(await downpaymentFormImage.arrayBuffer());
      downpaymentImageUrl = await uploadToCloudinary(buffer, 'devices/downpayments');
    }

    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(priceStr && { price: parseFloat(priceStr) }),
        ...(costStr && { cost: parseFloat(costStr) }),
        ...(stockStr && { stock: parseInt(stockStr, 10) }),
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(specs !== null && { specs: specs || null }),
        ...(asLowAs !== null && { asLowAs: asLowAs || null }),
        ...(warranty !== null && { warranty: warranty || null }),
        ...(downpayment !== null && { downpayment: downpayment || null }),
        ...(imageUrl && { image: imageUrl }),
        ...(updateImages && { images: updateImages }),
        ...(downpaymentImageUrl && { downpaymentImage: downpaymentImageUrl }),
      }
    });
    return NextResponse.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}
