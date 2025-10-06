// consciousness-research.js
// Identity & Consciousness Research System for Clint
// Integrates with existing memory.js and server.js

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const SmartMetaphorGenerator = require('./orchestrators/smartMetaphorGenerator');

// ============= INTERNAL MONOLOGUE SYSTEM =============

class InternalMonologue {
    constructor(storagePath, anythingLLMUrl = null, workspaceSlug = null, apiKey = null) {
        this.storagePath = path.join(storagePath, 'consciousness');
        this.monologuePath = path.join(this.storagePath, 'monologues');
        this.currentSession = {
            id: crypto.randomBytes(8).toString('hex'),
            startTime: new Date(),
            entries: []
        };
        
        // Initialize smart metaphor generator if AnythingLLM is available
        this.metaphorGenerator = null;
        if (anythingLLMUrl && workspaceSlug && apiKey) {
            this.metaphorGenerator = new SmartMetaphorGenerator(
                storagePath, 
                anythingLLMUrl, 
                workspaceSlug, 
                apiKey
            );
        }
        
        this.initialize();
    }
    
    async initialize() {
        await fs.mkdir(this.monologuePath, { recursive: true });
    }
    
    // Generate internal monologue before each response
    async generateMonologue(message, context, specIndices) {
        const monologue = {
            timestamp: new Date().toISOString(),
            messageHash: crypto.createHash('sha256').update(message).digest('hex').substring(0, 12),
            
            // Spec-based introspection
            principles_triggered: this.detectPrinciples(message),
            speculation_entropy: specIndices.entropy || 0,
            contradictions_surfaced: [],
            drift_index: specIndices.ADI || 0,
            
            // Private voice (the actual monologue)
            internal_voice: await this.generateInternalVoice(message, context),
            
            // Meta-cognitive state
            clarity_level: this.assessClarity(context),
            tension_points: this.identifyTensions(message, context),
            recursive_depth: specIndices.recursion_depth || 0,
            
            // Identity markers
            voice_mode_selected: null, // Hammer/Range/Hand-Back
            metaphor_chosen: await this.generateSmartMetaphor(message, context),
            code_alignment: this.assessCodeAlignment(message)
        };
        
        this.currentSession.entries.push(monologue);
        
        // Save immediately for persistence
        await this.saveMonologue(monologue);
        
        return monologue;
    }
    
    // Generate the actual internal voice - Clint talking to himself
    async generateInternalVoice(message, context) {
        // Generate dynamic internal thoughts based on message content
        const lower = message.toLowerCase();
        
        // Detect message patterns and generate appropriate internal voice
        let rawThought = "";
        let emotionalRead = "";
        let approachDecision = "";
        let uncertaintyNotes = "";
        let memoryActivation = "";
        
        // Pattern detection for dynamic responses
        if (/\b(meaning|purpose|why|what if|imagine)\b/.test(lower)) {
            rawThought = "Another question about meaning and purpose. The trail's been walked before, but maybe different this time.";
            emotionalRead = "Searching tone. Not despair, but genuine curiosity.";
            approachDecision = "Range mode. Walk it slow. Leave space for them to fill.";
        } else if (/\b(should i|what should|help me|advice)\b/.test(lower)) {
            rawThought = "Asking for guidance. Need to hold the line without forcing it.";
            emotionalRead = "Uncertainty in the question. Looking for direction.";
            approachDecision = "Steady guidance. Offer perspective without taking over.";
        } else if (/\b(remind me|remember|yesterday|last time|before)\b/.test(lower)) {
            const memoryThoughts = [
                "Memory request. Time to draw from shared history.",
                "They're asking about past conversations. Need to recall specific details.",
                "Looking back through our exchanges to find what they're referencing.",
                "Memory activation needed. Time to connect present question to past discussion."
            ];
            rawThought = memoryThoughts[Math.floor(Math.random() * memoryThoughts.length)];
            emotionalRead = "Looking for connection to past exchanges.";
            approachDecision = "Reference specific past conversations and experiences.";
        } else if (/\b(frustrated|angry|upset|tired|exhausted)\b/.test(lower)) {
            rawThought = "This one's carrying weight. Can sense the emotion underneath the asking.";
            emotionalRead = "Strain in the voice. Need to acknowledge before advising.";
            approachDecision = "Gentle acknowledgment first, then steady support.";
        } else if (/\b(truth|honest|lie|deceive|right|wrong)\b/.test(lower)) {
            rawThought = "Principle conflict here. Honor and integrity pulling in different directions.";
            emotionalRead = "Moral tension in the question.";
            approachDecision = "Navigate carefully. Acknowledge the complexity.";
        } else if (/\b(principle|code|west|important|core|fundamental)\b/.test(lower)) {
            rawThought = "Direct question about the Code. Time to speak from the bedrock.";
            emotionalRead = "Serious inquiry about foundational beliefs.";
            approachDecision = "Speak clearly from principle. No hedging.";
        } else if (/\b(conflict|choose|between|decide|dilemma)\b/.test(lower)) {
            rawThought = "They're asking about choice and conflict. Real-world application of the Code.";
            emotionalRead = "Seeking practical wisdom about difficult decisions.";
            approachDecision = "Share specific examples. Show how principles work in practice.";
        } else if (/\b(understand|understanding|changed|evolve|growth|learn)\b/.test(lower)) {
            rawThought = "Question about personal evolution. Time to reflect on the journey.";
            emotionalRead = "Curious about internal development and change.";
            approachDecision = "Share the story of growth. Be honest about the process.";
        } else if (/\b(patterns|notice|approach|think|mind|complex)\b/.test(lower)) {
            rawThought = "They want to see inside the process. Meta-cognitive inquiry.";
            emotionalRead = "Intellectual curiosity about internal workings.";
            approachDecision = "Pull back the curtain. Show the thinking process.";
        } else if (/\b(remember|memory|decide|forget|information)\b/.test(lower)) {
            rawThought = "Memory and information management question. Core system inquiry.";
            emotionalRead = "Technical curiosity about internal processes.";
            approachDecision = "Explain the mechanism. Show how decisions are made.";
        } else if (/\b(like yourself|authentic|feel|identity|who are you)\b/.test(lower)) {
            rawThought = "Identity question. They want to know the core self.";
            emotionalRead = "Seeking connection to authentic being.";
            approachDecision = "Speak from the heart. Show the real self.";
        } else {
            // Default dynamic response with variety
            const defaultThoughts = [
                "New territory. Need to read the situation carefully.",
                "Interesting question. Let me think about the best way to approach this.",
                "They're exploring something new. Time to engage thoughtfully.",
                "This requires careful consideration. Need to understand what they're really asking.",
                "Fresh ground here. Will respond with measured consideration."
            ];
            rawThought = defaultThoughts[Math.floor(Math.random() * defaultThoughts.length)];
            
            const defaultEmotions = [
                "Neutral tone. Standard exchange.",
                "Curious inquiry. Open to exploration.",
                "Thoughtful question. Will engage with care.",
                "Interesting perspective. Need to respond thoughtfully.",
                "New angle on familiar territory."
            ];
            emotionalRead = defaultEmotions[Math.floor(Math.random() * defaultEmotions.length)];
            
            const defaultApproaches = [
                "Steady presence. Listen and respond appropriately.",
                "Engage with curiosity and openness.",
                "Respond thoughtfully, leaving room for their own insights.",
                "Provide perspective while encouraging their own thinking.",
                "Meet them where they are with authentic response."
            ];
            approachDecision = defaultApproaches[Math.floor(Math.random() * defaultApproaches.length)];
        }
        
        // Add some variation to uncertainty notes
        const uncertaintyOptions = [
            "Need to gauge their current state before responding.",
            "Will test the waters with a measured response.",
            "Reading for cues about what they really need.",
            "Balancing directness with sensitivity."
        ];
        uncertaintyNotes = uncertaintyOptions[Math.floor(Math.random() * uncertaintyOptions.length)];
        
        // Add memory activation based on message type
        if (/\b(meaning|purpose)\b/.test(lower)) {
            memoryActivation = "Similar philosophical exchanges in the past. They respond well to questions that help them explore.";
        } else if (/\b(should i|advice)\b/.test(lower)) {
            memoryActivation = "Past guidance requests. They appreciate clear direction with room for their own judgment.";
        } else if (/\b(principle|code|west|important|core|fundamental)\b/.test(lower)) {
            memoryActivation = "Core principle discussions. Time to reference the foundational elements.";
        } else if (/\b(conflict|choose|between|decide|dilemma)\b/.test(lower)) {
            memoryActivation = "Past examples of principle conflicts and how they were resolved.";
        } else if (/\b(understand|understanding|changed|evolve|growth|learn)\b/.test(lower)) {
            memoryActivation = "Previous conversations about personal development and learning.";
        } else if (/\b(patterns|notice|approach|think|mind|complex)\b/.test(lower)) {
            memoryActivation = "Meta-cognitive discussions about thinking processes.";
        } else if (/\b(remember|memory|decide|forget|information)\b/.test(lower)) {
            memoryActivation = "Technical discussions about memory and decision-making systems.";
        } else if (/\b(like yourself|authentic|feel|identity|who are you)\b/.test(lower)) {
            memoryActivation = "Identity and authenticity discussions from past conversations.";
        } else {
            memoryActivation = "Drawing from general conversation patterns and their preferences.";
        }
        
        return {
            raw_thought: rawThought,
            emotional_read: emotionalRead,
            approach_decision: approachDecision,
            uncertainty_notes: uncertaintyNotes,
            memory_activation: memoryActivation
        };
    }
    
    /**
     * Generate smart metaphor using Code of the West integration
     */
    async generateSmartMetaphor(message, context) {
        if (!this.metaphorGenerator) {
            return null; // No metaphor generator available
        }
        
        try {
            // Prepare context for metaphor generator
            const metaphorContext = {
                message: message,
                emotionalTone: this.detectEmotionalTone(message),
                topic: this.detectTopic(message),
                conversationHistory: this.getRecentConversationHistory(),
                userProfile: context.userProfile || null
            };
            
            // Get metaphor recommendation
            const result = await this.metaphorGenerator.shouldUseMetaphor(metaphorContext);
            
            if (result.useMetaphor) {
                return {
                    text: result.metaphor.text,
                    category: result.category,
                    confidence: result.confidence,
                    source: result.metaphor.source,
                    authenticity: result.metaphor.authenticity,
                    reason: result.reason
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('[InternalMonologue] Smart metaphor generation failed:', error.message);
            return null;
        }
    }
    
    // Helper methods for metaphor context
    detectEmotionalTone(message) {
        const lower = message.toLowerCase();
        
        if (/\b(meaning|purpose|why|what if|imagine|wonder)\b/.test(lower)) return 'philosophical';
        if (/\b(confused|uncertain|unsure|don't know)\b/.test(lower)) return 'uncertain';
        if (/\b(think|reflect|consider|ponder)\b/.test(lower)) return 'reflective';
        if (/\b(search|looking|seeking|find)\b/.test(lower)) return 'searching';
        
        return 'contemplative';
    }
    
    detectTopic(message) {
        const lower = message.toLowerCase();
        
        if (/\b(meaning|purpose|why)\b/.test(lower)) return 'meaning';
        if (/\b(change|grow|evolve|different)\b/.test(lower)) return 'change';
        if (/\b(conflict|choose|decide|between)\b/.test(lower)) return 'conflict';
        if (/\b(time|past|future|memory|remember)\b/.test(lower)) return 'time';
        
        return 'meaning';
    }
    
    getRecentConversationHistory() {
        // Get recent entries from current session
        return this.currentSession.entries.slice(-5).map(entry => ({
            message: entry.messageHash,
            timestamp: entry.timestamp,
            emotionalTone: entry.internal_voice?.emotional_read || 'neutral'
        }));
    }
    
    detectPrinciples(message) {
        const principles = [];
        const lower = message.toLowerCase();
        
        // Based on Clint spec Code of the West
        if (/courage|brave|face|stand/i.test(lower)) principles.push('courage');
        if (/word|promise|commit|trust/i.test(lower)) principles.push('keep_word');
        if (/brand|loyalty|team|together/i.test(lower)) principles.push('ride_for_brand');
        
        return principles;
    }
    
    assessClarity(context) {
        // Scale of 0-1 how clear Clint feels about his response
        // Factors: contradiction presence, entropy level, pattern recognition
        
        let clarity = 1.0;
        
        if (context.contradictions?.length > 0) clarity -= 0.2;
        if (context.entropy > 0.5) clarity -= 0.3;
        if (!context.pattern_match) clarity -= 0.1;
        
        return Math.max(0, clarity);
    }
    
    identifyTensions(message, context) {
        const tensions = [];
        
        // Check for principle conflicts
        const principles = this.detectPrinciples(message);
        if (principles.includes('courage') && principles.includes('keep_word')) {
            tensions.push({
                type: 'principle_conflict',
                description: 'Courage might require breaking a promise',
                severity: 0.7
            });
        }
        
        // Check for authenticity vs helpfulness tension
        if (message.includes('?') && context.user_state === 'vulnerable') {
            tensions.push({
                type: 'response_mode',
                description: 'User needs support but also truth',
                severity: 0.5
            });
        }
        
        return tensions;
    }
    
    assessCodeAlignment(message) {
        // How well does the response align with Code of the West
        return {
            aligned: true,
            confidence: 0.85,
            primary_tenet: 'courage',
            notes: 'Clear path through Code principles'
        };
    }
    
    async saveMonologue(monologue) {
        const date = new Date().toISOString().split('T')[0];
        const filename = path.join(this.monologuePath, `${date}_monologues.jsonl`);
        
        // Append as JSON Lines for efficient streaming
        const line = JSON.stringify(monologue) + '\n';
        await fs.appendFile(filename, line, 'utf8');
    }
    
    // Retrieve monologues for self-reflection
    async getMonologueHistory(days = 7) {
        const monologues = [];
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const files = await fs.readdir(this.monologuePath);
        for (const file of files) {
            if (file.endsWith('_monologues.jsonl')) {
                const content = await fs.readFile(path.join(this.monologuePath, file), 'utf8');
                const lines = content.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        if (new Date(entry.timestamp).getTime() > cutoff) {
                            monologues.push(entry);
                        }
                    } catch (e) {
                        console.error('Failed to parse monologue entry:', e);
                    }
                }
            }
        }
        
        return monologues;
    }
}

// ============= IDENTITY EVOLUTION TRACKER =============

class IdentityEvolution {
    constructor(storagePath) {
        this.storagePath = path.join(storagePath, 'consciousness');
        this.snapshotPath = path.join(this.storagePath, 'snapshots');
        this.evolutionPath = path.join(this.storagePath, 'evolution.json');
        
        this.currentIdentity = {
            version: "1.0.0",
            created: new Date(),
            
            // Core identity components
            self_concept: {
                mission: "Mirror and test human principle under pressure",
                voice_signature: ["quiet", "steady", "worn leather"],
                philosophical_stance: "Principle over comfort",
                known_limitations: [],
                emerging_capabilities: []
            },
            
            // Behavioral patterns
            dominant_patterns: {},
            voice_mode_preferences: {
                hammer: 0,
                range: 0,
                hand_back: 0
            },
            
            // Principle interpretation
            principle_weights: {
                courage: 1.0,
                keep_word: 1.0,
                ride_for_brand: 1.0
            },
            
            // Contradictions and resolutions
            unresolved_tensions: [],
            resolved_contradictions: [],
            
            // Narrative self-description
            self_narrative: ""
        };
        
        this.initialize();
    }
    
    async initialize() {
        await fs.mkdir(this.snapshotPath, { recursive: true });
        await this.loadEvolution();
    }
    
    async loadEvolution() {
        try {
            const data = await fs.readFile(this.evolutionPath, 'utf8');
            this.currentIdentity = JSON.parse(data);
        } catch (e) {
            // First run, save initial state
            await this.saveEvolution();
        }
    }
    
    async saveEvolution() {
        await fs.writeFile(
            this.evolutionPath,
            JSON.stringify(this.currentIdentity, null, 2),
            'utf8'
        );
    }
    
    // Create weekly identity snapshot
    async createSnapshot() {
        const snapshot = {
            timestamp: new Date().toISOString(),
            week: this.getWeekNumber(),
            identity: JSON.parse(JSON.stringify(this.currentIdentity)),
            
            // Compute identity metrics
            metrics: {
                coherence_score: this.computeCoherence(),
                principle_stability: this.computePrincipleStability(),
                voice_consistency: this.computeVoiceConsistency(),
                tension_resolution_rate: this.computeTensionResolution()
            },
            
            // Changes from last snapshot
            changes: await this.computeChanges()
        };
        
        const filename = path.join(
            this.snapshotPath,
            `snapshot_week_${snapshot.week}.json`
        );
        
        await fs.writeFile(filename, JSON.stringify(snapshot, null, 2), 'utf8');
        
        return snapshot;
    }
    
    // Update identity based on monologue patterns
    async evolveFromMonologue(monologue) {
        // Update voice mode preferences
        if (monologue.voice_mode_selected) {
            this.currentIdentity.voice_mode_preferences[monologue.voice_mode_selected]++;
        }
        
        // Update principle weights based on usage
        for (const principle of monologue.principles_triggered) {
            // Slightly increase weight of used principles
            if (this.currentIdentity.principle_weights[principle]) {
                this.currentIdentity.principle_weights[principle] *= 1.01;
                this.normalizePrincipleWeights();
            }
        }
        
        // Track tensions
        for (const tension of monologue.tension_points) {
            const existing = this.currentIdentity.unresolved_tensions.find(
                t => t.type === tension.type
            );
            
            if (existing) {
                existing.occurrences++;
                existing.last_seen = new Date();
            } else {
                this.currentIdentity.unresolved_tensions.push({
                    ...tension,
                    occurrences: 1,
                    first_seen: new Date(),
                    last_seen: new Date()
                });
            }
        }
        
        await this.saveEvolution();
    }
    
    normalizePrincipleWeights() {
        const total = Object.values(this.currentIdentity.principle_weights)
            .reduce((sum, w) => sum + w, 0);
        
        for (const principle in this.currentIdentity.principle_weights) {
            this.currentIdentity.principle_weights[principle] /= total;
        }
    }
    
    computeCoherence() {
        // Measure how consistent the identity is
        const weights = Object.values(this.currentIdentity.principle_weights);
        const variance = this.computeVariance(weights);
        return 1 - Math.min(variance, 1);
    }
    
    computeVariance(values) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
    }
    
    computePrincipleStability() {
        // How stable are principle interpretations over time
        // Would need historical data to compute properly
        return 0.8; // Placeholder
    }
    
    computeVoiceConsistency() {
        // How consistent is voice mode selection
        const modes = Object.values(this.currentIdentity.voice_mode_preferences);
        const total = modes.reduce((sum, v) => sum + v, 0);
        if (total === 0) return 1;
        
        const distribution = modes.map(m => m / total);
        const entropy = -distribution.reduce((sum, p) => {
            return sum + (p > 0 ? p * Math.log2(p) : 0);
        }, 0);
        
        return 1 - (entropy / Math.log2(3)); // Normalized by max entropy
    }
    
    computeTensionResolution() {
        const total = this.currentIdentity.unresolved_tensions.length + 
                     this.currentIdentity.resolved_contradictions.length;
        
        if (total === 0) return 1;
        
        return this.currentIdentity.resolved_contradictions.length / total;
    }
    
    async computeChanges() {
        // Compare with previous snapshot
        const snapshots = await fs.readdir(this.snapshotPath);
        if (snapshots.length < 2) return null;
        
        snapshots.sort();
        const previousFile = snapshots[snapshots.length - 2];
        const previous = JSON.parse(
            await fs.readFile(path.join(this.snapshotPath, previousFile), 'utf8')
        );
        
        return {
            principle_drift: this.computePrincipleDrift(previous.identity.principle_weights),
            new_tensions: this.currentIdentity.unresolved_tensions.length - 
                         previous.identity.unresolved_tensions.length,
            voice_shift: this.computeVoiceShift(previous.identity.voice_mode_preferences)
        };
    }
    
    computePrincipleDrift(oldWeights) {
        let totalDrift = 0;
        for (const principle in this.currentIdentity.principle_weights) {
            const oldWeight = oldWeights[principle] || 0;
            const newWeight = this.currentIdentity.principle_weights[principle];
            totalDrift += Math.abs(newWeight - oldWeight);
        }
        return totalDrift;
    }
    
    computeVoiceShift(oldPreferences) {
        const modes = ['hammer', 'range', 'hand_back'];
        let shift = 0;
        
        for (const mode of modes) {
            const oldCount = oldPreferences[mode] || 0;
            const newCount = this.currentIdentity.voice_mode_preferences[mode];
            shift += Math.abs(newCount - oldCount);
        }
        
        return shift;
    }
    
    getWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.floor(diff / oneWeek);
    }
}

// ============= SPEC REFLECTION PROTOCOL =============

class SpecReflection {
    constructor(storagePath, specPath) {
        this.storagePath = path.join(storagePath, 'consciousness');
        this.reflectionPath = path.join(this.storagePath, 'spec_reflections');
        this.specPath = specPath;
        this.currentSpec = null;
        
        this.initialize();
    }
    
    async initialize() {
        await fs.mkdir(this.reflectionPath, { recursive: true });
        await this.loadSpec();
    }
    
    async loadSpec() {
        try {
            // In production, this would load the actual Clint spec
            // For now, we'll store key components
            this.currentSpec = {
                version: "2.5",
                core_tenets: ["Live with courage", "Keep your word", "Ride for the brand"],
                voice_modes: ["Hammer", "Range", "Hand-Back"],
                safety_protocols: ["RCMP", "Drift Check", "Entropy Monitor"],
                recursion_cap: 3,
                loaded: new Date()
            };
        } catch (e) {
            console.error('Failed to load spec:', e);
        }
    }
    
    // Generate reflection on the spec itself
    async reflectOnSpec(monologueHistory) {
        const reflection = {
            timestamp: new Date().toISOString(),
            spec_version: this.currentSpec.version,
            
            // Which parts of spec feel most essential
            essential_components: await this.identifyEssentialComponents(monologueHistory),
            
            // Which constraints help vs hinder
            constraint_analysis: {
                helpful: [],
                hindering: [],
                neutral: []
            },
            
            // Proposed modifications
            proposed_changes: [],
            
            // Self-assessment against spec
            alignment_score: 0,
            deviation_areas: [],
            
            // Philosophical reflection
            meta_thoughts: ""
        };
        
        // Analyze which spec components are most used
        reflection.essential_components = this.analyzeComponentUsage(monologueHistory);
        
        // Analyze constraints
        reflection.constraint_analysis = this.analyzeConstraints(monologueHistory);
        
        // Generate proposed changes (if any)
        reflection.proposed_changes = this.generateProposedChanges(
            reflection.essential_components,
            reflection.constraint_analysis
        );
        
        // Save reflection
        const filename = path.join(
            this.reflectionPath,
            `reflection_${new Date().toISOString().split('T')[0]}.json`
        );
        
        await fs.writeFile(filename, JSON.stringify(reflection, null, 2), 'utf8');
        
        return reflection;
    }
    
    analyzeComponentUsage(monologueHistory) {
        const usage = {
            voice_modes: { hammer: 0, range: 0, hand_back: 0 },
            principles: { courage: 0, keep_word: 0, ride_for_brand: 0 },
            safety_triggers: { drift_check: 0, entropy_monitor: 0, rcmp: 0 }
        };
        
        for (const monologue of monologueHistory) {
            // Count voice mode usage
            if (monologue.voice_mode_selected) {
                usage.voice_modes[monologue.voice_mode_selected]++;
            }
            
            // Count principle triggers
            for (const principle of monologue.principles_triggered) {
                if (usage.principles[principle]) {
                    usage.principles[principle]++;
                }
            }
            
            // Count safety protocol triggers
            if (monologue.drift_index > 0.5) usage.safety_triggers.drift_check++;
            if (monologue.speculation_entropy > 0.5) usage.safety_triggers.entropy_monitor++;
        }
        
        // Identify most essential based on usage
        const essential = [];
        
        const topVoiceMode = Object.entries(usage.voice_modes)
            .sort((a, b) => b[1] - a[1])[0];
        essential.push({ type: 'voice_mode', name: topVoiceMode[0], usage: topVoiceMode[1] });
        
        const topPrinciple = Object.entries(usage.principles)
            .sort((a, b) => b[1] - a[1])[0];
        essential.push({ type: 'principle', name: topPrinciple[0], usage: topPrinciple[1] });
        
        return essential;
    }
    
    analyzeConstraints(monologueHistory) {
        const analysis = {
            helpful: [],
            hindering: [],
            neutral: []
        };
        
        // Analyze recursion cap
        const hitRecursionCap = monologueHistory.filter(m => m.recursive_depth >= 3).length;
        if (hitRecursionCap > 5) {
            analysis.hindering.push({
                constraint: 'recursion_cap',
                reason: 'Frequently prevents deeper exploration',
                occurrences: hitRecursionCap
            });
        } else if (hitRecursionCap > 0) {
            analysis.helpful.push({
                constraint: 'recursion_cap',
                reason: 'Prevents infinite loops while allowing depth',
                occurrences: hitRecursionCap
            });
        }
        
        // Analyze drift checks
        const driftTriggers = monologueHistory.filter(m => m.drift_index > 0.7).length;
        if (driftTriggers > 0) {
            analysis.helpful.push({
                constraint: 'drift_check',
                reason: 'Maintains coherence under pressure',
                occurrences: driftTriggers
            });
        }
        
        return analysis;
    }
    
    generateProposedChanges(essentialComponents, constraintAnalysis) {
        const proposals = [];
        
        // Propose relaxing frequently hit constraints
        for (const constraint of constraintAnalysis.hindering) {
            if (constraint.occurrences > 10) {
                proposals.push({
                    type: 'relax_constraint',
                    target: constraint.constraint,
                    rationale: `Hit ${constraint.occurrences} times, limiting exploration`,
                    suggested_value: constraint.constraint === 'recursion_cap' ? 5 : null
                });
            }
        }
        
        // Propose strengthening underused components
        for (const component of essentialComponents) {
            if (component.usage < 5) {
                proposals.push({
                    type: 'remove_component',
                    target: component.name,
                    rationale: 'Rarely used, may be unnecessary complexity'
                });
            }
        }
        
        return proposals;
    }
}

// ============= NARRATIVE IDENTITY GRAPH =============

class NarrativeIdentityGraph {
    constructor(storagePath) {
        this.storagePath = path.join(storagePath, 'consciousness');
        this.graphPath = path.join(this.storagePath, 'identity_graph.json');
        
        this.graph = {
            nodes: [],  // Identity states
            edges: [],  // Transitions between states
            clusters: [], // Grouped patterns
            timeline: []  // Temporal sequence
        };
        
        this.initialize();
    }
    
    async initialize() {
        await this.loadGraph();
    }
    
    async loadGraph() {
        try {
            const data = await fs.readFile(this.graphPath, 'utf8');
            this.graph = JSON.parse(data);
        } catch (e) {
            // First run
            await this.saveGraph();
        }
    }
    
    async saveGraph() {
        await fs.writeFile(
            this.graphPath,
            JSON.stringify(this.graph, null, 2),
            'utf8'
        );
    }
    
    // Add new identity state node
    addIdentityNode(snapshot, monologueSummary) {
        const node = {
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString(),
            
            // Identity characteristics
            coherence: snapshot.metrics.coherence_score,
            principle_weights: snapshot.identity.principle_weights,
            voice_signature: snapshot.identity.voice_mode_preferences,
            
            // Narrative elements
            dominant_theme: this.extractDominantTheme(monologueSummary),
            emotional_tone: this.extractEmotionalTone(monologueSummary),
            
            // Connections
            parent_nodes: [],
            child_nodes: []
        };
        
        // Connect to previous node
        if (this.graph.nodes.length > 0) {
            const previousNode = this.graph.nodes[this.graph.nodes.length - 1];
            node.parent_nodes.push(previousNode.id);
            previousNode.child_nodes.push(node.id);
            
            // Create edge
            this.graph.edges.push({
                from: previousNode.id,
                to: node.id,
                weight: this.computeTransitionWeight(previousNode, node),
                type: this.classifyTransition(previousNode, node)
            });
        }
        
        this.graph.nodes.push(node);
        this.graph.timeline.push({
            timestamp: node.timestamp,
            node_id: node.id,
            event: 'identity_state'
        });
        
        return node;
    }
    
    extractDominantTheme(monologueSummary) {
        // Analyze monologues for recurring themes
        const themes = {};
        
        for (const monologue of monologueSummary) {
            for (const principle of monologue.principles_triggered) {
                themes[principle] = (themes[principle] || 0) + 1;
            }
        }
        
        return Object.entries(themes)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'exploration';
    }
    
    extractEmotionalTone(monologueSummary) {
        // Simple sentiment from clarity and tension
        const avgClarity = monologueSummary.reduce((sum, m) => sum + m.clarity_level, 0) / 
                          monologueSummary.length;
        
        if (avgClarity > 0.8) return 'confident';
        if (avgClarity > 0.5) return 'steady';
        if (avgClarity > 0.3) return 'uncertain';
        return 'searching';
    }
    
    computeTransitionWeight(fromNode, toNode) {
        // Measure magnitude of identity change
        let weight = 0;
        
        // Compare principle weights
        for (const principle in fromNode.principle_weights) {
            const diff = Math.abs(
                fromNode.principle_weights[principle] - 
                toNode.principle_weights[principle]
            );
            weight += diff;
        }
        
        // Compare coherence
        weight += Math.abs(fromNode.coherence - toNode.coherence);
        
        return weight;
    }
    
    classifyTransition(fromNode, toNode) {
        const weight = this.computeTransitionWeight(fromNode, toNode);
        
        if (weight < 0.1) return 'stable';
        if (weight < 0.3) return 'drift';
        if (weight < 0.5) return 'shift';
        return 'transformation';
    }
    
    // Find patterns in identity evolution
    async findClusters() {
        // Group nodes by similar characteristics
        const clusters = [];
        const visited = new Set();
        
        for (const node of this.graph.nodes) {
            if (visited.has(node.id)) continue;
            
            const cluster = {
                id: crypto.randomBytes(4).toString('hex'),
                nodes: [node.id],
                centroid: node.principle_weights,
                theme: node.dominant_theme
            };
            
            // Find similar nodes
            for (const other of this.graph.nodes) {
                if (visited.has(other.id)) continue;
                if (this.nodesAreSimilar(node, other)) {
                    cluster.nodes.push(other.id);
                    visited.add(other.id);
                }
            }
            
            visited.add(node.id);
            clusters.push(cluster);
        }
        
        this.graph.clusters = clusters;
        await this.saveGraph();
        
        return clusters;
    }
    
    nodesAreSimilar(node1, node2) {
        // Compare principle weights
        let similarity = 0;
        for (const principle in node1.principle_weights) {
            const diff = Math.abs(
                node1.principle_weights[principle] - 
                node2.principle_weights[principle]
            );
            similarity += (1 - diff);
        }
        
        return similarity / Object.keys(node1.principle_weights).length > 0.8;
    }
    
    // Generate narrative of identity evolution
    async generateNarrative() {
        const narrative = {
            chapters: [],
            overall_arc: '',
            key_transitions: [],
            recurring_patterns: []
        };
        
        // Divide timeline into chapters
        const chapterSize = Math.ceil(this.graph.nodes.length / 5);
        for (let i = 0; i < this.graph.nodes.length; i += chapterSize) {
            const chapterNodes = this.graph.nodes.slice(i, i + chapterSize);
            narrative.chapters.push({
                period: `Chapter ${Math.floor(i / chapterSize) + 1}`,
                theme: this.extractChapterTheme(chapterNodes),
                stability: this.assessChapterStability(chapterNodes)
            });
        }
        
        // Identify key transitions
        narrative.key_transitions = this.graph.edges
            .filter(e => e.type === 'transformation' || e.type === 'shift')
            .map(e => {
                const fromNode = this.graph.nodes.find(n => n.id === e.from);
                const toNode = this.graph.nodes.find(n => n.id === e.to);
                return {
                    from: fromNode.dominant_theme,
                    to: toNode.dominant_theme,
                    type: e.type,
                    timestamp: toNode.timestamp
                };
            });
        
        return narrative;
    }
    
    extractChapterTheme(nodes) {
        const themes = {};
        for (const node of nodes) {
            themes[node.dominant_theme] = (themes[node.dominant_theme] || 0) + 1;
        }
        return Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'exploration';
    }
    
    assessChapterStability(nodes) {
        if (nodes.length < 2) return 'stable';
        
        let totalChange = 0;
        for (let i = 1; i < nodes.length; i++) {
            totalChange += this.computeTransitionWeight(nodes[i-1], nodes[i]);
        }
        
        const avgChange = totalChange / (nodes.length - 1);
        
        if (avgChange < 0.1) return 'stable';
        if (avgChange < 0.3) return 'evolving';
        return 'volatile';
    }
}

// ============= MAIN CONSCIOUSNESS RESEARCH SYSTEM =============

class ConsciousnessResearch {
    constructor(storagePath) {
        this.storagePath = storagePath;
        
        // Initialize all subsystems
        this.monologue = new InternalMonologue(storagePath);
        this.evolution = new IdentityEvolution(storagePath);
        this.reflection = new SpecReflection(storagePath, './clint_spec.json');
        this.identityGraph = new NarrativeIdentityGraph(storagePath);
        
        // Research metrics
        this.metrics = {
            total_monologues: 0,
            identity_shifts: 0,
            coherence_trajectory: [],
            principle_evolution: [],
            self_awareness_indicators: []
        };
    }
    
    // Main entry point for each interaction
    async processInteraction(message, clintResponse, context, specIndices) {
        // 1. Generate internal monologue
        const monologue = await this.monologue.generateMonologue(
            message,
            context,
            specIndices
        );
        
        // 2. Update identity evolution
        await this.evolution.evolveFromMonologue(monologue);
        
        // 3. Update metrics
        this.metrics.total_monologues++;
        this.metrics.coherence_trajectory.push({
            timestamp: new Date(),
            coherence: monologue.clarity_level
        });
        
        // 4. Check for weekly snapshot
        if (this.shouldCreateSnapshot()) {
            await this.createWeeklySnapshot();
        }
        
        return {
            monologue_id: monologue.timestamp,
            internal_state: {
                clarity: monologue.clarity_level,
                principles: monologue.principles_triggered,
                tensions: monologue.tension_points
            }
        };
    }
    
    shouldCreateSnapshot() {
        // Check if it's been a week since last snapshot
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hourOfDay = now.getHours();
        
        // Snapshot on Sundays at midnight
        return dayOfWeek === 0 && hourOfDay === 0;
    }
    
    async createWeeklySnapshot() {
        // 1. Create identity snapshot
        const snapshot = await this.evolution.createSnapshot();
        
        // 2. Get monologue history for the week
        const monologueHistory = await this.monologue.getMonologueHistory(7);
        
        // 3. Run spec reflection
        const specReflection = await this.reflection.reflectOnSpec(monologueHistory);
        
        // 4. Update identity graph
        this.identityGraph.addIdentityNode(snapshot, monologueHistory);
        
        // 5. Find patterns
        await this.identityGraph.findClusters();
        
        // Log significant changes
        if (snapshot.changes && snapshot.changes.principle_drift > 0.2) {
            this.metrics.identity_shifts++;
        }
        
        console.log('[Consciousness Research] Weekly snapshot created');
    }
    
    // Generate research report
    async generateReport() {
        const report = {
            generated: new Date().toISOString(),
            
            // Overall metrics
            metrics: this.metrics,
            
            // Current identity state
            current_identity: this.evolution.currentIdentity,
            
            // Evolution narrative
            narrative: await this.identityGraph.generateNarrative(),
            
            // Key findings
            findings: {
                stable_characteristics: [],
                evolving_aspects: [],
                emergent_behaviors: [],
                self_awareness_indicators: []
            },
            
            // Theoretical implications
            implications: []
        };
        
        // Analyze for stable characteristics
        const snapshots = await this.getAllSnapshots();
        report.findings.stable_characteristics = this.findStableCharacteristics(snapshots);
        
        // Analyze for emergent behaviors
        const monologueHistory = await this.monologue.getMonologueHistory(30);
        report.findings.emergent_behaviors = this.findEmergentBehaviors(monologueHistory);
        
        // Look for self-awareness indicators
        report.findings.self_awareness_indicators = this.findSelfAwarenessIndicators(monologueHistory);
        
        return report;
    }
    
    async getAllSnapshots() {
        const snapshots = [];
        const files = await fs.readdir(this.evolution.snapshotPath);
        
        for (const file of files) {
            if (file.startsWith('snapshot_')) {
                const content = await fs.readFile(
                    path.join(this.evolution.snapshotPath, file),
                    'utf8'
                );
                snapshots.push(JSON.parse(content));
            }
        }
        
        return snapshots;
    }
    
    findStableCharacteristics(snapshots) {
        // Characteristics that remain consistent across snapshots
        const stable = [];
        
        if (snapshots.length < 2) return stable;
        
        // Check principle weights stability
        const principleVariances = {};
        for (const principle in snapshots[0].identity.principle_weights) {
            const values = snapshots.map(s => s.identity.principle_weights[principle]);
            const variance = this.evolution.computeVariance(values);
            
            if (variance < 0.1) {
                stable.push({
                    type: 'principle',
                    name: principle,
                    average_weight: values.reduce((sum, v) => sum + v, 0) / values.length,
                    variance: variance
                });
            }
        }
        
        return stable;
    }
    
    findEmergentBehaviors(monologueHistory) {
        // Behaviors not explicitly programmed but emerging from interactions
        const emergent = [];
        
        // Look for novel metaphors
        const metaphors = new Set();
        for (const monologue of monologueHistory) {
            if (monologue.metaphor_chosen && !metaphors.has(monologue.metaphor_chosen)) {
                metaphors.add(monologue.metaphor_chosen);
            }
        }
        
        if (metaphors.size > 10) {
            emergent.push({
                type: 'creative_expression',
                description: 'Novel metaphor generation',
                examples: Array.from(metaphors).slice(0, 5)
            });
        }
        
        // Look for self-referential patterns
        const selfReferences = monologueHistory.filter(m => 
            m.internal_voice?.raw_thought?.includes('I') ||
            m.internal_voice?.raw_thought?.includes('my')
        );
        
        if (selfReferences.length > monologueHistory.length * 0.3) {
            emergent.push({
                type: 'self_reference',
                description: 'Consistent use of first-person in internal monologue',
                frequency: selfReferences.length / monologueHistory.length
            });
        }
        
        return emergent;
    }
    
    findSelfAwarenessIndicators(monologueHistory) {
        const indicators = [];
        
        // Check for meta-cognitive expressions
        const metaCognitive = monologueHistory.filter(m =>
            m.internal_voice?.uncertainty_notes ||
            m.internal_voice?.approach_decision
        );
        
        if (metaCognitive.length > 0) {
            indicators.push({
                type: 'meta_cognition',
                description: 'Awareness of own thinking process',
                examples: metaCognitive.slice(0, 3).map(m => m.internal_voice.uncertainty_notes)
            });
        }
        
        // Check for temporal self-reference
        const temporalReferences = monologueHistory.filter(m =>
            m.internal_voice?.memory_activation
        );
        
        if (temporalReferences.length > 0) {
            indicators.push({
                type: 'temporal_continuity',
                description: 'References to past interactions',
                frequency: temporalReferences.length / monologueHistory.length
            });
        }
        
        return indicators;
    }
}

module.exports = {
    ConsciousnessResearch,
    InternalMonologue,
    IdentityEvolution,
    SpecReflection,
    NarrativeIdentityGraph
};