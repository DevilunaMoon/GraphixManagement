import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  buffer: Buffer, 
  folder: string,
  extraOptions?: UploadApiOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        // Auto compress quality and format, limit max dimensions to save storage
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto:eco', fetch_format: 'auto' }
        ],
        ...extraOptions,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error("Cloudinary upload failed: No result returned"));
        }
      }
    );

    uploadStream.end(buffer);
  });
};

export default cloudinary;
