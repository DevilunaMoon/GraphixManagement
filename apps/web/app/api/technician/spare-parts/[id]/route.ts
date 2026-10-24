import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../../../lib/cloudinary';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const sparePart = await prisma.sparePart.findUnique({
      where: { id }
    });

    if (!sparePart) {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 });
    }

    return NextResponse.json(sparePart);
  } catch (error: any) {
    console.error('Error fetching spare part by id:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch spare part' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const existing = await prisma.sparePart.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    const updateData: any = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const name = (formData.get('name') as string) || (formData.get('deviceName') as string);
      const compatibleDevice = (formData.get('compatibleDevice') as string) || (formData.get('compatibleModel') as string);
      const category = (formData.get('category') as string);
      const stockStr = (formData.get('stock') as string) || (formData.get('deviceStocks') as string);
      const costStr = (formData.get('cost') as string) || (formData.get('deviceCost') as string);
      const priceStr = (formData.get('price') as string) || (formData.get('devicePrice') as string);
      const branch = (formData.get('branch') as string);

      if (name && name.trim()) updateData.name = name.trim();
      if (compatibleDevice !== null && compatibleDevice !== undefined) updateData.compatibleDevice = compatibleDevice.trim() || 'Universal';
      if (category && category.trim()) updateData.category = category.trim();
      if (branch && branch.trim()) updateData.branch = branch.trim();

      if (stockStr !== null && stockStr !== undefined) {
        const stock = parseInt(stockStr, 10);
        if (!isNaN(stock)) {
          updateData.stock = stock;
          updateData.status = stock === 0 ? 'Out of Stock' : stock < 5 ? 'Low Stock' : 'In Stock';
        }
      }

      if (costStr !== null && costStr !== undefined) {
        const cost = parseFloat(costStr);
        if (!isNaN(cost)) updateData.cost = cost;
      }

      if (priceStr !== null && priceStr !== undefined) {
        const price = parseFloat(priceStr);
        if (!isNaN(price)) updateData.price = price;
      }

      // Check if image uploaded
      const imageFile = (formData.get('image') as File | null) || (formData.get('deviceImage') as File | null);
      if (imageFile && imageFile.name && imageFile.size > 0) {
        try {
          const buffer = Buffer.from(await imageFile.arrayBuffer());
          const imageUrl = await uploadToCloudinary(buffer, 'spare-parts');
          updateData.image = imageUrl;
        } catch (uploadErr) {
          console.warn('Image upload error for spare part update:', uploadErr);
        }
      }
    } else {
      const body = await req.json();
      if (body.name && body.name.trim()) updateData.name = body.name.trim();
      if (body.compatibleDevice !== undefined) updateData.compatibleDevice = body.compatibleDevice.trim() || 'Universal';
      if (body.category && body.category.trim()) updateData.category = body.category.trim();
      if (body.branch && body.branch.trim()) updateData.branch = body.branch.trim();
      if (body.stock !== undefined) {
        const stock = Number(body.stock);
        updateData.stock = stock;
        updateData.status = stock === 0 ? 'Out of Stock' : stock < 5 ? 'Low Stock' : 'In Stock';
      }
      if (body.cost !== undefined) updateData.cost = Number(body.cost);
      if (body.price !== undefined) updateData.price = Number(body.price);
      if (body.image !== undefined) updateData.image = body.image;
    }

    const updated = await prisma.sparePart.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating spare part:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update spare part' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const existing = await prisma.sparePart.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 });
    }

    await prisma.sparePart.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Spare part deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting spare part:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete spare part' }, { status: 500 });
  }
}
