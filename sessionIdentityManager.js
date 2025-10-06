/**
 * Session Identity Manager - Simplified Two-Profile System
 * 
 * Manages session identity for:
 * - chris: Permanent, persistent profile
 * - visitor: Temporary, rotating profile (1-hour timeout)
 */

class SessionIdentityManager {
    constructor() {
        this.sessions = new Map(); // deviceId -> session data
        this.visitorTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
        this.visitorCleanupTimer = null;
        
        // Start visitor cleanup timer
        this.startVisitorCleanup();
        
        console.log('[SessionIdentityManager] Initialized with simplified two-profile system');
    }

    /**
     * Detect if user is correcting their identity
     */
    detectCorrection(message, deviceId) {
        const lowerMessage = message.toLowerCase();
        
        // Check for explicit corrections
        if (lowerMessage.includes('i am chris') || lowerMessage.includes('i\'m chris')) {
            return { type: 'correction', identity: 'chris' };
        }
        
        if (lowerMessage.includes('i am not chris') || lowerMessage.includes('i\'m not chris')) {
            return { type: 'negative' };
        }
        
        // Check for name claims
        const nameMatch = message.match(/i am ([a-zA-Z]+)/i);
        if (nameMatch && nameMatch[1].toLowerCase() === 'chris') {
            return { type: 'correction', identity: 'chris' };
        }
        
        return null;
    }

    /**
     * Get current session context for a device
     */
    getSessionContext(deviceId) {
        if (!this.sessions.has(deviceId)) {
            // Create new session
            this.sessions.set(deviceId, {
                identity: 'visitor',
                locked: false,
                confidence: 0.3,
                lastActivity: Date.now(),
                createdAt: Date.now()
            });
        }
        
        const session = this.sessions.get(deviceId);
        
        // Update last activity
        session.lastActivity = Date.now();
        
        return session;
    }

    /**
     * Update identity for a device
     */
    updateIdentity(deviceId, profile, confidence, reason) {
        if (!this.sessions.has(deviceId)) {
            this.sessions.set(deviceId, {
                identity: profile,
                locked: false,
                confidence: confidence,
                lastActivity: Date.now(),
                createdAt: Date.now()
            });
        } else {
            const session = this.sessions.get(deviceId);
            session.identity = profile;
            session.confidence = confidence;
            session.lastActivity = Date.now();
            
            // Lock session if high confidence
            if (confidence >= 0.8) {
                session.locked = true;
            }
        }
        
        console.log(`[SessionIdentityManager] Updated ${deviceId} -> ${profile} (confidence: ${confidence}, reason: ${reason})`);
    }

    /**
     * Get all active sessions
     */
    getAllSessions() {
        const now = Date.now();
        const activeSessions = [];
        
        for (const [deviceId, session] of this.sessions.entries()) {
            // Check if session is still active (within 1 hour)
            if (now - session.lastActivity < this.visitorTimeout) {
                activeSessions.push({
                    deviceId,
                    identity: session.identity,
                    locked: session.locked,
                    confidence: session.confidence,
                    lastActivity: new Date(session.lastActivity).toISOString(),
                    createdAt: new Date(session.createdAt).toISOString()
                });
            }
        }
        
        return activeSessions;
    }

    /**
     * Reset a specific session
     */
    resetSession(deviceId) {
        if (this.sessions.has(deviceId)) {
            this.sessions.delete(deviceId);
            console.log(`[SessionIdentityManager] Reset session for ${deviceId}`);
        }
    }

    /**
     * Force unlock a session
     */
    forceUnlock(deviceId) {
        if (this.sessions.has(deviceId)) {
            const session = this.sessions.get(deviceId);
            session.locked = false;
            console.log(`[SessionIdentityManager] Force unlocked session for ${deviceId}`);
        }
    }

    /**
     * Start visitor cleanup timer
     */
    startVisitorCleanup() {
        // Clean up every 10 minutes
        this.visitorCleanupTimer = setInterval(() => {
            this.cleanupInactiveSessions();
        }, 10 * 60 * 1000);
    }

    /**
     * Clean up inactive visitor sessions
     */
    cleanupInactiveSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [deviceId, session] of this.sessions.entries()) {
            // Only clean up visitor sessions, never chris
            if (session.identity === 'visitor' && 
                now - session.lastActivity > this.visitorTimeout) {
                this.sessions.delete(deviceId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[SessionIdentityManager] Cleaned up ${cleanedCount} inactive visitor sessions`);
        }
    }

    /**
     * Stop cleanup timer (for graceful shutdown)
     */
    stopCleanup() {
        if (this.visitorCleanupTimer) {
            clearInterval(this.visitorCleanupTimer);
            this.visitorCleanupTimer = null;
        }
    }
}

module.exports = SessionIdentityManager;
