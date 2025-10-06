/**
 * Contextual Awareness Manager - Simplified Two-Profile System
 * 
 * Manages contextual awareness for:
 * - chris: Full relationship tracking
 * - visitor: Basic presence tracking
 */

class ContextualAwarenessManager {
    constructor() {
        this.userSessions = new Map(); // profileId -> session data
        this.relationships = new Map(); // profileId -> relationships
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        console.log('[ContextualAwarenessManager] Initialized with simplified two-profile system');
    }

    /**
     * Track user presence
     */
    trackUserPresence(profileId, context) {
        if (!this.userSessions.has(profileId)) {
            this.userSessions.set(profileId, {
                lastSeen: Date.now(),
                interactionCount: 0,
                relationships: [],
                context: context
            });
        }
        
        const session = this.userSessions.get(profileId);
        session.lastSeen = Date.now();
        session.interactionCount++;
        session.context = context;
        
        console.log(`[ContextualAwareness] Tracked user ${profileId}: ${session.interactionCount} interactions`);
    }

    /**
     * Detect relationships from message content
     */
    detectRelationships(profileId, message) {
        const relationships = [];
        const lowerMessage = message.toLowerCase();
        
        // Basic relationship detection
        if (lowerMessage.includes('mom') || lowerMessage.includes('mother')) {
            relationships.push('family');
        }
        if (lowerMessage.includes('friend') || lowerMessage.includes('buddy')) {
            relationships.push('friend');
        }
        if (lowerMessage.includes('work') || lowerMessage.includes('colleague')) {
            relationships.push('work');
        }
        if (lowerMessage.includes('chris') || lowerMessage.includes('creator')) {
            relationships.push('creator');
        }
        
        // Store relationships
        if (relationships.length > 0) {
            if (!this.relationships.has(profileId)) {
                this.relationships.set(profileId, []);
            }
            
            const existingRelationships = this.relationships.get(profileId);
            for (const rel of relationships) {
                if (!existingRelationships.includes(rel)) {
                    existingRelationships.push(rel);
                }
            }
        }
        
        return relationships;
    }

    /**
     * Generate relationship prompt
     */
    generateRelationshipPrompt(profileId) {
        if (!this.relationships.has(profileId)) {
            return '';
        }
        
        const relationships = this.relationships.get(profileId);
        if (relationships.length === 0) {
            return '';
        }
        
        let prompt = '\n[RELATIONSHIP CONTEXT]\n';
        prompt += `User relationship: ${relationships.join(', ')}\n`;
        prompt += '[END RELATIONSHIP CONTEXT]\n';
        
        return prompt;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const stats = {
            totalUsers: this.userSessions.size,
            users: {}
        };
        
        for (const [profileId, session] of this.userSessions.entries()) {
            stats.users[profileId] = {
                interactionCount: session.interactionCount,
                lastSeen: new Date(session.lastSeen).toISOString(),
                relationships: this.relationships.get(profileId) || []
            };
        }
        
        return stats;
    }

    /**
     * Get comprehensive context
     */
    getComprehensiveContext() {
        return {
            userSessions: Object.fromEntries(this.userSessions),
            relationships: Object.fromEntries(this.relationships)
        };
    }

    /**
     * Clean up old sessions
     */
    cleanupOldSessions(maxAgeHours = 24) {
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [profileId, session] of this.userSessions.entries()) {
            // Only clean up visitor sessions, never chris
            if (profileId === 'visitor' && 
                now - session.lastSeen > maxAge) {
                this.userSessions.delete(profileId);
                this.relationships.delete(profileId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[ContextualAwarenessManager] Cleaned up ${cleanedCount} old visitor sessions`);
        }
        
        return cleanedCount;
    }
}

module.exports = ContextualAwarenessManager;
