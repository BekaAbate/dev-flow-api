import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { UploadedImage, uploadOptions } from './types';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(
    file: Express.Multer.File,
    options: uploadOptions,
  ): Promise<UploadedImage> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          ...options,
          overwrite: true,
          resource_type: 'image',
          invalidate: true,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            reject(
              new Error(
                `Cloudinary upload failed with ${error.http_code} => ${error.message}`,
              ),
            );
          }
          if (!result)
            return reject(new Error('Cloudinary upload returned no result'));
          resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async delete(publicId: string) {
    interface CloudinaryDestroyResult {
      result: 'ok' | 'not found';
    }
    const response = (await cloudinary.uploader.destroy(
      publicId,
    )) as CloudinaryDestroyResult;
    if (response.result !== 'ok') {
      throw new Error(`Cloudinary destroy failed: ${response.result}`);
    }
  }
}
