import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucket = 'images';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_PROJECT_URL ?? '',
      process.env.SUPABASE_API_KEY ?? '',
    );
  }

  async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);

    return data.publicUrl;
  }

  getPathFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const publicPath = `/storage/v1/object/public/${this.bucket}/`;

      if (pathname.startsWith(publicPath)) {
        return decodeURIComponent(pathname.slice(publicPath.length));
      }

      return pathname.replace(/^\/+/, '');
    } catch {
      return url.replace(/^\/+/, '');
    }
  }

  async deleteFile(path: string): Promise<void> {
    const storagePath = this.getPathFromUrl(path);
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([storagePath]);

    if (error) {
      throw new Error(error.message);
    }
  }
}
