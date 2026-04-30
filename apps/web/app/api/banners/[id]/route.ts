import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs/promises';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const bannerId = (await params).id;
    
    // First find the banner to get its imageUrl so we can delete the file
    const banner = await prisma.banner.findUnique({
      where: { id: bannerId }
    });

    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    // Try to delete the file
    if (banner.imageUrl) {
      // imageUrl is like /banners/174912-name.jpg
      // we only want the filename
      const fileName = banner.imageUrl.split('/').pop();
      if (fileName) {
        const filePath = join(process.cwd(), 'public', 'banners', fileName);
        
        try {
          await stat(filePath); // Check if exists
          await unlink(filePath);
        } catch (fileErr) {
          console.warn('Could not delete banner file, probably already removed:', fileErr);
        }
      }
    }

    // Delete record from DB
    await prisma.banner.delete({
      where: { id: bannerId }
    });

    return NextResponse.json({ success: true, deletedId: bannerId });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
