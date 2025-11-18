import { supabaseAdmin } from './supabase';
import { randomUUID } from 'crypto';

export class SupabaseStorageService {
  private publicBucket = 'public-assets';
  private privateBucket = 'user-uploads';

  /**
   * Upload a file to Supabase Storage
   * @param file - File buffer or blob
   * @param fileName - Name of the file
   * @param isPublic - Whether to store in public or private bucket
   * @returns Public URL or path to the file
   */
  async uploadFile(
    file: Buffer | Blob,
    fileName: string,
    isPublic: boolean = false
  ): Promise<string> {
    const bucket = isPublic ? this.publicBucket : this.privateBucket;
    const fileId = randomUUID();
    const filePath = `${fileId}-${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: this.getContentType(fileName),
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // For public files, return the public URL
    if (isPublic) {
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);
      return urlData.publicUrl;
    }

    // For private files, return the path (will generate signed URL when needed)
    return data.path;
  }

  /**
   * Get a signed URL for a private file
   * @param filePath - Path to the file in storage
   * @param expiresIn - Expiration time in seconds (default 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.privateBucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Get public URL for a public file
   * @param filePath - Path to the file in public bucket
   * @returns Public URL
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabaseAdmin.storage
      .from(this.publicBucket)
      .getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * Delete a file from storage
   * @param filePath - Path to the file
   * @param isPublic - Whether the file is in public or private bucket
   */
  async deleteFile(filePath: string, isPublic: boolean = false): Promise<void> {
    const bucket = isPublic ? this.publicBucket : this.privateBucket;
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Upload layout image (public)
   * @param file - Image file
   * @param fileName - Name of the file
   * @returns Public URL
   */
  async uploadLayoutImage(file: Buffer, fileName: string): Promise<string> {
    return this.uploadFile(file, fileName, true);
  }

  /**
   * Upload user file (private - for t-shirt designs, etc.)
   * @param file - User file
   * @param fileName - Name of the file
   * @returns File path
   */
  async uploadUserFile(file: Buffer, fileName: string): Promise<string> {
    return this.uploadFile(file, fileName, false);
  }

  /**
   * Get upload URL for direct client uploads
   * This generates a signed upload URL that clients can use
   * @param fileName - Name of the file to upload
   * @param isPublic - Whether to upload to public or private bucket
   * @returns Signed upload URL
   */
  async getUploadUrl(fileName: string, isPublic: boolean = false): Promise<{
    uploadUrl: string;
    path: string;
  }> {
    const bucket = isPublic ? this.publicBucket : this.privateBucket;
    const fileId = randomUUID();
    const filePath = `${fileId}-${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error) {
      throw new Error(`Failed to create upload URL: ${error.message}`);
    }

    return {
      uploadUrl: data.signedUrl,
      path: data.path,
    };
  }

  /**
   * Helper to determine content type from file name
   */
  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      json: 'application/json',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}

export const supabaseStorage = new SupabaseStorageService();

