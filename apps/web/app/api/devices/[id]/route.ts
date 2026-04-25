import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
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
    const image = formData.get('deviceImage') as File | null;

    let imageUrl = undefined;
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
    
    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(priceStr && { price: parseFloat(priceStr) }),
        ...(costStr && { cost: parseFloat(costStr) }),
        ...(stockStr && { stock: parseInt(stockStr, 10) }),
        ...(categoryId && { categoryId }),
        ...(specs && { specs }),
        ...(imageUrl && { image: imageUrl }),
      }
    });
    return NextResponse.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}
