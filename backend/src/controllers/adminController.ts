import type { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getDatabaseStats = asyncHandler(async (_req: Request, res: Response) => {
  if (!mongoose.connection.db) {
    res.status(503).json({ message: "Database not connected" });
    return;
  }

  const db = mongoose.connection.db;
  const dbStats = await db.stats();

  const collectionsList = await db.listCollections().toArray();
  const collections = await Promise.all(
    collectionsList
      .map((c) => c.name)
      .filter((name) => !name.startsWith("system."))
      .map(async (name) => {
        const coll = db.collection(name) as unknown as {
          stats(): Promise<{
            count: number;
            avgObjSize: number;
            size: number;
            storageSize: number;
            totalIndexSize: number;
            nindexes: number;
          }>;
        };
        const stats = await coll.stats();
        return {
          name,
          count: stats.count ?? 0,
          avgObjSize: stats.avgObjSize ?? 0,
          dataSize: stats.size ?? 0,
          storageSize: stats.storageSize ?? 0,
          indexSize: stats.totalIndexSize ?? 0,
          totalIndexes: stats.nindexes ?? 0,
        };
      }),
  );

  collections.sort((a, b) => b.dataSize - a.dataSize);

  res.json({
    database: db.databaseName,
    dataSize: dbStats.dataSize ?? 0,
    storageSize: dbStats.storageSize ?? 0,
    indexSize: dbStats.indexSize ?? 0,
    totalDocuments: dbStats.objects ?? 0,
    collectionsCount: dbStats.collections ?? 0,
    indexesCount: dbStats.indexes ?? 0,
    avgObjSize: dbStats.avgObjSize ?? 0,
    fsUsedSize: dbStats.fsUsedSize ?? 0,
    fsTotalSize: dbStats.fsTotalSize ?? 0,
    collections,
  });
});
