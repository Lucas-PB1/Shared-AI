/**
 * Bootstrap env helpers (thin). Connection pairs vivem em app_connections.
 * Prefer `@/shared/config/connection` no app.
 */

export {
  applyActiveCookies,
  CONNECTION_COOKIE,
  createBootstrapServiceClient,
  createServiceClient,
  getActiveSecretKey,
  getBootstrapPair,
  getCloudPair,
  getConnectionPublicSnapshot,
  getLocalPair,
  getSupabaseEnv,
  getTarget,
  loadConnectionPairs,
  resolvePublicConfigFromEnvAndCookies,
  saveConnections,
  switchActiveTarget,
  testConnection,
  type ConnectionSnapshot,
  type ConnectionWriteInput,
  type SupabasePair,
  type SupabaseTarget,
} from './connection';
