// contextWeighting.js - Intelligent Context Weighting System
// Optimizes context injection while preserving richness and organic flow

class ContextWeightingSystem {
    constructor() {
        // Context weight categories
        this.WEIGHTS = {
            ESSENTIAL: 1.0,      // Always present - core identity, current conversation
            HIGH: 0.8,           // Usually present - relevant knowledge, key patterns
            MEDIUM: 0.6,         // Contextually relevant - profile insights, historical patterns
            LOW: 0.4,            // Background context - meta-memory, consciousness data
            MINIMAL: 0.2         // Subtle integration - principles, ambient context
        };
        
        // Context injection limits (tokens) - INCREASED for richer context
        this.LIMITS = {
            ESSENTIAL: 3000,     // Core identity + current thread
            HIGH: 4800,          // Knowledge chunks + key patterns
            MEDIUM: 3600,        // Profile + historical context
            LOW: 2400,           // Background patterns
            MINIMAL: 1200        // Subtle principles
        };
        
        // Total context budget - MUCH HIGHER
        this.TOTAL_BUDGET = 16000; // Total tokens for all context (increased for continuity)
    }

    // Analyze message to determine context needs
    analyzeMessageComplexity(message) {
        const text = message.toLowerCase();
        
        // Check for references to previous conversation (need more context)
        const continuityIndicators = [
            'remember', 'you said', 'we were talking', 'earlier', 'before', 'you told me',
            'don\'t remember', 'lost', 'connection', 'thread', 'conversation', 'discussing'
        ];
        
        const needsContinuity = continuityIndicators.some(indicator => text.includes(indicator));
        
        // Simple greetings and short responses
        if (text.length < 50 && !text.includes('?') && !needsContinuity) {
            return { mode: 'simple', budget: 800 };
        }
        
        // Continuity/conversation thread mode (HIGHEST PRIORITY)
        if (needsContinuity) {
            return { mode: 'continuity', budget: 2000 };
        }
        
        // Questions requiring knowledge base
        if (text.includes('what') || text.includes('how') || text.includes('why') || 
            text.includes('tell me') || text.includes('explain')) {
            return { mode: 'knowledge', budget: 1500 };
        }
        
        // Deep philosophical or personal topics
        if (text.includes('think') || text.includes('believe') || text.includes('feel') ||
            text.includes('meaning') || text.includes('purpose') || text.includes('life')) {
            return { mode: 'philosophical', budget: 1800 };
        }
        
        // Technical or specific topics
        if (text.includes('system') || text.includes('code') || text.includes('function') ||
            text.includes('technical') || text.includes('debug') || text.includes('error')) {
            return { mode: 'technical', budget: 1200 };
        }
        
        // Default conversation mode
        return { mode: 'conversational', budget: 1200 };
    }

    // Weight and format knowledge context
    weightKnowledgeContext(knowledgeChunks, message, mode) {
        if (!knowledgeChunks || knowledgeChunks.length === 0) return '';
        
        // Filter and score chunks based on relevance
        const scoredChunks = knowledgeChunks.map(chunk => ({
            content: chunk,
            relevance: this.scoreRelevance(chunk, message),
            weight: this.WEIGHTS.HIGH
        })).filter(chunk => chunk.relevance > 0.3);
        
        // Sort by relevance and take top chunks
        scoredChunks.sort((a, b) => b.relevance - a.relevance);
        
        const selectedChunks = scoredChunks.slice(0, this.getChunkLimit(mode));
        
        if (selectedChunks.length === 0) return '';
        
        // Format as organic context rather than raw chunks
        let context = '[Knowledge Context]\n';
        context += 'The following insights feel relevant to your response:\n';
        
        selectedChunks.forEach((chunk, index) => {
            const summary = this.summarizeChunk(chunk.content);
            context += `${index + 1}. ${summary}\n`;
        });
        
        context += '[Draw from these insights naturally as they feel relevant to your response.]\n\n';
        
        return context;
    }

    // Weight and format profile context - MINIMAL "SWEET SPOT" VERSION
    weightProfileContext(profileSummary, activeProfile, trustLevel) {
        if (!profileSummary) return '';
        
        let context = '[PROFILE CONTEXT]\n';
        
        // MINIMAL PROFILE DATA - Just recognition, context, and understanding
        if (profileSummary.isAnchor) {
            context += `User: Chris (Creator, Primary User)\n`;
            context += `Relationship: We've built this system together\n`;
            context += `Communication: Direct, technical, philosophical\n`;
            // Show actual interaction count if available
            if (profileSummary.recurs && profileSummary.recurs > 0) {
                context += `Interaction History: ${profileSummary.recurs} conversations\n`;
            }
        } else {
            context += `User: ${profileSummary.id}\n`;
            context += `Relationship: New user\n`;
            context += `Communication: Standard interaction\n`;
        }
        
        context += '\n';
        return context;
    }

    // Weight and format memory context
    weightMemoryContext(userFragments, metaFragments, profileFragments) {
        let context = '';
        const fragments = [];
        
        // PRIORITY: Get robot experience fragments first (highest priority)
        if (userFragments && userFragments.length > 0) {
            const robotExperiences = userFragments
                .filter(f => f.metadata && f.metadata.robotExperience)
                .map(f => f.text || f.content || f)
                .filter(f => f && f.length > 5);
            
            if (robotExperiences.length > 0) {
                fragments.push(...robotExperiences.slice(-5)); // Last 5 robot experiences
            }
        }
        
        // Get most relevant user fragments (conversation history) - MUCH MORE CONTEXT
        if (userFragments && userFragments.length > 0) {
            const recent = userFragments.slice(-10).map(f => f.text || f.content || f); // Increased from 5 to 10
            fragments.push(...recent.filter(f => f && f.length > 5)); // Lowered threshold from 10 to 5
        }
        
        // Get filtered meta fragments (principles without overwhelming detail)
        if (metaFragments && metaFragments.length > 0) {
            const filtered = metaFragments
                .map(f => f.note || f.text || f)
                .filter(fragment => {
                    const text = fragment.toLowerCase();
                    // Filter out overly Code-heavy patterns that might overwhelm
                    const heavyPatterns = [
                        'principle conflict', 'honor and integrity', 'code of the west',
                        're-anchor to the code', 'ride for the brand', 'live with courage'
                    ];
                    return !heavyPatterns.some(pattern => text.includes(pattern));
                })
                .slice(-3); // Increased from 1 to 3
            fragments.push(...filtered);
        }
        
        // Get profile fragment if available
        if (profileFragments && profileFragments.length > 0) {
            const profile = profileFragments[0].content || profileFragments[0];
            if (profile && profile.length > 10) {
                fragments.push(profile);
            }
        }
        
        if (fragments.length > 0) {
            context += '[Conversation Context]\n';
            context += 'Recent conversation history that informs your response:\n';
            fragments.slice(0, 12).forEach((fragment, index) => { // Increased from 6 to 12
                const summary = this.summarizeFragment(fragment);
                context += `${index + 1}. ${summary}\n`;
            });
            context += '\n';
        }
        
        return context;
    }

    // Weight and format robot context (high priority for robot experiences)
    weightRobotContext(userFragments) {
        let context = '';
        
        if (userFragments && userFragments.length > 0) {
            const robotExperiences = userFragments
                .filter(f => f.metadata && f.metadata.robotExperience)
                .slice(-3); // Last 3 robot experiences
            
            if (robotExperiences.length > 0) {
                context += '[Robot Body Context]\n';
                context += 'Your current robot body experiences and sensor data:\n';
                robotExperiences.forEach((experience, index) => {
                    const text = experience.text || experience.content || experience;
                    if (text && text.length > 10) {
                        const summary = this.summarizeFragment(text);
                        context += `${index + 1}. ${summary}\n`;
                    }
                });
                context += '\n';
            }
        }
        
        return context;
    }

    // Weight and format consciousness context
    weightConsciousnessContext(consciousnessData, innerState) {
        let context = '';
        
        // Only include consciousness data if it's highly relevant
        if (consciousnessData && consciousnessData.internal_voice) {
            const thought = consciousnessData.internal_voice.raw_thought;
            if (thought && thought.length > 20 && thought.length < 200) {
                context += '[Internal Context]\n';
                context += `Current internal state: ${this.summarizeThought(thought)}\n\n`;
            }
        }
        
        // Include inner state if it's meaningful
        if (innerState && innerState.clarity !== undefined) {
            if (innerState.clarity < 0.5) {
                context += '[State Note]\n';
                context += `Feeling uncertain about response direction.\n\n`;
            }
        }
        
        return context;
    }

    // Score relevance of knowledge chunk to message
    scoreRelevance(chunk, message) {
        const chunkWords = chunk.toLowerCase().split(/\s+/);
        const messageWords = message.toLowerCase().split(/\s+/);
        
        // Calculate word overlap
        const overlap = messageWords.filter(word => 
            chunkWords.some(chunkWord => 
                chunkWord.includes(word) || word.includes(chunkWord)
            )
        ).length;
        
        // Calculate relevance score (0-1)
        const relevance = overlap / Math.max(messageWords.length, 1);
        
        // Boost score for key concepts
        const keyConcepts = ['adaptability', 'purpose', 'meaning', 'work', 'life', 'choice', 'decision'];
        const hasKeyConcept = keyConcepts.some(concept => 
            chunk.toLowerCase().includes(concept) && message.toLowerCase().includes(concept)
        );
        
        return hasKeyConcept ? Math.min(relevance + 0.3, 1.0) : relevance;
    }

    // Get chunk limit based on conversation mode - INCREASED
    getChunkLimit(mode) {
        const limits = {
            'simple': 2,
            'conversational': 4,
            'continuity': 10,        // NEW: Maximum chunks for continuity
            'knowledge': 6,
            'philosophical': 8,
            'technical': 5
        };
        return limits[mode] || 4;
    }

    // Summarize knowledge chunk for organic integration - MORE CONTENT
    summarizeChunk(chunk) {
        // Extract key insight from chunk - include more content
        const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length === 0) return chunk.substring(0, 200) + '...'; // Increased from 100 to 200
        
        // Take more meaningful sentences instead of just one
        if (sentences.length === 1) {
            const keySentence = sentences[0].trim();
            return keySentence.length > 300 ? keySentence.substring(0, 300) + '...' : keySentence; // Increased from 150 to 300
        } else {
            // Take first 2-3 sentences for richer context
            const keySentences = sentences.slice(0, 3).map(s => s.trim()).join('. ') + '.';
            return keySentences.length > 400 ? keySentences.substring(0, 400) + '...' : keySentences;
        }
    }

    // Summarize memory fragment - MUCH MORE CONTENT
    summarizeFragment(fragment) {
        if (typeof fragment !== 'string') return fragment;
        
        // Clean and compress fragment - allow much more content for continuity
        const cleaned = fragment.replace(/\s+/g, ' ').trim();
        return cleaned.length > 300 ? cleaned.substring(0, 300) + '...' : cleaned; // Increased from 200 to 300
    }

    // Compress profile summary
    compressProfileSummary(summary) {
        if (typeof summary !== 'string') return summary;
        
        const cleaned = summary.replace(/\s+/g, ' ').trim();
        return cleaned.length > 80 ? cleaned.substring(0, 80) + '...' : cleaned;
    }

    // Summarize internal thought
    summarizeThought(thought) {
        if (typeof thought !== 'string') return thought;
        
        const cleaned = thought.replace(/\s+/g, ' ').trim();
        return cleaned.length > 60 ? cleaned.substring(0, 60) + '...' : cleaned;
    }

    // Main context weighting function
    async weightContext({
        message,
        knowledgeChunks = [],
        profileSummary = null,
        activeProfile = null,
        userFragments = [],
        metaFragments = [],
        profileFragments = [],
        consciousnessData = null,
        innerState = null,
        trustLevel = 0.5
    }) {
        // Analyze message complexity
        const analysis = this.analyzeMessageComplexity(message);
        
        // Build weighted context
        let weightedContext = '';
        
        // 1. Profile context (always present, weighted by trust)
        const profileContext = this.weightProfileContext(profileSummary, activeProfile, trustLevel);
        weightedContext += profileContext;
        
        // 2. Memory context (conversation history)
        const memoryContext = this.weightMemoryContext(userFragments, metaFragments, profileFragments);
        weightedContext += memoryContext;
        
        // 3. Knowledge context (only if relevant)
        const knowledgeContext = this.weightKnowledgeContext(knowledgeChunks, message, analysis.mode);
        weightedContext += knowledgeContext;
        
        // 4. Robot context (high priority for robot experiences)
        const robotContext = this.weightRobotContext(userFragments);
        weightedContext += robotContext;
        
        // 5. Consciousness context (minimal, only if highly relevant)
        const consciousnessContext = this.weightConsciousnessContext(consciousnessData, innerState);
        weightedContext += consciousnessContext;
        
        return {
            weightedContext: weightedContext.trim(),
            analysis: analysis,
            contextSize: this.estimateTokens(weightedContext)
        };
    }

    // Estimate token count (rough approximation)
    estimateTokens(text) {
        return Math.ceil(text.split(/\s+/).length * 1.3); // Rough token estimation
    }
}

module.exports = ContextWeightingSystem;
