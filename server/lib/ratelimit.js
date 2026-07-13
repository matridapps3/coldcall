// Tiny dependency-free in-memory rate limiter. Fine for a single-instance,
// self-hosted deployment; swap for a shared store if you ever run multiple nodes.
//
// rateLimit({ windowMs, max, key? }) -> express middleware that 429s a client
// (by IP, or a custom key) once it exceeds `max` requests in the window.

export function rateLimit({ windowMs = 60_000, max = 30, key } = {}) {
  const hits = new Map(); // key -> [timestamps within window]

  return (req, res, next) => {
    const k = key ? key(req) : (req.ip || req.socket?.remoteAddress || 'unknown');
    const t = Date.now();
    const arr = (hits.get(k) || []).filter((ts) => t - ts < windowMs);
    if (arr.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: 'too many requests, please slow down' });
    }
    arr.push(t);
    hits.set(k, arr);
    // Opportunistic cleanup so the map does not grow unbounded.
    if (hits.size > 5000) for (const [kk, v] of hits) if (!v.some((ts) => t - ts < windowMs)) hits.delete(kk);
    next();
  };
}
