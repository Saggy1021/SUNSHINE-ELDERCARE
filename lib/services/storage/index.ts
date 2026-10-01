import { LocalStorageAdapter } from "./local-adapter";
import { GoogleDriveStorageProvider } from "./google-drive-adapter";
import { R2StorageProvider } from "./r2-adapter";
import { StorageProvider } from "./types";

const providerType = process.env.STORAGE_PROVIDER || "local";

export const storageService: StorageProvider = 
  providerType === "r2"
    ? new R2StorageProvider()
    : providerType === "google-drive"
      ? new GoogleDriveStorageProvider()
      : new LocalStorageAdapter();

