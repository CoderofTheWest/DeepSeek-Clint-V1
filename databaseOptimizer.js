/**
 * Database Optimizer - Phase 6.4: Database Optimization System
 * 
 * Optimizes:
 * - JSON storage structure
 * - Query performance
 * - Data indexing
 * - Batch operations
 * - Storage compression
 */

const fs = require('fs').promises;
const path = require('path');

class DatabaseOptimizer {
    constructor(profileManager, options = {}) {
        this.profileManager = profileManager;
        
        // Configuration
        this.config = {
            batchSize: options.batchSize || 50,
            indexSize: options.indexSize || 1000,
            compressionLevel: options.compressionLevel || 6,
            optimizeInterval: options.optimizeInterval || 600000, // 10 minutes
            enableIndexing: options.enableIndexing !== false,
            enableCompression: options.enableCompression !== false,
            ...options
        };
        
        // Indexes for fast lookups
        this.indexes = {
            profiles: new Map(), // profileId -> { path, lastModified, size }
            patterns: new Map(), // patternHash -> [profileIds]
            users: new Map(),    // userId -> profileId
            timestamps: new Map() // timestamp -> [profileIds]
        };
        
        // Statistics
        this.stats = {
            queriesOptimized: 0,
            indexesBuilt: 0,
            batchesProcessed: 0,
            compressionSaved: 0,
            lastOptimization: null,
            optimizationCount: 0
        };
        
        console.log('[DatabaseOptimizer] Initialized with optimization features');
    }
    
    // ============= INDEXING SYSTEM =============
    
    async buildIndexes() {
        try {
            console.log('[DatabaseOptimizer] Building indexes...');
            
            // Clear existing indexes
            this.clearIndexes();
            
            // Build profile index
            await this.buildProfileIndex();
            
            // Build pattern index
            await this.buildPatternIndex();
            
            // Build user index
            await this.buildUserIndex();
            
            // Build timestamp index
            await this.buildTimestampIndex();
            
            this.stats.indexesBuilt++;
            console.log('[DatabaseOptimizer] Indexes built successfully');
            
            return {
                profiles: this.indexes.profiles.size,
                patterns: this.indexes.patterns.size,
                users: this.indexes.users.size,
                timestamps: this.indexes.timestamps.size
            };
            
        } catch (error) {
            console.error('[DatabaseOptimizer] Error building indexes:', error.message);
            return null;
        }
    }
    
    async buildProfileIndex() {
        try {
            const profilesPath = this.profileManager.profilesPath;
            const echoesPath = this.profileManager.echoesPath;
            const stubsPath = this.profileManager.stubsPath;
            
            const paths = [profilesPath, echoesPath, stubsPath];
            
            for (const dirPath of paths) {
                try {
                    const files = await fs.readdir(dirPath);
                    
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const profileId = file.replace('.json', '');
                            const fullPath = path.join(dirPath, file);
                            
                            try {
                                const stats = await fs.stat(fullPath);
                                this.indexes.profiles.set(profileId, {
                                    path: fullPath,
                                    lastModified: stats.mtime,
                                    size: stats.size,
                                    directory: path.basename(dirPath)
                                });
                            } catch (error) {
                                console.warn(`[DatabaseOptimizer] Could not stat ${fullPath}:`, error.message);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`[DatabaseOptimizer] Could not read directory ${dirPath}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[DatabaseOptimizer] Error building profile index:', error.message);
        }
    }
    
    async buildPatternIndex() {
        try {
            for (const [profileId, profileInfo] of this.indexes.profiles.entries()) {
                try {
                    const profile = await this.profileManager.getProfile(profileId);
                    if (profile && profile.patterns) {
                        for (const pattern of profile.patterns) {
                            const patternHash = this.hashPattern(pattern.note);
                            if (!this.indexes.patterns.has(patternHash)) {
                                this.indexes.patterns.set(patternHash, []);
                            }
                            this.indexes.patterns.get(patternHash).push(profileId);
                        }
                    }
                } catch (error) {
                    console.warn(`[DatabaseOptimizer] Could not process patterns for ${profileId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[DatabaseOptimizer] Error building pattern index:', error.message);
        }
    }
    
    async buildUserIndex() {
        try {
            for (const [profileId, profileInfo] of this.indexes.profiles.entries()) {
                try {
                    const profile = await this.profileManager.getProfile(profileId);
                    if (profile && profile.id) {
                        this.indexes.users.set(profile.id, profileId);
                    }
                } catch (error) {
                    console.warn(`[DatabaseOptimizer] Could not process user for ${profileId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[DatabaseOptimizer] Error building user index:', error.message);
        }
    }
    
    async buildTimestampIndex() {
        try {
            for (const [profileId, profileInfo] of this.indexes.profiles.entries()) {
                try {
                    const profile = await this.profileManager.getProfile(profileId);
                    if (profile && profile.lastSeen) {
                        const timestamp = new Date(profile.lastSeen).getTime();
                        const timeKey = Math.floor(timestamp / (24 * 60 * 60 * 1000)); // Group by day
                        
                        if (!this.indexes.timestamps.has(timeKey)) {
                            this.indexes.timestamps.set(timeKey, []);
                        }
                        this.indexes.timestamps.get(timeKey).push(profileId);
                    }
                } catch (error) {
                    console.warn(`[DatabaseOptimizer] Could not process timestamp for ${profileId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[DatabaseOptimizer] Error building timestamp index:', error.message);
        }
    }
    
    // ============= OPTIMIZED QUERIES =============
    
    async findProfilesByPattern(pattern, limit = 10) {
        try {
            const patternHash = this.hashPattern(pattern);
            const profileIds = this.indexes.patterns.get(patternHash) || [];
            
            const profiles = [];
            for (const profileId of profileIds.slice(0, limit)) {
                const profile = await this.profileManager.getProfile(profileId);
                if (profile) profiles.push(profile);
            }
            
            this.stats.queriesOptimized++;
            return profiles;
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in pattern query:', error.message);
            return [];
        }
    }
    
    async findProfilesByDateRange(startDate, endDate) {
        try {
            const startTime = new Date(startDate).getTime();
            const endTime = new Date(endDate).getTime();
            
            const profiles = [];
            for (const [timeKey, profileIds] of this.indexes.timestamps.entries()) {
                const dayStart = timeKey * (24 * 60 * 60 * 1000);
                if (dayStart >= startTime && dayStart <= endTime) {
                    for (const profileId of profileIds) {
                        const profile = await this.profileManager.getProfile(profileId);
                        if (profile) profiles.push(profile);
                    }
                }
            }
            
            this.stats.queriesOptimized++;
            return profiles;
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in date range query:', error.message);
            return [];
        }
    }
    
    async findProfilesBySize(minSize, maxSize) {
        try {
            const profiles = [];
            for (const [profileId, profileInfo] of this.indexes.profiles.entries()) {
                if (profileInfo.size >= minSize && profileInfo.size <= maxSize) {
                    const profile = await this.profileManager.getProfile(profileId);
                    if (profile) profiles.push(profile);
                }
            }
            
            this.stats.queriesOptimized++;
            return profiles;
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in size query:', error.message);
            return [];
        }
    }
    
    // ============= BATCH OPERATIONS =============
    
    async batchUpdateProfiles(updates) {
        try {
            console.log(`[DatabaseOptimizer] Starting batch update of ${updates.length} profiles`);
            
            const results = [];
            const batchSize = this.config.batchSize;
            
            for (let i = 0; i < updates.length; i += batchSize) {
                const batch = updates.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async (update) => {
                        try {
                            const result = await this.profileManager.updateProfile(
                                update.profileId, 
                                update.data
                            );
                            return { profileId: update.profileId, success: result };
                        } catch (error) {
                            return { profileId: update.profileId, success: false, error: error.message };
                        }
                    })
                );
                
                results.push(...batchResults);
                this.stats.batchesProcessed++;
                
                // Small delay to prevent overwhelming the system
                if (i + batchSize < updates.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            console.log(`[DatabaseOptimizer] Batch update completed: ${results.length} profiles processed`);
            return results;
            
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in batch update:', error.message);
            return [];
        }
    }
    
    async batchDeleteProfiles(profileIds) {
        try {
            console.log(`[DatabaseOptimizer] Starting batch delete of ${profileIds.length} profiles`);
            
            const results = [];
            const batchSize = this.config.batchSize;
            
            for (let i = 0; i < profileIds.length; i += batchSize) {
                const batch = profileIds.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async (profileId) => {
                        try {
                            const result = await this.profileManager.deleteProfile(profileId);
                            return { profileId, success: result };
                        } catch (error) {
                            return { profileId, success: false, error: error.message };
                        }
                    })
                );
                
                results.push(...batchResults);
                this.stats.batchesProcessed++;
                
                // Small delay to prevent overwhelming the system
                if (i + batchSize < profileIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            console.log(`[DatabaseOptimizer] Batch delete completed: ${results.length} profiles processed`);
            return results;
            
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in batch delete:', error.message);
            return [];
        }
    }
    
    // ============= STORAGE OPTIMIZATION =============
    
    async optimizeStorage() {
        try {
            console.log('[DatabaseOptimizer] Starting storage optimization...');
            
            const startTime = Date.now();
            let totalSaved = 0;
            
            // Optimize individual profile files
            for (const [profileId, profileInfo] of this.indexes.profiles.entries()) {
                try {
                    const saved = await this.optimizeProfileFile(profileId, profileInfo);
                    totalSaved += saved;
                } catch (error) {
                    console.warn(`[DatabaseOptimizer] Could not optimize ${profileId}:`, error.message);
                }
            }
            
            // Rebuild indexes after optimization
            await this.buildIndexes();
            
            const duration = Date.now() - startTime;
            this.stats.compressionSaved += totalSaved;
            this.stats.lastOptimization = new Date().toISOString();
            this.stats.optimizationCount++;
            
            console.log(`[DatabaseOptimizer] Storage optimization completed in ${duration}ms, saved ${totalSaved} bytes`);
            
            return {
                duration,
                bytesSaved: totalSaved,
                profilesOptimized: this.indexes.profiles.size
            };
            
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in storage optimization:', error.message);
            return null;
        }
    }
    
    async optimizeProfileFile(profileId, profileInfo) {
        try {
            const profile = await this.profileManager.getProfile(profileId);
            if (!profile) return 0;
            
            // Get original file size
            const originalSize = profileInfo.size;
            
            // Optimize profile structure
            const optimizedProfile = this.optimizeProfileStructure(profile);
            
            // Write optimized profile
            const optimizedData = JSON.stringify(optimizedProfile);
            await fs.writeFile(profileInfo.path, optimizedData, 'utf8');
            
            // Calculate bytes saved
            const newSize = Buffer.byteLength(optimizedData, 'utf8');
            const saved = originalSize - newSize;
            
            // Update index
            profileInfo.size = newSize;
            profileInfo.lastModified = new Date();
            
            return saved;
        } catch (error) {
            console.warn(`[DatabaseOptimizer] Could not optimize file ${profileId}:`, error.message);
            return 0;
        }
    }
    
    optimizeProfileStructure(profile) {
        try {
            const optimized = { ...profile };
            
            // Remove empty arrays and objects
            Object.keys(optimized).forEach(key => {
                if (Array.isArray(optimized[key]) && optimized[key].length === 0) {
                    delete optimized[key];
                } else if (typeof optimized[key] === 'object' && optimized[key] !== null) {
                    const obj = optimized[key];
                    if (Object.keys(obj).length === 0) {
                        delete optimized[key];
                    }
                }
            });
            
            // Optimize patterns array
            if (optimized.patterns && optimized.patterns.length > 0) {
                optimized.patterns = optimized.patterns.map(pattern => ({
                    event: pattern.event,
                    note: pattern.note?.substring(0, 200), // Truncate long notes
                    relation: pattern.relation,
                    emotional: pattern.emotional
                }));
            }
            
            // Optimize tone baseline
            if (optimized.toneBaseline && typeof optimized.toneBaseline === 'object') {
                const baseline = optimized.toneBaseline;
                optimized.toneBaseline = {};
                Object.keys(baseline).forEach(word => {
                    if (baseline[word] > 0.01) { // Only keep significant words
                        optimized.toneBaseline[word] = Math.round(baseline[word] * 100) / 100; // Round to 2 decimal places
                    }
                });
            }
            
            return optimized;
        } catch (error) {
            console.warn('[DatabaseOptimizer] Error optimizing profile structure:', error.message);
            return profile;
        }
    }
    
    // ============= UTILITIES =============
    
    hashPattern(pattern) {
        let hash = 0;
        const str = pattern.toLowerCase().replace(/[^\w\s]/g, '');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    clearIndexes() {
        this.indexes.profiles.clear();
        this.indexes.patterns.clear();
        this.indexes.users.clear();
        this.indexes.timestamps.clear();
    }
    
    // ============= SCHEDULED OPTIMIZATION =============
    
    startScheduledOptimization() {
        console.log(`[DatabaseOptimizer] Starting scheduled optimization (interval: ${this.config.optimizeInterval}ms)`);
        
        setInterval(async () => {
            await this.performOptimization();
        }, this.config.optimizeInterval);
    }
    
    async performOptimization() {
        try {
            console.log('[DatabaseOptimizer] Starting scheduled optimization...');
            
            // Build indexes
            await this.buildIndexes();
            
            // Optimize storage
            await this.optimizeStorage();
            
            console.log('[DatabaseOptimizer] Scheduled optimization completed');
            
        } catch (error) {
            console.error('[DatabaseOptimizer] Error in scheduled optimization:', error.message);
        }
    }
    
    // ============= STATISTICS AND MONITORING =============
    
    getStatistics() {
        return {
            ...this.stats,
            indexes: {
                profiles: this.indexes.profiles.size,
                patterns: this.indexes.patterns.size,
                users: this.indexes.users.size,
                timestamps: this.indexes.timestamps.size
            },
            config: this.config
        };
    }
    
    getIndexInfo() {
        return {
            profiles: Array.from(this.indexes.profiles.entries()).map(([id, info]) => ({
                id,
                size: info.size,
                lastModified: info.lastModified,
                directory: info.directory
            })),
            patterns: this.indexes.patterns.size,
            users: this.indexes.users.size,
            timestamps: this.indexes.timestamps.size
        };
    }
    
    async getQueryPerformance() {
        const startTime = Date.now();
        
        // Test pattern query
        await this.findProfilesByPattern('test', 5);
        
        // Test date range query
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        await this.findProfilesByDateRange(weekAgo, now);
        
        // Test size query
        await this.findProfilesBySize(0, 10000);
        
        const duration = Date.now() - startTime;
        
        return {
            totalQueries: 3,
            duration,
            averageQueryTime: duration / 3,
            indexesActive: this.indexes.profiles.size > 0
        };
    }
}

module.exports = DatabaseOptimizer;



