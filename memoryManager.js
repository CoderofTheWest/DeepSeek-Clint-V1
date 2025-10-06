/**
 * Memory Manager - Phase 6.2: Memory Management System
 * 
 * Handles:
 * - Foreign echo cleanup
 * - Profile compression
 * - Memory usage monitoring
 * - Resource optimization
 * - Background maintenance
 */

const fs = require('fs').promises;
const path = require('path');

class MemoryManager {
    constructor(profileManager, options = {}) {
        this.profileManager = profileManager;
        
        // Configuration
        this.config = {
            maxForeignEchoes: options.maxForeignEchoes || 50,
            maxProfileAge: options.maxProfileAge || 24 * 60 * 60 * 1000, // 1 day (reduced from 7 days)
            maxPatternsPerProfile: options.maxPatternsPerProfile || 100,
            compressionThreshold: options.compressionThreshold || 5, // patterns (lowered for foreign profiles)
            cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
            memoryWarningThreshold: options.memoryWarningThreshold || 100 * 1024 * 1024, // 100MB
            ...options
        };
        
        // Statistics
        this.stats = {
            foreignEchoesCleaned: 0,
            profilesCompressed: 0,
            patternsPruned: 0,
            memoryReclaimed: 0,
            lastCleanup: null,
            cleanupCount: 0
        };
        
        // Memory monitoring
        this.memoryHistory = [];
        this.maxHistorySize = 100;
        
        console.log('[MemoryManager] Initialized with memory management');
    }
    
    // ============= FOREIGN ECHO CLEANUP =============
    
    async cleanupForeignEchoes() {
        try {
            const foreignEchoes = this.profileManager.foreignRAM;
            const now = Date.now();
            let cleaned = 0;
            
            console.log(`[MemoryManager] Starting foreign echo cleanup. Current count: ${foreignEchoes.size}`);
            
            // Get foreign echoes sorted by last seen (oldest first)
            const sortedEchoes = Array.from(foreignEchoes.entries())
                .map(([id, profile]) => ({
                    id,
                    profile,
                    lastSeen: new Date(profile.lastSeen).getTime()
                }))
                .sort((a, b) => a.lastSeen - b.lastSeen);
            
            // Remove old or excess foreign echoes
            for (const { id, profile, lastSeen } of sortedEchoes) {
                const age = now - lastSeen;
                const shouldRemove = 
                    age > this.config.maxProfileAge || 
                    foreignEchoes.size > this.config.maxForeignEchoes;
                
                if (shouldRemove) {
                    foreignEchoes.delete(id);
                    cleaned++;
                    this.stats.foreignEchoesCleaned++;
                    
                    console.log(`[MemoryManager] Removed foreign echo: ${id} (age: ${Math.round(age / 1000 / 60)} minutes)`);
                }
            }
            
            if (cleaned > 0) {
                console.log(`[MemoryManager] Foreign echo cleanup complete: ${cleaned} removed`);
            }
            
            return cleaned;
        } catch (error) {
            console.error('[MemoryManager] Error in foreign echo cleanup:', error.message);
            return 0;
        }
    }
    
    // ============= PROFILE COMPRESSION =============
    
    async compressProfiles() {
        try {
            const allProfiles = await this.profileManager.getAllProfiles();
            let compressed = 0;
            
            console.log(`[MemoryManager] Starting profile compression. Profiles to check: ${allProfiles.length}`);
            
            for (const profile of allProfiles) {
                const originalSize = JSON.stringify(profile).length;
                let needsCompression = false;
                
                // Special handling for API profile - aggressive cleanup
                if (profile.id === 'api') {
                    // API profile should be cleaned up more aggressively
                    if (profile.patterns && profile.patterns.length > 0) {
                        // Keep only the last 3 patterns for API profile
                        profile.patterns = profile.patterns.slice(-3);
                        needsCompression = true;
                    }
                } else {
                    // Check if profile needs compression
                    if (profile.patterns && profile.patterns.length > this.config.compressionThreshold) {
                        needsCompression = true;
                    }
                }
                
                if (needsCompression) {
                    await this.compressProfile(profile);
                    const newSize = JSON.stringify(profile).length;
                    const saved = originalSize - newSize;
                    
                    compressed++;
                    this.stats.profilesCompressed++;
                    this.stats.memoryReclaimed += saved;
                    
                    console.log(`[MemoryManager] Compressed profile ${profile.id}: saved ${saved} bytes`);
                }
            }
            
            if (compressed > 0) {
                console.log(`[MemoryManager] Profile compression complete: ${compressed} profiles compressed`);
            }
            
            return compressed;
        } catch (error) {
            console.error('[MemoryManager] Error in profile compression:', error.message);
            return 0;
        }
    }
    
    async compressProfile(profile) {
        try {
            // Keep only recent patterns
            if (profile.patterns && profile.patterns.length > this.config.maxPatternsPerProfile) {
                // Sort by date (newest first) and keep only the most recent
                profile.patterns.sort((a, b) => new Date(b.event) - new Date(a.event));
                const removed = profile.patterns.splice(this.config.maxPatternsPerProfile);
                this.stats.patternsPruned += removed.length;
                
                console.log(`[MemoryManager] Pruned ${removed.length} old patterns from ${profile.id}`);
            }
            
            // Compress tone baseline (keep only high-frequency words)
            if (profile.toneBaseline) {
                const baselineEntries = Object.entries(profile.toneBaseline);
                if (baselineEntries.length > 50) {
                    // Keep only words with frequency > 0.1
                    profile.toneBaseline = Object.fromEntries(
                        baselineEntries.filter(([word, freq]) => freq > 0.1)
                    );
                }
            }
            
            // Remove old metadata
            if (profile.metadata) {
                delete profile.metadata.creationTime;
                delete profile.metadata.version;
            }
            
            // Update last seen
            profile.lastSeen = new Date().toISOString();
            
            return true;
        } catch (error) {
            console.error(`[MemoryManager] Error compressing profile ${profile.id}:`, error.message);
            return false;
        }
    }
    
    // ============= MEMORY MONITORING =============
    
    getMemoryUsage() {
        try {
            const usage = process.memoryUsage();
            
            const memoryInfo = {
                rss: Math.round(usage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
                external: Math.round(usage.external / 1024 / 1024), // MB
                timestamp: new Date().toISOString()
            };
            
            // Add to history
            this.memoryHistory.push(memoryInfo);
            if (this.memoryHistory.length > this.maxHistorySize) {
                this.memoryHistory.shift();
            }
            
            return memoryInfo;
        } catch (error) {
            console.error('[MemoryManager] Error getting memory usage:', error.message);
            return null;
        }
    }
    
    getMemoryTrends() {
        if (this.memoryHistory.length < 2) {
            return { trend: 'stable', change: 0 };
        }
        
        const recent = this.memoryHistory.slice(-5);
        const older = this.memoryHistory.slice(-10, -5);
        
        if (recent.length === 0 || older.length === 0) {
            return { trend: 'stable', change: 0 };
        }
        
        const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;
        
        const change = recentAvg - olderAvg;
        const trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
        
        return { trend, change: Math.round(change) };
    }
    
    checkMemoryWarning() {
        const usage = this.getMemoryUsage();
        if (!usage) return false;
        
        const warningThreshold = this.config.memoryWarningThreshold / 1024 / 1024; // Convert to MB
        
        if (usage.heapUsed > warningThreshold) {
            console.warn(`[MemoryManager] ⚠️  Memory warning: ${usage.heapUsed}MB used (threshold: ${warningThreshold}MB)`);
            return true;
        }
        
        return false;
    }
    
    // ============= BACKGROUND CLEANUP =============
    
    async performMaintenance() {
        try {
            console.log('[MemoryManager] Starting background maintenance...');
            const startTime = Date.now();
            
            // Check memory warning
            const memoryWarning = this.checkMemoryWarning();
            
            // Perform cleanup operations
            const foreignCleaned = await this.cleanupForeignEchoes();
            const profilesCompressed = await this.compressProfiles();
            
            // Update statistics
            this.stats.lastCleanup = new Date().toISOString();
            this.stats.cleanupCount++;
            
            const duration = Date.now() - startTime;
            const memoryUsage = this.getMemoryUsage();
            
            console.log(`[MemoryManager] Maintenance complete in ${duration}ms`);
            console.log(`[MemoryManager] Results: ${foreignCleaned} foreign echoes cleaned, ${profilesCompressed} profiles compressed`);
            console.log(`[MemoryManager] Memory: ${memoryUsage.heapUsed}MB heap used`);
            
            if (memoryWarning) {
                console.warn('[MemoryManager] ⚠️  Memory usage is high - consider increasing cleanup frequency');
            }
            
            return {
                duration,
                foreignCleaned,
                profilesCompressed,
                memoryUsage,
                memoryWarning
            };
            
        } catch (error) {
            console.error('[MemoryManager] Error in background maintenance:', error.message);
            return null;
        }
    }
    
    // ============= SCHEDULED CLEANUP =============
    
    startScheduledCleanup() {
        console.log(`[MemoryManager] Starting scheduled cleanup (interval: ${this.config.cleanupInterval}ms)`);
        
        setInterval(async () => {
            await this.performMaintenance();
        }, this.config.cleanupInterval);
    }
    
    // ============= MANUAL OPERATIONS =============
    
    async forceCleanup() {
        console.log('[MemoryManager] Force cleanup requested...');
        return await this.performMaintenance();
    }
    
    async forceGarbageCollection() {
        if (global.gc) {
            console.log('[MemoryManager] Running garbage collection...');
            global.gc();
            
            const beforeGC = this.getMemoryUsage();
            setTimeout(() => {
                const afterGC = this.getMemoryUsage();
                if (beforeGC && afterGC) {
                    const saved = beforeGC.heapUsed - afterGC.heapUsed;
                    console.log(`[MemoryManager] Garbage collection complete: saved ${saved}MB`);
                }
            }, 100);
            
            return true;
        } else {
            console.log('[MemoryManager] Garbage collection not available (run with --expose-gc)');
            return false;
        }
    }
    
    // ============= STATISTICS AND REPORTING =============
    
    getStatistics() {
        const memoryUsage = this.getMemoryUsage();
        const trends = this.getMemoryTrends();
        
        return {
            ...this.stats,
            currentMemory: memoryUsage,
            memoryTrends: trends,
            config: this.config,
            memoryHistory: this.memoryHistory.slice(-10) // Last 10 entries
        };
    }
    
    getHealthStatus() {
        const memoryUsage = this.getMemoryUsage();
        const trends = this.getMemoryTrends();
        const warningThreshold = this.config.memoryWarningThreshold / 1024 / 1024;
        
        const issues = [];
        const warnings = [];
        
        // Check memory usage
        if (memoryUsage && memoryUsage.heapUsed > warningThreshold) {
            issues.push(`High memory usage: ${memoryUsage.heapUsed}MB`);
        }
        
        // Check memory trend
        if (trends.trend === 'increasing' && trends.change > 10) {
            warnings.push(`Memory usage increasing: +${trends.change}MB`);
        }
        
        // Check foreign echoes
        const foreignCount = this.profileManager.foreignRAM.size;
        if (foreignCount > this.config.maxForeignEchoes * 0.8) {
            warnings.push(`High foreign echo count: ${foreignCount}`);
        }
        
        // Check cleanup frequency
        if (this.stats.lastCleanup) {
            const lastCleanup = new Date(this.stats.lastCleanup);
            const timeSinceCleanup = Date.now() - lastCleanup.getTime();
            if (timeSinceCleanup > this.config.cleanupInterval * 2) {
                warnings.push('Cleanup overdue');
            }
        }
        
        return {
            status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy',
            issues,
            warnings,
            memoryUsage,
            foreignEchoCount: foreignCount,
            lastCleanup: this.stats.lastCleanup
        };
    }
}

module.exports = MemoryManager;



