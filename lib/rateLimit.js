// Rate Limiter for API Protection
const rateLimit = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimit.entries()) {
        if (now - value.timestamp > 60000) {
            rateLimit.delete(key);
        }
    }
}, 300000);

export function checkRateLimit(ip, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const key = ip;

    if (!rateLimit.has(key)) {
        rateLimit.set(key, { count: 1, timestamp: now });
        return { success: true, remaining: limit - 1 };
    }

    const data = rateLimit.get(key);

    // Reset if window has passed
    if (now - data.timestamp > windowMs) {
        rateLimit.set(key, { count: 1, timestamp: now });
        return { success: true, remaining: limit - 1 };
    }

    // Check if limit exceeded
    if (data.count >= limit) {
        return {
            success: false,
            remaining: 0,
            retryAfter: Math.ceil((data.timestamp + windowMs - now) / 1000)
        };
    }

    // Increment count
    data.count++;
    return { success: true, remaining: limit - data.count };
}

// Helper for API routes
export function rateLimitResponse(remaining, retryAfter) {
    return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Remaining': remaining.toString(),
                'Retry-After': retryAfter?.toString() || '60',
            },
        }
    );
}
