class SimplifiedMemoryManager {
    constructor(profileSystem, options = {}) {
        this.profileSystem = profileSystem;
        this.options = options;
        this.cleanupInterval = null;
        this.stats = {
            cleanups: 0,
            lastCleanup: null
        };
    }

    startScheduledCleanup() {
        if (this.cleanupInterval) return;
        this.cleanupInterval = setInterval(() => {
            this.forceCleanup();
        }, this.options.cleanupInterval || 15 * 60 * 1000);
    }

    stopScheduledCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    getHealthStatus() {
        return {
            status: 'ok',
            cleanupsRun: this.stats.cleanups,
            lastCleanup: this.stats.lastCleanup
        };
    }

    getStatistics() {
        return {
            trustLinks: this.profileSystem?.trustLinks?.length || 0,
            options: this.options
        };
    }

    async getTrustLinkAnalytics() {
        return this.profileSystem?.trustLinks || [];
    }

    async forceCleanup() {
        this.stats.cleanups += 1;
        this.stats.lastCleanup = new Date().toISOString();
        return { success: true, timestamp: this.stats.lastCleanup };
    }
}

module.exports = SimplifiedMemoryManager;
