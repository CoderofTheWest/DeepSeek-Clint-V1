/**
 * Cache Manager - Phase 6.1: Intelligent Caching System
 * 
 * Provides intelligent caching for:
 * - Profile data
 * - Contextual insights
 * - Text similarity calculations
 * - Trust relationships
 */

const EventEmitter = require('events');

class CacheManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Cache configuration - Optimized for better hit rates
        this.config = {
            profileCacheSize: options.profileCacheSize || 500, // Increased from 100
            contextCacheSize: options.contextCacheSize || 200, // Increased from 50
            similarityCacheSize: options.similarityCacheSize || 1000, // Increased from 200
            trustCacheSize: options.trustCacheSize || 200, // Increased from 50
            defaultTTL: options.defaultTTL || 900000, // Increased to 15 minutes (from 5)
            cleanupInterval: options.cleanupInterval || 300000, // Increased to 5 minutes (from 1)
            ...options
        };
        
        // Cache stores
        this.caches = {
            profiles: new Map(),
            contexts: new Map(),
            similarities: new Map(),
            trust: new Map()
        };
        
        // Cache metadata
        this.metadata = {
            profiles: new Map(),
            contexts: new Map(),
            similarities: new Map(),
            trust: new Map()
        };
        
        // Performance metrics
        this.metrics = {
            hits: { profiles: 0, contexts: 0, similarities: 0, trust: 0 },
            misses: { profiles: 0, contexts: 0, similarities: 0, trust: 0 },
            evictions: { profiles: 0, contexts: 0, similarities: 0, trust: 0 },
            lastCleanup: Date.now()
        };
        
        // Start cleanup timer (re-enabled after memory leak investigation)
        this.startCleanupTimer();
        
        console.log('[CacheManager] Initialized with intelligent caching (cleanup enabled)');
    }
    
    // ============= PROFILE CACHE =============
    
    getProfile(profileId) {
        const key = `profile:${profileId}`;
        
        if (this.caches.profiles.has(key)) {
            const entry = this.caches.profiles.get(key);
            if (!this.isExpired(entry.metadata)) {
                this.metrics.hits.profiles++;
                console.log(`[CacheManager] Profile cache HIT: ${profileId}`);
                return entry.data;
            } else {
                this.caches.profiles.delete(key);
                this.metadata.profiles.delete(key);
            }
        }
        
        this.metrics.misses.profiles++;
        console.log(`[CacheManager] Profile cache MISS: ${profileId}`);
        return null;
    }
    
    setProfile(profileId, profileData, ttl = this.config.defaultTTL) {
        const key = `profile:${profileId}`;
        const now = Date.now();
        
        // Create cache entry
        const entry = {
            data: profileData,
            metadata: {
                created: now,
                expires: now + ttl,
                accessCount: 0,
                lastAccessed: now
            }
        };
        
        // Check cache size and evict if necessary
        if (this.caches.profiles.size >= this.config.profileCacheSize) {
            this.evictLRU('profiles');
        }
        
        this.caches.profiles.set(key, entry);
        this.metadata.profiles.set(key, entry.metadata);
        
        console.log(`[CacheManager] Profile cached: ${profileId} (TTL: ${ttl}ms)`);
        
        // Emit cache event
        this.emit('profileCached', { profileId, ttl });
    }
    
    // ============= CONTEXT CACHE =============
    
    async getContext(contextKey) {
        const key = `context:${contextKey}`;
        
        if (this.caches.contexts.has(key)) {
            const entry = this.caches.contexts.get(key);
            if (!this.isExpired(entry.metadata)) {
                this.metrics.hits.contexts++;
                entry.metadata.accessCount++;
                entry.metadata.lastAccessed = Date.now();
                console.log(`[CacheManager] Context cache HIT: ${contextKey}`);
                return entry.data;
            } else {
                this.caches.contexts.delete(key);
                this.metadata.contexts.delete(key);
            }
        }
        
        this.metrics.misses.contexts++;
        console.log(`[CacheManager] Context cache MISS: ${contextKey}`);
        return null;
    }
    
    setContext(contextKey, contextData, ttl = this.config.defaultTTL) {
        const key = `context:${contextKey}`;
        const now = Date.now();
        
        const entry = {
            data: contextData,
            metadata: {
                created: now,
                expires: now + ttl,
                accessCount: 0,
                lastAccessed: now
            }
        };
        
        if (this.caches.contexts.size >= this.config.contextCacheSize) {
            this.evictLRU('contexts');
        }
        
        this.caches.contexts.set(key, entry);
        this.metadata.contexts.set(key, entry.metadata);
        
        console.log(`[CacheManager] Context cached: ${contextKey} (TTL: ${ttl}ms)`);
        this.emit('contextCached', { contextKey, ttl });
    }
    
    // ============= SIMILARITY CACHE =============
    
    getSimilarity(input, profileId) {
        const key = `similarity:${this.hashString(input)}:${profileId}`;
        
        if (this.caches.similarities.has(key)) {
            const entry = this.caches.similarities.get(key);
            if (!this.isExpired(entry.metadata)) {
                this.metrics.hits.similarities++;
                entry.metadata.accessCount++;
                entry.metadata.lastAccessed = Date.now();
                console.log(`[CacheManager] Similarity cache HIT: ${profileId}`);
                return entry.data;
            } else {
                this.caches.similarities.delete(key);
                this.metadata.similarities.delete(key);
            }
        }
        
        this.metrics.misses.similarities++;
        console.log(`[CacheManager] Similarity cache MISS: ${profileId}`);
        return null;
    }
    
    setSimilarity(input, profileId, similarity, ttl = this.config.defaultTTL) {
        const key = `similarity:${this.hashString(input)}:${profileId}`;
        const now = Date.now();
        
        const entry = {
            data: similarity,
            metadata: {
                created: now,
                expires: now + ttl,
                accessCount: 0,
                lastAccessed: now
            }
        };
        
        if (this.caches.similarities.size >= this.config.similarityCacheSize) {
            this.evictLRU('similarities');
        }
        
        this.caches.similarities.set(key, entry);
        this.metadata.similarities.set(key, entry.metadata);
        
        console.log(`[CacheManager] Similarity cached: ${profileId} (${similarity.toFixed(3)})`);
        this.emit('similarityCached', { input, profileId, similarity });
    }
    
    // ============= TRUST CACHE =============
    
    async getTrustRelationships(profileId) {
        const key = `trust:${profileId}`;
        
        if (this.caches.trust.has(key)) {
            const entry = this.caches.trust.get(key);
            if (!this.isExpired(entry.metadata)) {
                this.metrics.hits.trust++;
                entry.metadata.accessCount++;
                entry.metadata.lastAccessed = Date.now();
                console.log(`[CacheManager] Trust cache HIT: ${profileId}`);
                return entry.data;
            } else {
                this.caches.trust.delete(key);
                this.metadata.trust.delete(key);
            }
        }
        
        this.metrics.misses.trust++;
        console.log(`[CacheManager] Trust cache MISS: ${profileId}`);
        return null;
    }
    
    setTrustRelationships(profileId, trustData, ttl = this.config.defaultTTL) {
        const key = `trust:${profileId}`;
        const now = Date.now();
        
        const entry = {
            data: trustData,
            metadata: {
                created: now,
                expires: now + ttl,
                accessCount: 0,
                lastAccessed: now
            }
        };
        
        if (this.caches.trust.size >= this.config.trustCacheSize) {
            this.evictLRU('trust');
        }
        
        this.caches.trust.set(key, entry);
        this.metadata.trust.set(key, entry.metadata);
        
        console.log(`[CacheManager] Trust relationships cached: ${profileId}`);
        this.emit('trustCached', { profileId });
    }
    
    // ============= CACHE MANAGEMENT =============
    
    evictLRU(cacheType) {
        const cache = this.caches[cacheType];
        const metadata = this.metadata[cacheType];
        
        if (cache.size === 0) return;
        
        // Find least recently used entry
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, meta] of metadata.entries()) {
            if (meta.lastAccessed < oldestTime) {
                oldestTime = meta.lastAccessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            cache.delete(oldestKey);
            metadata.delete(oldestKey);
            this.metrics.evictions[cacheType]++;
            console.log(`[CacheManager] Evicted LRU from ${cacheType}: ${oldestKey}`);
            this.emit('evicted', { cacheType, key: oldestKey });
        }
    }
    
    isExpired(metadata) {
        return Date.now() > metadata.expires;
    }
    
    // ============= CLEANUP AND MAINTENANCE =============
    
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupExpired();
        }, this.config.cleanupInterval);
    }
    
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;
        
        // Clean all cache types
        for (const cacheType of Object.keys(this.caches)) {
            const cache = this.caches[cacheType];
            const metadata = this.metadata[cacheType];
            
            for (const [key, entry] of cache.entries()) {
                if (this.isExpired(entry.metadata)) {
                    cache.delete(key);
                    metadata.delete(key);
                    cleaned++;
                }
            }
        }
        
        if (cleaned > 0) {
            console.log(`[CacheManager] Cleaned ${cleaned} expired entries`);
            this.emit('cleanup', { cleaned, timestamp: now });
        }
        
        this.metrics.lastCleanup = now;
    }
    
    // ============= CACHE INVALIDATION =============
    
    invalidateProfile(profileId) {
        const key = `profile:${profileId}`;
        this.caches.profiles.delete(key);
        this.metadata.profiles.delete(key);
        console.log(`[CacheManager] Invalidated profile cache: ${profileId}`);
        this.emit('profileInvalidated', { profileId });
    }
    
    invalidateSimilarities(profileId = null) {
        if (profileId) {
            // Invalidate similarities for specific profile
            for (const key of this.caches.similarities.keys()) {
                if (key.includes(`:${profileId}`)) {
                    this.caches.similarities.delete(key);
                    this.metadata.similarities.delete(key);
                }
            }
            console.log(`[CacheManager] Invalidated similarities for profile: ${profileId}`);
        } else {
            // Invalidate all similarities
            this.caches.similarities.clear();
            this.metadata.similarities.clear();
            console.log(`[CacheManager] Invalidated all similarity cache`);
        }
        this.emit('similaritiesInvalidated', { profileId });
    }
    
    // ============= UTILITIES =============
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    // ============= METRICS AND MONITORING =============
    
    getMetrics() {
        const totalHits = Object.values(this.metrics.hits).reduce((a, b) => a + b, 0);
        const totalMisses = Object.values(this.metrics.misses).reduce((a, b) => a + b, 0);
        const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2) : 0;
        
        return {
            ...this.metrics,
            hitRate: `${hitRate}%`,
            cacheSizes: {
                profiles: this.caches.profiles.size,
                contexts: this.caches.contexts.size,
                similarities: this.caches.similarities.size,
                trust: this.caches.trust.size
            },
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    getMemoryUsage() {
        // Approximate memory usage calculation
        let totalSize = 0;
        
        for (const cacheType of Object.keys(this.caches)) {
            const cache = this.caches[cacheType];
            totalSize += cache.size * 1024; // Rough estimate: 1KB per entry
        }
        
        return {
            estimated: `${(totalSize / 1024).toFixed(2)} KB`,
            entries: Object.values(this.caches).reduce((total, cache) => total + cache.size, 0)
        };
    }
    
    clearCache(cacheType = null) {
        if (cacheType && this.caches[cacheType]) {
            this.caches[cacheType].clear();
            this.metadata[cacheType].clear();
            console.log(`[CacheManager] Cleared ${cacheType} cache`);
        } else {
            // Clear all caches
            for (const cache of Object.values(this.caches)) {
                cache.clear();
            }
            for (const metadata of Object.values(this.metadata)) {
                metadata.clear();
            }
            console.log(`[CacheManager] Cleared all caches`);
        }
        this.emit('cacheCleared', { cacheType });
    }
}

module.exports = CacheManager;
