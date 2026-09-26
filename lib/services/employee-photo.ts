export interface EmployeePhotoStorage {
  /**
   * Uploads a photo buffer and returns a storage reference string.
   * Throws if validation fails.
   */
  upload(file: File): Promise<string>;
  
  /**
   * Replaces an existing photo with a new one.
   * Returns the new storage reference.
   */
  replace(oldReference: string, newFile: File): Promise<string>;
  
  /**
   * Deletes a photo from storage.
   */
  delete(reference: string): Promise<void>;
  
  /**
   * Translates a storage reference into an accessible URL.
   */
  getUrl(reference: string): Promise<string>;
}

// Memory placeholder since we cannot securely store in a public dir
// In a real production deployment this would be replaced with S3Storage or similar.
class LocalStorageProvider implements EmployeePhotoStorage {
  private readonly MAX_SIZE = 1 * 1024 * 1024; // 1 MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  private async validate(file: File) {
    if (file.size > this.MAX_SIZE) {
      throw new Error("File size must not exceed 1MB");
    }
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Only JPEG, PNG, and WEBP images are allowed");
    }
    
    // In production, we'd check actual file magic bytes here.
  }

  async upload(file: File): Promise<string> {
    await this.validate(file);
    // Conceptually upload file, returning a mock reference for Phase 13
    // E.g., S3 url or blob id. We use a fake ID in memory for now.
    return `photo_${Date.now()}_${file.name}`;
  }

  async replace(oldReference: string, newFile: File): Promise<string> {
    await this.validate(newFile);
    return `photo_${Date.now()}_${newFile.name}`;
  }

  async delete(reference: string): Promise<void> {
    // Delete from storage
  }

  async getUrl(reference: string): Promise<string> {
    // Normally returns a signed URL. 
    return `/api/employees/photos/${reference}`;
  }
}

export const PhotoStorage = new LocalStorageProvider();
