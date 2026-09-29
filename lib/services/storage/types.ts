export interface StorageProvider {
  /**
   * Uploads a file to storage and returns a unique key.
   */
  upload(file: Buffer, metadata: { fileName: string; mimeType: string; userId: string; documentType: string }): Promise<string>;

  /**
   * Generates a temporary, signed download URL for a given storage key.
   * If the provider does not support signed URLs, it can return a generic URL or throw if unsupported.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Downloads a file from storage and returns a Buffer.
   * Used for sending attachments directly.
   */
  download(key: string): Promise<Buffer>;
  
  /**
   * Deletes a file from storage.
   */
  delete(key: string): Promise<void>;
}
