// NCBI E-utilities rate limits:
//   - Without API key: 3 requests/second
//   - With API key:   10 requests/second
// Applies globally across ESearch, ESummary, and EFetch.

class TokenBucketRateLimiter {
  private queue: Array<() => void> = [];
  private draining = false;
  private lastCallTime = 0;

  private get intervalMs(): number {
    // Evaluated at call time so hot-reloads and test overrides work correctly.
    return process.env.NCBI_API_KEY ? 100 : 334;
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      if (!this.draining) this.drain();
    });
  }

  private drain(): void {
    if (this.queue.length === 0) {
      this.draining = false;
      return;
    }
    this.draining = true;
    const wait = Math.max(0, this.lastCallTime + this.intervalMs - Date.now());
    setTimeout(() => {
      this.lastCallTime = Date.now();
      const resolve = this.queue.shift();
      resolve?.();
      this.drain();
    }, wait);
  }
}

export const rateLimiter = new TokenBucketRateLimiter();
