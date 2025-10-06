// reflectionEmitter.js - Generates post-response reflection JSONs

const fs = require('fs').promises;
const path = require('path');

class ReflectionEmitter {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.reflectionsPath = path.join(storagePath, 'reflections');
        this.cooldownTracker = new Map(); // Prevent reflection spam
    }

    async initialize() {
        await fs.mkdir(this.reflectionsPath, { recursive: true });
        console.log('[ReflectionEmitter] Initialized with storage path:', this.reflectionsPath);
    }

    /**
     * Generate reflection JSON after Clint's response
     * CRITICAL: This runs AFTER response generation, not before
     * It observes what happened, doesn't prescribe what should happen next
     */
    async emitReflection(context) {
        const {
            userMessage,
            clintResponse,
            selfAssessment,
            arcState,
            diagnosticMetrics,
            emergenceAnalysis,
            alinealismAnalysis,
            accountabilityTriggered,
            accountabilityIssues,
            userGoals,
            historicalReflections,
            profileId
        } = context;

        // Cooldown check - don't reflect on every single turn
        const lastReflection = this.cooldownTracker.get(profileId);
        if (lastReflection && (Date.now() - lastReflection) < 300000) { // 5 min cooldown
            console.log('[ReflectionEmitter] Cooldown active, skipping reflection');
            return null;
        }

        // Only emit reflection when something significant happened
        const shouldReflect = this.shouldEmitReflection(context);
        if (!shouldReflect) {
            return null;
        }

        const reflection = {
            timestamp: new Date().toISOString(),
            profile: profileId,
            
            // What tension was present (observation, not prescription)
            tension_observed: this.extractTension(context),
            
            // What stance Clint took (describes behavior, doesn't command it)
            stance_taken: this.extractStance(clintResponse, accountabilityTriggered),
            
            // What pattern was avoided or fell into (self-awareness)
            pattern_note: this.extractPattern(context),
            
            // What to carry forward (minimal - just the core thread)
            carry_forward: this.extractCarryForward(context),
            
            // Quality metrics (for accountability layer next turn)
            quality_snapshot: {
                assessment: selfAssessment?.quality || 'unknown',
                progress: selfAssessment?.progress || 0,
                bii: diagnosticMetrics?.braidingIntegrityIndex || null,
                lri: diagnosticMetrics?.loopRiskIndex || 0,
                vi: diagnosticMetrics?.vulnerabilityIndex || 0,
                emergence_score: emergenceAnalysis?.score || 0,
                emergence_level: emergenceAnalysis?.level || 'unknown',
                emergence_indicators: emergenceAnalysis?.indicators || {}
            }
        };

        // Save to storage
        const filename = `reflection_${Date.now()}_${profileId}.json`;
        await fs.writeFile(
            path.join(this.reflectionsPath, filename),
            JSON.stringify(reflection, null, 2),
            'utf8'
        );

        // Update cooldown
        this.cooldownTracker.set(profileId, Date.now());

        console.log('[ReflectionEmitter] Reflection emitted:', filename);
        return reflection;
    }

    /**
     * Decide if this turn warrants a reflection
     * Too frequent = recursive loop
     * Too rare = no continuity
     */
    shouldEmitReflection(context) {
        // Always reflect when accountability was triggered
        if (context.accountabilityTriggered) {
            return true;
        }

        // Reflect when quality is poor
        if (context.selfAssessment?.quality === 'poor') {
            return true;
        }

        // Reflect when diagnostic metrics show issues
        if (context.diagnosticMetrics) {
            const { loopRiskIndex, vulnerabilityIndex, braidingIntegrityIndex } = context.diagnosticMetrics;
            if (loopRiskIndex >= 3 || vulnerabilityIndex >= 3 || braidingIntegrityIndex < 0.7) {
                return true;
            }
        }

        // Reflect when Alinealism shows friction
        if (context.alinealismAnalysis?.alignment === 'friction') {
            return true;
        }

        // Reflect when arc transitions
        if (context.arcState?.turns_in_arc === 1) {
            return true;
        }

        // TEST: Force reflection for testing (remove this after verification)
        if (context.userMessage && context.userMessage.toLowerCase().includes('difficult')) {
            console.log('[ReflectionEmitter] TEST: Forcing reflection due to "difficult" keyword');
            return true;
        }

        // Otherwise, skip (prevents reflection spam)
        return false;
    }

    extractTension(context) {
        const tensions = [];

        // From Alinealism
        if (context.alinealismAnalysis?.alignment === 'friction') {
            tensions.push(context.alinealismAnalysis.guidance.guidance);
        }

        // From accountability
        if (context.accountabilityIssues && context.accountabilityIssues.length > 0) {
            tensions.push(...context.accountabilityIssues.slice(0, 2)); // Max 2
        }

        // From arc state
        if (context.arcState?.arc === 'Deepening' && context.arcState.tension_count === 0) {
            tensions.push('Arc claims depth but shows no tension');
        }

        return tensions.length > 0 ? tensions.join(' | ') : 'No significant tension';
    }

    extractStance(clintResponse, accountabilityTriggered) {
        // Describe what Clint actually did, not what he should do
        
        if (accountabilityTriggered) {
            return 'Addressed accountability audit directly';
        }

        // Simple heuristics based on response structure
        if (/\?$/.test(clintResponse)) {
            return 'Held space with question';
        }

        if (/but|however|though/.test(clintResponse.toLowerCase())) {
            return 'Preserved contradiction';
        }

        if (clintResponse.length < 200) {
            return 'Responded minimally';
        }

        return 'Synthesized across layers';
    }

    extractPattern(context) {
        const patterns = [];

        // From self-assessment
        if (context.selfAssessment?.quality === 'poor') {
            patterns.push('Quality flagged as poor');
        }

        // From diagnostic metrics
        if (context.diagnosticMetrics?.entropyMetrics?.speculationEntropy > 2) {
            patterns.push('High speculation count');
        }

        // From historical reflections (if they warned about something)
        if (context.historicalReflections?.includes('performance')) {
            patterns.push('Performance warning from history');
        }

        return patterns.length > 0 ? patterns.join('; ') : 'No patterns flagged';
    }

    extractCarryForward(context) {
        // MINIMAL - only the essential thread to maintain continuity
        // This is NOT a command, it's a note about what matters

        const carry = [];

        // If user stated a goal
        if (context.userGoals && context.userGoals.length > 0) {
            carry.push(`User goal: ${context.userGoals[0]}`);
        }

        // If there's unresolved Alinealism friction
        if (context.alinealismAnalysis?.alignment === 'friction') {
            carry.push('Alinealism friction unresolved');
        }

        // If accountability issues persist
        if (context.diagnosticMetrics?.loopRiskIndex >= 3) {
            carry.push('Loop risk elevated');
        }

        return carry.length > 0 ? carry.join(' | ') : 'Continuity stable';
    }

    /**
     * Retrieve recent reflections for context injection
     * Used by accountability layer to see patterns over time
     */
    async getRecentReflections(profileId, limit = 5) {
        try {
            const files = await fs.readdir(this.reflectionsPath);
            const profileFiles = files.filter(f => f.includes(profileId) && f.endsWith('.json'));
            
            // Sort by timestamp (newest first)
            profileFiles.sort().reverse();
            
            const reflections = [];
            for (const file of profileFiles.slice(0, limit)) {
                const content = await fs.readFile(
                    path.join(this.reflectionsPath, file),
                    'utf8'
                );
                reflections.push(JSON.parse(content));
            }
            
            return reflections;
        } catch (error) {
            console.error('[ReflectionEmitter] Error retrieving reflections:', error.message);
            return [];
        }
    }

    /**
     * Cleanup old reflections (prevent disk bloat)
     */
    async cleanupOldReflections(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
        try {
            const files = await fs.readdir(this.reflectionsPath);
            const now = Date.now();
            
            for (const file of files) {
                const filepath = path.join(this.reflectionsPath, file);
                const stats = await fs.stat(filepath);
                
                if (now - stats.mtimeMs > maxAge) {
                    await fs.unlink(filepath);
                    console.log('[ReflectionEmitter] Cleaned up old reflection:', file);
                }
            }
        } catch (error) {
            console.error('[ReflectionEmitter] Cleanup error:', error.message);
        }
    }
}

module.exports = ReflectionEmitter;
