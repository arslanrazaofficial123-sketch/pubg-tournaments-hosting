// One-time sync: Atlas (live) -> local MongoDB on D:
const { MongoClient } = require('mongodb');
const fs = require('fs');

(async () => {
  const atlasUri = fs.readFileSync(process.env.LOCALAPPDATA + '\\epix-sync\\atlas-uri.txt', 'utf8').trim();
  const localUri = 'mongodb://epixAdmin:kKQYbcpo58NyOIeaZh1i@127.0.0.1:27017/pubg-tournaments?authSource=admin';

  const atlas = new MongoClient(atlasUri);
  const local = new MongoClient(localUri);
  await atlas.connect();
  await local.connect();

  const src = atlas.db();
  const dst = local.db();

  const collections = (await src.listCollections().toArray()).map(c => c.name);
  console.log('Collections:', collections.join(', '));

  for (const name of collections) {
    // Drop stale local copy
    await dst.dropCollection(name).catch(() => {});
    // Create + copy data
    await dst.createCollection(name);
    const docs = await src.collection(name).find({}).toArray();
    if (docs.length) await dst.collection(name).insertMany(docs);
    // Copy indexes
    const indexes = await src.collection(name).listIndexes().toArray();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      const { key, unique, sparse, expireAfterSeconds } = idx;
      const opts = {};
      if (unique) opts.unique = true;
      if (sparse) opts.sparse = true;
      if (expireAfterSeconds) opts.expireAfterSeconds = expireAfterSeconds;
      await dst.collection(name).createIndex(key, { ...opts, name: idx.name });
    }
    console.log(`  ${name}: ${docs.length} docs, ${indexes.length} indexes`);
  }

  // Verify
  let ok = true;
  for (const name of collections) {
    const a = await src.collection(name).countDocuments();
    const b = await dst.collection(name).countDocuments();
    const match = a === b;
    ok = ok && match;
    console.log(`  verify ${name}: Atlas=${a} Local=${b} ${match ? 'OK' : 'MISMATCH'}`);
  }

  await atlas.close();
  await local.close();
  console.log(ok ? 'SYNC COMPLETE: all collections match' : 'SYNC COMPLETE: MISMATCHES FOUND');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });