/**
 * User Context Isolation - Simplified Two-Profile System
 * 
 * Manages user-specific context for:
 * - chris: Permanent, persistent context
 * - visitor: Temporary, shared context
 */

class UserContextIsolation {
    constructor() {
        this.userContexts = new Map(); // profileId -> context data
        this.maxMessagesPerUser = 50; // Keep last 50 messages per user
        
        console.log('[UserContextIsolation] Initialized with simplified two-profile system');
    }

    /**
     * Add message to user-specific context
     */
    addMessage(profileId, message, sender) {
        if (!this.userContexts.has(profileId)) {
            this.userContexts.set(profileId, {
                messages: [],
                profileData: null,
                lastUpdate: Date.now()
            });
        }
        
        const context = this.userContexts.get(profileId);
        context.messages.push({
            text: message,
            sender: sender,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last N messages
        if (context.messages.length > this.maxMessagesPerUser) {
            context.messages = context.messages.slice(-this.maxMessagesPerUser);
        }
        
        context.lastUpdate = Date.now();
        
        console.log(`[UserContextIsolation] Added message to ${profileId} context (${context.messages.length} total)`);
    }

    /**
     * Get recent messages for a user
     */
    getRecentMessages(profileId, count = 10) {
        if (!this.userContexts.has(profileId)) {
            return [];
        }
        
        const context = this.userContexts.get(profileId);
        return context.messages.slice(-count);
    }

    /**
     * Update profile data for a user
     */
    updateProfileData(profileId, profileData) {
        if (!this.userContexts.has(profileId)) {
            this.userContexts.set(profileId, {
                messages: [],
                profileData: null,
                lastUpdate: Date.now()
            });
        }
        
        const context = this.userContexts.get(profileId);
        context.profileData = profileData;
        context.lastUpdate = Date.now();
        
        console.log(`[UserContextIsolation] Updated profile data for ${profileId}`);
    }

    /**
     * Get comprehensive context for a user
     */
    getComprehensiveContext(profileId) {
        if (!this.userContexts.has(profileId)) {
            return {
                messages: [],
                profileData: null,
                lastUpdate: null
            };
        }
        
        return this.userContexts.get(profileId);
    }

    /**
     * Clear user context
     */
    clearUserContext(profileId) {
        if (this.userContexts.has(profileId)) {
            this.userContexts.delete(profileId);
            console.log(`[UserContextIsolation] Cleared context for ${profileId}`);
        }
    }

    /**
     * Get all user IDs
     */
    getAllUserIds() {
        return Array.from(this.userContexts.keys());
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const stats = {
            totalUsers: this.userContexts.size,
            users: {}
        };
        
        for (const [profileId, context] of this.userContexts.entries()) {
            stats.users[profileId] = {
                messageCount: context.messages.length,
                lastUpdate: new Date(context.lastUpdate).toISOString(),
                hasProfileData: !!context.profileData
            };
        }
        
        return stats;
    }

    /**
     * Clean up old visitor contexts (called periodically)
     */
    cleanupOldContexts() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        let cleanedCount = 0;
        
        for (const [profileId, context] of this.userContexts.entries()) {
            // Only clean up visitor contexts, never chris
            if (profileId === 'visitor' && 
                now - context.lastUpdate > maxAge) {
                this.userContexts.delete(profileId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[UserContextIsolation] Cleaned up ${cleanedCount} old visitor contexts`);
        }
    }
}

module.exports = UserContextIsolation;
