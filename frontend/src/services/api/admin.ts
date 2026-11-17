import { apiClient } from "./client";

export interface DatabaseCollectionStats {
  name: string;
  count: number;
  avgObjSize: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  totalIndexes: number;
}

export interface DatabaseStats {
  database: string;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  totalDocuments: number;
  collectionsCount: number;
  indexesCount: number;
  avgObjSize: number;
  fsUsedSize: number;
  fsTotalSize: number;
  collections: DatabaseCollectionStats[];
}

export async function fetchDatabaseStats(): Promise<DatabaseStats | null> {
  try {
    return await apiClient<DatabaseStats>("/admin/db-stats");
  } catch {
    return null;
  }
}