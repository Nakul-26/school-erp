import { StorageProvider, StorageProviderType } from '../types';
import { R2StorageProvider } from './r2-storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

export function getStorageProvider(providerType: StorageProviderType = 'R2', env?: any): StorageProvider {
  if (providerType === 'LOCAL') {
    return new LocalStorageProvider();
  }
  
  // Default to R2 provider with FILES binding if available
  const r2Bucket = env?.FILES || null;
  return new R2StorageProvider(r2Bucket);
}
