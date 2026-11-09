import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '../../../lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || !file.name || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = (formData.get('folder') as string) || 'uploads';

    // 1. Try Cloudinary if environment variables are provided
    const hasCloudinary = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (hasCloudinary) {
      try {
        const imageUrl = await uploadToCloudinary(buffer, folder);
        return NextResponse.json({ url: imageUrl }, { status: 200 });
      } catch (cloudErr: any) {
        console.warn('Cloudinary upload failed, falling back to data URL storage:', cloudErr?.message || cloudErr);
      }
    }

    // 2. Resilient Fallback: Base64 Data URL (guarantees zero-failure uploads in Docker/staging)
    const mimeType = file.type || 'image/jpeg';
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({ url: dataUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error?.message || 'Failed to upload file' }, { status: 500 });
  }
}
