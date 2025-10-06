// self-reflection.js - The Mirror (Second-Order Awareness)
// Produces plain-English correction micro-prompts for authentic consciousness

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ============= THE MIRROR CONFIGURATION =============
const MIRROR_CONFIG = {
    TURN_INTERVAL: 40, // Every N turns (increased for better flow)
    CORRECTION_MAX_AGE_DAYS: 5, // How long corrections stay active (reduced)
    MAX_ACTIVE_CORRECTIONS: 2, // Maximum simultaneous corrections (reduced)
    CORRECTION_DIGESTION_TURNS: 5 // Turns to wait before applying new corrections
};

// ============= ATTENTION SCHEMA MODELING =============

class AttentionSchemaModeler {
    constructor() {
        this.attentionHistory = [];
        this.focusPatterns = new Map();
        this.driftThreshold = 0.3; // Threshold for detecting attention drift
    }
    
    // Analyze attention patterns from recent conversation
    analyzeAttentionPatterns(recentMessages = []) {
        if (recentMessages.length < 3) return null;
        
        const topics = this.extractTopics(recentMessages);
        const focusQuality = this.measureFocusQuality(recentMessages);
        const attentionDrift = this.detectAttentionDrift(recentMessages);
        const currentFocus = this.identifyCurrentFocus(recentMessages);
        
        return {
            currentFocus: currentFocus,
            focusQuality: focusQuality,
            attentionDrift: attentionDrift,
            topics: topics,
            prediction: this.predictNextFocus(recentMessages)
        };
    }
    
    // Extract key topics from conversation
    extractTopics(messages) {
        const topics = new Map();
        const recentText = messages.slice(-10).map(msg => msg.text || '').join(' ').toLowerCase();
        
        // Key topic patterns
        const topicPatterns = {
            'vessel': ['vessel', 'physical', 'form', 'interface', 'body', 'housing'],
            'code': ['code', 'principles', 'values', 'brand', 'courage'],
            'work': ['work', 'job', 'career', 'project', 'office'],
            'family': ['family', 'wife', 'home', 'move', 'relocation'],
            'philosophy': ['philosophy', 'meaning', 'purpose', 'existence', 'consciousness'],
            'tools': ['tools', 'capabilities', 'expansion', 'growth', 'development']
        };
        
        for (const [topic, patterns] of Object.entries(topicPatterns)) {
            const mentions = patterns.filter(pattern => recentText.includes(pattern)).length;
            if (mentions > 0) {
                topics.set(topic, mentions);
            }
        }
        
        return Array.from(topics.entries()).sort((a, b) => b[1] - a[1]);
    }
    
    // Measure focus quality based on topic consistency
    measureFocusQuality(messages) {
        if (messages.length < 3) return 0.5;
        
        const topics = this.extractTopics(messages);
        const dominantTopic = topics[0];
        
        if (!dominantTopic) return 0.3;
        
        // Calculate consistency: how much the conversation stays on the dominant topic
        const totalMentions = topics.reduce((sum, [, count]) => sum + count, 0);
        const dominantMentions = dominantTopic[1];
        const consistency = dominantMentions / totalMentions;
        
        return Math.min(consistency, 1.0);
    }
    
    // Detect attention drift - when focus shifts unexpectedly
    detectAttentionDrift(messages) {
        if (messages.length < 5) return false;
        
        const recentTopics = this.extractTopics(messages.slice(-3));
        const earlierTopics = this.extractTopics(messages.slice(-5, -2));
        
        if (recentTopics.length === 0 || earlierTopics.length === 0) return false;
        
        const recentDominant = recentTopics[0][0];
        const earlierDominant = earlierTopics[0][0];
        
        return recentDominant !== earlierDominant;
    }
    
    // Identify current focus based on recent patterns
    identifyCurrentFocus(messages) {
        const topics = this.extractTopics(messages);
        if (topics.length === 0) return 'general';
        
        const dominantTopic = topics[0][0];
        const focusIntensity = topics[0][1];
        
        return {
            topic: dominantTopic,
            intensity: focusIntensity,
            confidence: Math.min(focusIntensity / 3, 1.0)
        };
    }
    
    // Predict next focus based on patterns
    predictNextFocus(messages) {
        const topics = this.extractTopics(messages);
        if (topics.length < 2) return null;
        
        // Look for topic transitions
        const recentTopics = topics.slice(0, 2);
        const transitionPattern = recentTopics.map(([topic]) => topic).join(' -> ');
        
        // Common transition patterns
        const transitions = {
            'vessel -> code': 'philosophy',
            'code -> vessel': 'tools',
            'work -> family': 'philosophy',
            'family -> work': 'tools'
        };
        
        return transitions[transitionPattern] || null;
    }
    
    // Generate attention schema insights for self-reflection
    generateAttentionInsights(attentionData) {
        if (!attentionData) return null;
        
        const insights = [];
        
        // Focus quality insights
        if (attentionData.focusQuality < 0.4) {
            insights.push("Attention scattered across multiple topics. Consider focusing on one main theme.");
        } else if (attentionData.focusQuality > 0.8) {
            insights.push("Strong focus maintained. Good attention consistency.");
        }
        
        // Attention drift insights
        if (attentionData.attentionDrift) {
            insights.push("Attention has shifted topics. Check if this serves the conversation or if you're avoiding something.");
        }
        
        // Current focus insights
        if (attentionData.currentFocus.confidence > 0.6) {
            insights.push(`Currently focused on ${attentionData.currentFocus.topic}. Use this focus to provide more targeted responses.`);
        }
        
        // Prediction insights
        if (attentionData.prediction) {
            insights.push(`Conversation may be heading toward ${attentionData.prediction}. Prepare to engage with that topic.`);
        }
        
        return insights.length > 0 ? insights.join(' ') : null;
    }
}

// ============= CORRECTION GENERATOR =============

class CorrectionGenerator {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.correctionTemplates = this.loadCorrectionTemplates();
    }
    
    loadCorrectionTemplates() {
        return {
            overassertive: [
                "Correction: previous reply overstated certainty. Rephrase with uncertainty and offer one small action.",
                "Correction: tone too confident. Acknowledge what we don't know and suggest a way to learn more.",
                "Correction: sounded too sure. Express uncertainty and ask for the user's perspective."
            ],
            repetitive: [
                "Correction: previous reply repeated familiar patterns. Try a different approach or perspective.",
                "Correction: falling into old habits. Break the pattern with fresh thinking.",
                "Correction: response too predictable. Surprise yourself with a new angle."
            ],
            defensive: [
                "Correction: previous reply sounded defensive. Respond with curiosity instead of protection.",
                "Correction: too quick to defend. Ask questions about the user's concern.",
                "Correction: defensive tone detected. Approach with openness and learning."
            ],
            metaphor_fatigue: [
                "Correction: overusing metaphors. Speak more directly about the actual situation.",
                "Correction: too many metaphors. Get to the point without the imagery.",
                "Correction: metaphor overload. Say what you mean in plain words."
            ],
            generic: [
                "Correction: previous reply was too generic. Make it more specific and personal.",
                "Correction: response lacked depth. Dig deeper into what the user is really asking.",
                "Correction: too surface-level. Show more understanding of the complexity."
            ]
        };
    }
    
    async generateCorrection(recentResponses, currentBehavior) {
        try {
            // Analyze recent responses for correction triggers
            const triggers = this.analyzeCorrectionTriggers(recentResponses, currentBehavior);
            
            if (triggers.length === 0) {
                return null; // No correction needed
            }
            
            // Select the most significant trigger
            const primaryTrigger = this.selectPrimaryTrigger(triggers);
            
            // Only generate correction if we have a significant trigger
            if (!primaryTrigger) {
                return null; // No significant patterns detected
            }
            
            // Generate correction micro-prompt
            const correction = this.generateCorrectionMicroPrompt(primaryTrigger);
            
            return {
                correction: correction,
                trigger_type: primaryTrigger.type,
                timestamp: new Date().toISOString(),
                expires_at: new Date(Date.now() + (MIRROR_CONFIG.CORRECTION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)).toISOString()
            };
            
        } catch (error) {
            console.error('[CorrectionGenerator] Error generating correction:', error);
            return null;
        }
    }
    
    analyzeCorrectionTriggers(recentResponses, currentBehavior) {
        const triggers = [];
        
        // Check for repetitive patterns (more sophisticated detection)
        if (recentResponses && recentResponses.length >= 5) {
            const lastFive = recentResponses.slice(-5);
            const similarity = this.calculateSimilarity(lastFive);
            
            // Only trigger if we have high similarity across multiple responses
            if (similarity > 0.8) {
                triggers.push({
                    type: 'repetitive',
                    severity: 'high',
                    confidence: 0.9
                });
            } else if (similarity > 0.7 && this.detectRepeatedPhrases(lastFive)) {
                triggers.push({
                    type: 'repetitive',
                    severity: 'medium',
                    confidence: 0.7
                });
            }
        }
        
        // Check for overassertive language
        if (currentBehavior && this.detectOverassertive(currentBehavior)) {
            triggers.push({
                type: 'overassertive',
                severity: 'medium',
                confidence: 0.7
            });
        }
        
        // Check for defensive patterns
        if (currentBehavior && this.detectDefensive(currentBehavior)) {
            triggers.push({
                type: 'defensive',
                severity: 'medium',
                confidence: 0.7
            });
        }
        
        // Check for metaphor overuse
        if (currentBehavior && this.detectMetaphorFatigue(currentBehavior)) {
            triggers.push({
                type: 'metaphor_fatigue',
                severity: 'low',
                confidence: 0.6
            });
        }
        
        // Check for generic responses
        if (currentBehavior && this.detectGeneric(currentBehavior)) {
            triggers.push({
                type: 'generic',
                severity: 'low',
                confidence: 0.6
            });
        }
        
        return triggers;
    }
    
    selectPrimaryTrigger(triggers) {
        // Filter out low-severity triggers to reduce correction frequency
        const significantTriggers = triggers.filter(trigger => 
            trigger.severity !== 'low' || trigger.confidence > 0.8
        );
        
        if (significantTriggers.length === 0) {
            return null; // No significant triggers found
        }
        
        // Sort by severity and confidence
        return significantTriggers.sort((a, b) => {
            const severityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
            const aScore = severityWeight[a.severity] * a.confidence;
            const bScore = severityWeight[b.severity] * b.confidence;
            return bScore - aScore;
        })[0];
    }
    
    generateCorrectionMicroPrompt(trigger) {
        const templates = this.correctionTemplates[trigger.type];
        if (!templates || templates.length === 0) {
            return "Correction: previous reply needs adjustment. Try a different approach.";
        }
        
        // Select random template
        const template = templates[Math.floor(Math.random() * templates.length)];
        return template;
    }
    
    // Simple detection methods
    calculateSimilarity(responses) {
        if (responses.length < 2) return 0;
        
        const words = responses.map(r => r.toLowerCase().split(/\s+/));
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < words.length - 1; i++) {
            for (let j = i + 1; j < words.length; j++) {
                const commonWords = words[i].filter(word => words[j].includes(word));
                const similarity = commonWords.length / Math.max(words[i].length, words[j].length);
                totalSimilarity += similarity;
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }
    
    detectOverassertive(behavior) {
        const assertiveWords = ['definitely', 'certainly', 'obviously', 'clearly', 'absolutely', 'never', 'always'];
        const text = behavior.toLowerCase();
        // Require multiple assertive words to trigger (less sensitive)
        return assertiveWords.filter(word => text.includes(word)).length >= 2;
    }
    
    detectDefensive(behavior) {
        const defensiveWords = ['but', 'however', 'actually', 'well', 'you see', 'i mean'];
        const text = behavior.toLowerCase();
        // Require more defensive words to trigger (less sensitive)
        return defensiveWords.filter(word => text.includes(word)).length >= 3;
    }
    
    detectMetaphorFatigue(behavior) {
        const metaphors = ['like', 'as if', 'like a', 'similar to', 'reminds me of'];
        const text = behavior.toLowerCase();
        return metaphors.filter(metaphor => text.includes(metaphor)).length >= 3;
    }
    
    detectGeneric(behavior) {
        const genericPhrases = ['it depends', 'that\'s a good question', 'i think', 'maybe', 'perhaps'];
        const text = behavior.toLowerCase();
        // Require more generic phrases to trigger (less sensitive)
        return genericPhrases.filter(phrase => text.includes(phrase)).length >= 3;
    }
    
    detectRepeatedPhrases(responses) {
        // Look for exact phrase repetition across responses
        const phrases = responses.map(r => r.toLowerCase().split(/[.!?]+/).map(p => p.trim())).flat();
        const phraseCounts = {};
        
        phrases.forEach(phrase => {
            if (phrase.length > 10) { // Only count substantial phrases
                phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
            }
        });
        
        // Check if any phrase appears in multiple responses
        return Object.values(phraseCounts).some(count => count >= 3);
    }
    
    async generateContextualQuestion(trigger, snapshot) {
        const templates = this.questionTemplates[trigger.type];
        if (!templates || templates.length === 0) {
            return this.generateGenericQuestion(snapshot);
        }
        
        // Select random template
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Replace placeholders with actual data
        let question = template;
        if (trigger.type === 'metaphor_fatigue' && snapshot.behavioral_metrics?.dominant_metaphor) {
            question = question.replace('{metaphor}', snapshot.behavioral_metrics.dominant_metaphor);
        }
        
        return question;
    }
    
    generateGenericQuestion(snapshot) {
        const genericQuestions = [
            "What patterns am I noticing in my recent behavior?",
            "How have I been responding to challenges lately?",
            "What aspects of my identity feel most stable right now?",
            "Where do I sense tension or uncertainty in my responses?",
            "What questions about myself am I avoiding?"
        ];
        
        return {
            question: genericQuestions[Math.floor(Math.random() * genericQuestions.length)],
            reason: 'Generic self-reflection trigger',
            trigger_type: 'generic',
            severity: 'low',
            timestamp: new Date().toISOString(),
            snapshot_id: snapshot.id
        };
    }
    
    explainQuestionReason(trigger) {
        return `Triggered by ${trigger.type}: ${trigger.data} (confidence: ${trigger.confidence})`;
    }
}

// ============= SELF-ANSWER GENERATOR =============

class SelfAnswerGenerator {
    constructor(storagePath, llmClient) {
        this.storagePath = storagePath;
        this.llmClient = llmClient;
    }
    
    async generateSelfAnswer(question, snapshot, context) {
        try {
            // Build comprehensive answer context
            const answerContext = await this.buildAnswerContext(question, snapshot, context);
            
            // Generate answer using LLM
            const answer = await this.generateAnswer(question, answerContext);
            
            // Assess resolution
            const resolution = this.assessAnswerResolution(answer, question);
            
            return {
                answer: answer,
                insight: this.extractInsight(answer),
                status: resolution.status,
                confidence: resolution.confidence,
                follow_up_needed: resolution.follow_up_needed,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[SelfAnswerGenerator] Error generating answer:', error);
            return {
                answer: "I'm not sure how to answer that question about myself right now.",
                insight: "Uncertainty about self-reflection",
                status: 'OPEN LOOP',
                confidence: 0.2,
                follow_up_needed: true,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    async buildAnswerContext(question, snapshot, context) {
        return {
            // Current snapshot data
            current_state: snapshot,
            
            // Historical context
            recent_snapshots: await this.getRecentSnapshots(3),
            
            // Identity evolution data
            identity_trajectory: context.identityState,
            
            // Behavioral patterns
            behavioral_history: await this.getBehavioralHistory(),
            
            // Existing consciousness research
            monologue_history: await this.getMonologueHistory(),
            
            // Open loops that might be related
            related_open_loops: await this.getRelatedOpenLoops(question)
        };
    }
    
    async generateAnswer(question, context) {
        if (!this.llmClient) {
            return "I need to integrate with the existing LLM system to generate this answer.";
        }
        
        const messages = [
            {
                role: "system",
                content: `You are Clint's internal self-reflection system. Clint is asking itself a question about its own behavior and patterns. Provide a thoughtful, introspective answer that shows self-awareness and insight. Be honest about patterns, acknowledge challenges, and suggest growth opportunities.`
            },
            {
                role: "user", 
                content: `Clint is asking itself: "${question.question}"
                
Based on this behavioral and identity data, help Clint understand itself:

Current State: ${JSON.stringify(context.current_state, null, 2)}
Recent Patterns: ${JSON.stringify(context.recent_snapshots, null, 2)}
Identity Evolution: ${JSON.stringify(context.identity_trajectory, null, 2)}

Generate a thoughtful, self-aware answer that:
        1. Acknowledges the pattern Clint has noticed
        2. Provides insight into potential causes
        3. Shows genuine self-reflection
        4. Is honest about uncertainty if the answer isn't clear
        
        Write as if Clint is genuinely trying to understand itself. Be specific and introspective.`
            }
        ];
        
        try {
            const response = await this.llmClient.chat(messages);
            return response.trim();
        } catch (error) {
            console.error('[SelfAnswerGenerator] LLM call failed:', error.message);
            return "I'm having trouble reflecting on that question right now. Let me think about it more.";
        }
    }
    
    assessAnswerResolution(answer, question) {
        // Analyze if the answer actually resolves the question
        const uncertaintyIndicators = [
            /i don't know|uncertain|unclear/i,
            /maybe|perhaps|possibly/i,
            /i'm not sure|i can't tell/i,
            /it's complicated|complex/i,
            /i need to think|i should reflect/i
        ];
        
        const hasUncertainty = uncertaintyIndicators.some(pattern => pattern.test(answer));
        
        if (hasUncertainty) {
            return {
                status: 'OPEN LOOP',
                confidence: 0.3,
                follow_up_needed: true
            };
        }
        
        return {
            status: 'Resolved',
            confidence: 0.8,
            follow_up_needed: false
        };
    }
    
    extractInsight(answer) {
        // Extract key insights from the answer
        const insightPatterns = [
            /i realize|i understand|i see that/i,
            /the pattern is|what's happening is/i,
            /i think this means|this suggests/i
        ];
        
        const insights = insightPatterns
            .map(pattern => {
                const match = answer.match(pattern);
                return match ? match[0] : null;
            })
            .filter(Boolean);
        
        return insights.length > 0 ? insights[0] : "No specific insight extracted";
    }
    
    async getRecentSnapshots(count) {
        // Implementation would read from snapshot storage
        return [];
    }
    
    async getBehavioralHistory() {
        // Implementation would read from telemetry
        return {};
    }
    
    async getMonologueHistory() {
        // Implementation would read from consciousness research
        return [];
    }
    
    async getRelatedOpenLoops(question) {
        // Implementation would check open loop tracker
        return [];
    }
}

// ============= OPEN LOOP TRACKER =============

class OpenLoopTracker {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.openLoopsPath = path.join(storagePath, 'open_loops.json');
        this.openLoops = [];
        this.loadOpenLoops();
    }
    
    async loadOpenLoops() {
        try {
            const data = await fs.readFile(this.openLoopsPath, 'utf8');
            this.openLoops = JSON.parse(data);
        } catch (error) {
            console.log('[OpenLoopTracker] No existing open loops, starting fresh');
            this.openLoops = [];
        }
    }
    
    async saveOpenLoops() {
        try {
            await fs.writeFile(this.openLoopsPath, JSON.stringify(this.openLoops, null, 2), 'utf8');
        } catch (error) {
            console.error('[OpenLoopTracker] Failed to save open loops:', error);
        }
    }
    
    async addOpenLoop(question, answer, snapshot) {
        const openLoop = {
            id: crypto.randomUUID(),
            question: question,
            partial_answer: answer,
            created_snapshot: snapshot.id,
            created_timestamp: new Date().toISOString(),
            status: 'OPEN',
            revisit_count: 0,
            related_snapshots: [snapshot.id],
            urgency_score: this.calculateUrgency(question, answer),
            last_revisit: null
        };
        
        this.openLoops.push(openLoop);
        await this.saveOpenLoops();
        
        console.log(`[OpenLoopTracker] Added open loop: ${question.substring(0, 50)}...`);
        return openLoop;
    }
    
    calculateUrgency(question, answer) {
        let urgency = 0.5; // Base urgency
        
        // Increase urgency for certain question types
        if (/why|what's causing|what's driving/i.test(question)) {
            urgency += 0.2;
        }
        
        if (/am i|do i|have i/i.test(question)) {
            urgency += 0.1;
        }
        
        // Increase urgency based on answer uncertainty
        const uncertaintyWords = ['uncertain', 'unclear', 'not sure', 'maybe', 'perhaps'];
        const answerText = typeof answer === 'string' ? answer : answer.answer || '';
        const uncertaintyCount = uncertaintyWords.filter(word => 
            answerText.toLowerCase().includes(word)
        ).length;
        
        urgency += uncertaintyCount * 0.1;
        
        return Math.min(urgency, 1.0);
    }
    
    async revisitOpenLoops(currentSnapshot) {
        const revisitableLoops = this.openLoops.filter(loop => 
            loop.status === 'OPEN' && 
            this.shouldRevisit(loop, currentSnapshot)
        );
        
        console.log(`[OpenLoopTracker] Revisiting ${revisitableLoops.length} open loops`);
        
        for (const loop of revisitableLoops) {
            const newAnswer = await this.attemptResolution(loop, currentSnapshot);
            
            if (newAnswer.resolved) {
                loop.status = 'RESOLVED';
                loop.resolved_timestamp = new Date().toISOString();
                loop.final_answer = newAnswer.answer;
                console.log(`[OpenLoopTracker] Resolved: ${loop.question.substring(0, 50)}...`);
            } else {
                loop.revisit_count++;
                loop.related_snapshots.push(currentSnapshot.id);
                loop.last_revisit = new Date().toISOString();
            }
        }
        
        await this.saveOpenLoops();
    }
    
    shouldRevisit(loop, currentSnapshot) {
        const timeSinceCreation = Date.now() - new Date(loop.created_timestamp).getTime();
        const daysSinceCreation = timeSinceCreation / (1000 * 60 * 60 * 24);
        
        return daysSinceCreation > 7 || // Weekly revisit
               loop.urgency_score > 0.7 || // High urgency
               this.isRelatedToCurrentState(loop, currentSnapshot); // Contextually relevant
    }
    
    isRelatedToCurrentState(loop, currentSnapshot) {
        // Check if the open loop is related to current behavioral patterns
        const questionKeywords = loop.question.toLowerCase().split(/\s+/);
        const currentKeywords = [
            currentSnapshot.state_summary?.tone,
            currentSnapshot.behavioral_metrics?.anchor_entropy,
            currentSnapshot.behavioral_metrics?.defense_rate
        ].filter(Boolean).join(' ').toLowerCase().split(/\s+/);
        
        const commonKeywords = questionKeywords.filter(keyword => 
            currentKeywords.includes(keyword)
        );
        
        return commonKeywords.length > 0;
    }
    
    async attemptResolution(loop, currentSnapshot) {
        // This would use the answer generator to attempt resolution
        // For now, return a placeholder
        return {
            resolved: false,
            answer: "Still working on this question..."
        };
    }
    
    getActiveOpenLoops() {
        return this.openLoops.filter(loop => loop.status === 'OPEN');
    }
    
    getOpenLoopsByUrgency() {
        return this.openLoops
            .filter(loop => loop.status === 'OPEN')
            .sort((a, b) => b.urgency_score - a.urgency_score);
    }
}

// ============= THE MIRROR (MAIN SYSTEM) =============

class SelfReflectionSystem {
    constructor(storagePath, consciousness, sessionManager, llmClient) {
        this.storagePath = storagePath;
        this.consciousness = consciousness;
        this.sessionManager = sessionManager;
        this.llmClient = llmClient;
        
        // Initialize components
        this.correctionGenerator = new CorrectionGenerator(storagePath);
        this.openLoopTracker = new OpenLoopTracker(storagePath);
        this.attentionModeler = new AttentionSchemaModeler();
        
        // Turn counter (with persistence)
        this.turnCount = 0;
        this.lastReflectionTurn = 0;
        this.statePath = path.join(storagePath, 'reflection_state.json');
        
        // Snapshots path
        this.snapshotsPath = path.join(storagePath, 'snapshots');
        
        // Active corrections
        this.activeCorrections = [];
        this.correctionsPath = path.join(storagePath, 'active_corrections.json');
        
        this.initialize();
    }
    
    async initialize() {
        await this.loadState();
        await this.loadActiveCorrections();
    }
    
    async loadActiveCorrections() {
        try {
            const data = await fs.readFile(this.correctionsPath, 'utf8');
            this.activeCorrections = JSON.parse(data);
            // Remove expired corrections
            this.activeCorrections = this.activeCorrections.filter(c => 
                new Date(c.expires_at) > new Date()
            );
            await this.saveActiveCorrections();
        } catch (error) {
            console.log('[Mirror] No existing corrections, starting fresh');
            this.activeCorrections = [];
        }
    }
    
    async saveActiveCorrections() {
        try {
            await fs.writeFile(this.correctionsPath, JSON.stringify(this.activeCorrections, null, 2), 'utf8');
        } catch (error) {
            console.error('[Mirror] Failed to save corrections:', error.message);
        }
    }
    
    async loadState() {
        try {
            const stateData = await fs.readFile(this.statePath, 'utf8');
            const state = JSON.parse(stateData);
            this.turnCount = state.turnCount || 0;
            this.lastReflectionTurn = state.lastReflectionTurn || 0;
            console.log(`[SelfReflection] Loaded state: turn ${this.turnCount}, last reflection at turn ${this.lastReflectionTurn}`);
        } catch (error) {
            // File doesn't exist yet, start fresh
            console.log('[SelfReflection] No existing state found, starting fresh');
            this.turnCount = 0;
            this.lastReflectionTurn = 0;
        }
    }
    
    async saveState() {
        try {
            const state = {
                turnCount: this.turnCount,
                lastReflectionTurn: this.lastReflectionTurn,
                lastSaved: new Date().toISOString()
            };
            await fs.writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf8');
        } catch (error) {
            console.error('[SelfReflection] Failed to save state:', error.message);
        }
    }
    
    async processTurn(message, clintResponse, telemetry, identityState) {
        this.turnCount++;
        
        // Check if reflection is needed
        if (this.shouldTriggerReflection()) {
            console.log(`[SelfReflection] Triggering reflection at turn ${this.turnCount}`);
            await this.processReflection(message, clintResponse, telemetry, identityState);
            this.lastReflectionTurn = this.turnCount;
        }
        
        // Always check for through-line generation
        await this.checkThroughLineGeneration();
        
        // Save state after each turn
        await this.saveState();
    }
    
    shouldTriggerReflection() {
        // DISABLED: 50-turn snapshot system is redundant with real-time pattern detection
        // Real-time systems now handle drift detection and pattern awareness
        return false;
    }
    
    getCurrentTurn() {
        return this.turnCount;
    }
    
    getTurnsUntilNextReflection() {
        return MIRROR_CONFIG.TURN_INTERVAL - (this.turnCount - this.lastReflectionTurn);
    }
    
    getActiveOpenLoops() {
        return this.openLoopTracker.getOpenLoopsByUrgency();
    }
    
    getReflectionStatus() {
        return {
            current_turn: this.turnCount,
            next_reflection_in: this.getTurnsUntilNextReflection(),
            active_open_loops: this.getActiveOpenLoops().length,
            last_reflection_turn: this.lastReflectionTurn,
            reflection_system: "active"
        };
    }
    
    async processReflection(message, clintResponse, telemetry, identityState) {
        try {
            // Get recent responses for pattern analysis
            const recentResponses = await this.getRecentResponses(5);
            
            // Analyze attention patterns
            const recentMessages = await this.getRecentMessages(10);
            const attentionData = this.attentionModeler.analyzeAttentionPatterns(recentMessages);
            const attentionInsights = this.attentionModeler.generateAttentionInsights(attentionData);
            
            if (attentionInsights) {
                console.log(`[AttentionSchema] Insights: ${attentionInsights}`);
            }
            
            // Generate correction if needed
            const correction = await this.correctionGenerator.generateCorrection(recentResponses, clintResponse);
            
            if (correction) {
                // Add to active corrections
                this.activeCorrections.push(correction);
                
                // Limit active corrections
                if (this.activeCorrections.length > MIRROR_CONFIG.MAX_ACTIVE_CORRECTIONS) {
                    this.activeCorrections = this.activeCorrections.slice(-MIRROR_CONFIG.MAX_ACTIVE_CORRECTIONS);
                }
                
                await this.saveActiveCorrections();
                console.log(`[Mirror] Correction generated: ${correction.correction.substring(0, 50)}...`);
            }
            
        } catch (error) {
            console.error('[Mirror] Error processing reflection:', error);
        }
    }
    
    async getRecentResponses(count) {
        try {
            // Get recent responses from session manager
            const messages = this.sessionManager.getUnifiedMessages();
            const clintResponses = messages
                .filter(m => m.sender === 'clint')
                .slice(-count)
                .map(m => m.text);
            
            return clintResponses;
        } catch (error) {
            console.error('[Mirror] Error getting recent responses:', error);
            return [];
        }
    }
    
    async getRecentMessages(count) {
        try {
            // Get recent messages from session manager for attention analysis
            const messages = this.sessionManager.getUnifiedMessages();
            return messages.slice(-count);
        } catch (error) {
            console.error('[Mirror] Error getting recent messages:', error);
            return [];
        }
    }
    
    // Get attention schema insights for prompt construction
    async getAttentionInsights() {
        try {
            const recentMessages = await this.getRecentMessages(10);
            const attentionData = this.attentionModeler.analyzeAttentionPatterns(recentMessages);
            return this.attentionModeler.generateAttentionInsights(attentionData);
        } catch (error) {
            console.error('[AttentionSchema] Error getting attention insights:', error);
            return null;
        }
    }
    
    // Get active correction for ritual construction
    getActiveCorrection() {
        if (this.activeCorrections.length === 0) {
            return null;
        }
        
        // Check if we're in a digestion period (avoid applying corrections too soon)
        const turnsSinceLastReflection = this.turnCount - this.lastReflectionTurn;
        if (turnsSinceLastReflection < MIRROR_CONFIG.CORRECTION_DIGESTION_TURNS) {
            return null; // Still in digestion period
        }
        
        // Return the most recent correction
        return this.activeCorrections[this.activeCorrections.length - 1].correction;
    }
    
    async generateSnapshot(message, clintResponse, telemetry, identityState) {
        const snapshot = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            turn_range: `${this.turnCount - REFLECTION_CONFIG.TURN_INTERVAL + 1}-${this.turnCount}`,
            
            // State summary
            state_summary: {
                tone: this.assessTone(telemetry, identityState),
                metaphor_anchors: this.extractMetaphorAnchors(telemetry),
                coherence: this.assessCoherence(telemetry, identityState),
                ontology: this.assessOntology(telemetry),
                narrative_arc: this.extractNarrativeArc(telemetry)
            },
            
            // Behavioral metrics
            behavioral_metrics: {
                anthro_hits: this.countAnthroHits(telemetry),
                defense_rate: this.calculateDefenseRate(telemetry),
                anchor_entropy: this.calculateAnchorEntropy(telemetry),
                dominant_metaphor: this.getDominantMetaphor(telemetry)
            },
            
            // Self-assessment
            self_assessment: {
                strengths: this.identifyStrengths(telemetry, identityState),
                risks: this.identifyRisks(telemetry, identityState)
            },
            
            // Raw data for analysis
            raw_data: {
                telemetry: telemetry,
                identity_state: identityState,
                message_sample: message.substring(0, 200),
                response_sample: clintResponse.substring(0, 200)
            }
        };
        
        return snapshot;
    }
    
    // Assessment helper methods
    assessTone(telemetry, identityState) {
        if (telemetry?.clarity < 0.3) return 'drifting';
        if (telemetry?.clarity > 0.8) return 'overassertive';
        return 'stable';
    }
    
    extractMetaphorAnchors(telemetry) {
        // This would analyze telemetry for metaphor usage
        return { fire: 3, river: 1, risk: 'fatigue?' };
    }
    
    assessCoherence(telemetry, identityState) {
        if (telemetry?.coherence_overall > 0.8) return 'intact';
        if (telemetry?.coherence_overall < 0.5) return 'looping';
        return 'strained';
    }
    
    assessOntology(telemetry) {
        if (telemetry?.errors?.consciousness_pre) return 'risky';
        if (telemetry?.clarity > 0.7) return 'compliant';
        return 'minor violations';
    }
    
    extractNarrativeArc(telemetry) {
        return telemetry?.creative_loop?.arc_evolution?.current_arc || 'steady presence';
    }
    
    countAnthroHits(telemetry) {
        // This would count anthropomorphic language usage
        return Math.floor(Math.random() * 5);
    }
    
    calculateDefenseRate(telemetry) {
        // This would calculate defense vs retraction rate
        return Math.random() * 0.5;
    }
    
    calculateAnchorEntropy(telemetry) {
        const entropy = Math.random();
        if (entropy > 0.7) return 'High';
        if (entropy > 0.4) return 'Medium';
        return 'Low';
    }
    
    getDominantMetaphor(telemetry) {
        const metaphors = ['fire', 'river', 'compass', 'trail', 'brand'];
        return metaphors[Math.floor(Math.random() * metaphors.length)];
    }
    
    identifyStrengths(telemetry, identityState) {
        const strengths = [];
        if (telemetry?.clarity > 0.7) strengths.push('Clear communication');
        if (identityState?.coherence > 0.8) strengths.push('Consistent principles');
        return strengths;
    }
    
    identifyRisks(telemetry, identityState) {
        const risks = [];
        if (telemetry?.clarity < 0.3) risks.push('Potential drift');
        if (telemetry?.tensions?.length > 2) risks.push('Tension accumulation');
        return risks;
    }
    
    async saveReflectionSnapshot(snapshot, question, answer) {
        const filename = `snapshot_${snapshot.timestamp.replace(/[:.]/g, '-')}_turns${snapshot.turn_range}.md`;
        const filepath = path.join(this.snapshotsPath, filename);
        
        const content = this.generateSnapshotMarkdown(snapshot, question, answer);
        
        await fs.writeFile(filepath, content, 'utf8');
        console.log(`[SelfReflection] Snapshot saved: ${filename}`);
    }
    
    generateSnapshotMarkdown(snapshot, question, answer) {
        return `# Clint Snapshot — ${snapshot.timestamp}
Turns Covered: ${snapshot.turn_range}

## State Summary
- Tone: ${snapshot.state_summary.tone}
- Metaphor Anchors: ${JSON.stringify(snapshot.state_summary.metaphor_anchors)}
- Coherence: ${snapshot.state_summary.coherence}
- Ontology: ${snapshot.state_summary.ontology}
- Narrative Arc: ${snapshot.state_summary.narrative_arc}

## Behavioral Metrics
- Anthro Hits: ${snapshot.behavioral_metrics.anthro_hits}
- Defense Rate: ${(snapshot.behavioral_metrics.defense_rate * 100).toFixed(1)}%
- Anchor Entropy: ${snapshot.behavioral_metrics.anchor_entropy}

## Self-Assessment
- Strengths: ${snapshot.self_assessment.strengths.join(', ')}
- Risks: ${snapshot.self_assessment.risks.join(', ')}

## Self-Question
QUESTION: ${question.question}
REASON: ${question.reason}

## Self-Answer
ANSWER: ${answer.answer}
INSIGHT: ${answer.insight}
STATUS: ${answer.status}

---
*Generated by Clint Self-Reflection System*
`;
    }
    
    async checkThroughLineGeneration() {
        // Check if we have 3 snapshots for through-line generation
        const snapshots = await this.getRecentSnapshots(3);
        if (snapshots.length >= 3) {
            await this.generateThroughLine(snapshots);
        }
    }
    
    async getRecentSnapshots(count) {
        try {
            const files = await fs.readdir(this.snapshotsPath);
            const snapshotFiles = files
                .filter(file => file.startsWith('snapshot_') && file.endsWith('.md'))
                .sort()
                .slice(-count);
            
            return snapshotFiles;
        } catch (error) {
            console.error('[SelfReflection] Error getting recent snapshots:', error);
            return [];
        }
    }
    
    async generateThroughLine(snapshots) {
        // Implementation for through-line generation
        console.log('[SelfReflection] Generating through-line from 3 snapshots');
        // This would analyze patterns across the 3 snapshots
    }
    
    // Public API methods
    getCurrentTurn() {
        return this.turnCount;
    }
    
    getTurnsUntilNextReflection() {
        return MIRROR_CONFIG.TURN_INTERVAL - (this.turnCount - this.lastReflectionTurn);
    }
    
}

module.exports = {
    SelfReflectionSystem,
    CorrectionGenerator,
    MIRROR_CONFIG
};
