import { LocalStorageAdapter } from "./local-adapter";
import { StorageProvider } from "./types";

export const storageService: StorageProvider = new LocalStorageAdapter();
