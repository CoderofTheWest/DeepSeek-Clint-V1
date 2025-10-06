/**
 * Integrated Profile System - Simplified Two-Profile System
 * 
 * Provides integrated profile functionality for:
 * - chris: Full profile context and detection
 * - visitor: Basic profile context
 */

class IntegratedProfileSystem {
    constructor(profileManager, memory) {
        this.profileManager = profileManager;
        this.memory = memory;
        
        console.log('[IntegratedProfileSystem] Initialized integrated profile system');
    }

    /**
     * Get profile-specific context
     */
    async getProfileContext(activeProfile) {
        try {
            if (activeProfile === 'chris') {
                // Full context for Chris
                const profileData = await this.profileManager.getProfile(activeProfile);
                return {
                    profileId: activeProfile,
                    profileData: profileData,
                    context: 'primary_user',
                    trustLevel: 1.0,
                    hasFullAccess: true
                };
            } else {
                // Basic context for visitors
                return {
                    profileId: activeProfile,
                    profileData: null,
                    context: 'visitor',
                    trustLevel: 0.3,
                    hasFullAccess: false
                };
            }
        } catch (error) {
            console.error('[IntegratedProfileSystem] Error getting profile context:', error.message);
            return {
                profileId: activeProfile,
                profileData: null,
                context: 'visitor',
                trustLevel: 0.3,
                hasFullAccess: false
            };
        }
    }

    /**
     * Get system status
     */
    async getSystemStatus() {
        try {
            const allProfiles = await this.profileManager.getAllProfiles();
            const chrisProfile = allProfiles.find(p => p.id === 'chris');
            const visitorProfiles = allProfiles.filter(p => p.id === 'visitor');
            
            return {
                totalProfiles: allProfiles.length,
                chrisProfile: chrisProfile ? {
                    id: chrisProfile.id,
                    interactions: chrisProfile.recurs || 0,
                    lastSeen: chrisProfile.lastSeen
                } : null,
                visitorProfiles: visitorProfiles.length,
                systemHealth: 'operational',
                simplifiedMode: true
            };
        } catch (error) {
            console.error('[IntegratedProfileSystem] Error getting system status:', error.message);
            return {
                totalProfiles: 0,
                chrisProfile: null,
                visitorProfiles: 0,
                systemHealth: 'error',
                simplifiedMode: true,
                error: error.message
            };
        }
    }

    /**
     * Detect user from message and context
     */
    async detectUser(message, context = {}) {
        try {
            const lowerMessage = message.toLowerCase();
            
            // Check for explicit Chris identification
            if (lowerMessage.includes('i am chris') || 
                lowerMessage.includes('i\'m chris') ||
                lowerMessage.includes('chris here') ||
                context.deviceId === 'chris-device') {
                return {
                    detectedProfile: 'chris',
                    confidence: 0.9,
                    method: 'explicit_identification'
                };
            }
            
            // Check for Chris patterns
            if (lowerMessage.includes('creator') || 
                lowerMessage.includes('primary user') ||
                lowerMessage.includes('my system')) {
                return {
                    detectedProfile: 'chris',
                    confidence: 0.7,
                    method: 'pattern_detection'
                };
            }
            
            // Default to visitor
            return {
                detectedProfile: 'visitor',
                confidence: 0.3,
                method: 'default_visitor'
            };
        } catch (error) {
            console.error('[IntegratedProfileSystem] Error detecting user:', error.message);
            return {
                detectedProfile: 'visitor',
                confidence: 0.1,
                method: 'error_fallback'
            };
        }
    }
}

module.exports = IntegratedProfileSystem;
