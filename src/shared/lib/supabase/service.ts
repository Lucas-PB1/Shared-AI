import { createServiceClient, getCloudPair, getLocalPair } from '@/shared/config/connection';

export async function createLocalServiceClient() {
  return createServiceClient(await getLocalPair(), 'local');
}

export async function createCloudServiceClient() {
  return createServiceClient(await getCloudPair(), 'cloud');
}
