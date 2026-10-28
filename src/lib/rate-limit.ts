import { NextRequest } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory sliding window cache
const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic garbage collection every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
function cleanupExpiredEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60000) return; // Run at most once per minute
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Sliding window rate limiter for public endpoints.
 * @param req NextRequest
 * @param options.limit Maximum requests allowed in the window (default: 20)
 * @param options.windowSeconds Window duration in seconds (default: 60s)
 * @param options.prefix Key namespace (e.g. "portal_verify", "portal_history")
 */
export function checkRateLimit(
  req: NextRequest,
  options: {
    limit?: number;
    windowSeconds?: number;
    prefix?: string;
  } = {}
): RateLimitResult {
  const limit = options.limit ?? 20;
  const windowSeconds = options.windowSeconds ?? 60;
  const windowMs = windowSeconds * 1000;
  const prefix = options.prefix ?? "rl";

  cleanupExpiredEntries(windowMs);

  // Extract client IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const clientIp = (forwarded ? forwarded.split(",")[0].trim() : realIp) || "127.0.0.1";

  const key = `${prefix}:${clientIp}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key) || { timestamps: [] };

  // Retain only timestamps within the current sliding window
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - validTimestamps.length),
    resetInSeconds: windowSeconds,
  };
}

