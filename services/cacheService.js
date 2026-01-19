import crypto from 'crypto';

/**
 * Cache Service for Clean Images
 * Stores clean (unwatermarked) images temporarily for purchase/unlock
 * Uses in-memory storage with TTL (can be extended to Redis/S3)
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.TTL = 30 * 60 * 1000; // 30 minutes
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate unique request ID
   * @returns {string}
   */
  generateRequestId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Store clean image with metadata
   * @param {Buffer} imageBuffer - Clean image buffer
   * @param {object} metadata - Associated metadata
   * @returns {string} - Request ID for later retrieval
   */
  storeCleanImage(imageBuffer, metadata = {}) {
    const requestId = this.generateRequestId();
    const expiresAt = Date.now() + this.TTL;

    this.cache.set(requestId, {
      buffer: imageBuffer,
      metadata: {
        ...metadata,
        storedAt: Date.now(),
        expiresAt
      }
    });

    console.log(`Cached clean image: ${requestId} (expires in ${this.TTL/1000}s)`);
    return requestId;
  }

  /**
   * Retrieve and remove clean image from cache
   * @param {string} requestId - Request ID
   * @returns {object|null} - {buffer, metadata} or null if not found/expired
   */
  retrieveCleanImage(requestId) {
    const cached = this.cache.get(requestId);
    
    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() > cached.metadata.expiresAt) {
      this.cache.delete(requestId);
      console.log(`Clean image expired: ${requestId}`);
      return null;
    }

    // Remove from cache after retrieval (one-time use)
    this.cache.delete(requestId);
    console.log(`Retrieved and removed clean image: ${requestId}`);
    
    return cached;
  }

  /**
   * Check if request ID exists and is valid
   * @param {string} requestId - Request ID
   * @returns {boolean}
   */
  exists(requestId) {
    const cached = this.cache.get(requestId);
    
    if (!cached) {
      return false;
    }

    // Check expiration
    if (Date.now() > cached.metadata.expiresAt) {
      this.cache.delete(requestId);
      return false;
    }

    return true;
  }

  /**
   * Get metadata without retrieving image
   * @param {string} requestId - Request ID
   * @returns {object|null}
   */
  getMetadata(requestId) {
    const cached = this.cache.get(requestId);
    
    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() > cached.metadata.expiresAt) {
      this.cache.delete(requestId);
      return null;
    }

    return cached.metadata;
  }

  /**
   * Extend TTL for a cached image
   * @param {string} requestId - Request ID
   * @param {number} additionalTime - Additional time in milliseconds
   * @returns {boolean} - Success status
   */
  extendTTL(requestId, additionalTime = 30 * 60 * 1000) {
    const cached = this.cache.get(requestId);
    
    if (!cached) {
      return false;
    }

    cached.metadata.expiresAt += additionalTime;
    this.cache.set(requestId, cached);
    
    console.log(`Extended TTL for ${requestId} by ${additionalTime/1000}s`);
    return true;
  }

  /**
   * Cleanup expired entries
   * @private
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [requestId, cached] of this.cache.entries()) {
      if (now > cached.metadata.expiresAt) {
        this.cache.delete(requestId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Cache cleanup: removed ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [_, cached] of this.cache.entries()) {
      if (now > cached.metadata.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   * @private
   */
  estimateMemoryUsage() {
    let totalBytes = 0;

    for (const [_, cached] of this.cache.entries()) {
      totalBytes += cached.buffer.length;
    }

    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  }

  /**
   * Clear all cached images
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`Cache cleared: removed ${size} entries`);
  }

  /**
   * Remove specific cached image
   * @param {string} requestId - Request ID
   * @returns {boolean}
   */
  remove(requestId) {
    const existed = this.cache.has(requestId);
    this.cache.delete(requestId);
    
    if (existed) {
      console.log(`Removed cached image: ${requestId}`);
    }
    
    return existed;
  }
}

// Export singleton instance
export default new CacheService();
