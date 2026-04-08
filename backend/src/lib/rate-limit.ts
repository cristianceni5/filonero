type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function cleanupExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

// In-memory limiter: in serverless this is best-effort only.
// Replace with Redis/KV for strict global limits in production.
export function consumeRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return true;
  }

  if (current.count >= max) {
    return false;
  }

  current.count += 1;
  buckets.set(key, current);
  return true;
}
