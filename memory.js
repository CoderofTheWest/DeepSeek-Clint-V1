// memory.js - Recursive Memory & Learning System for Clint
// Enhanced with compression and intelligent selection for MVP

const fs = require('fs').promises;
const path = require('path');

// GROK4'S FIRE SANITIZER - prevents fire themes from reinforcing loops
const fireBlocklist = ['fire', 'firelight', 'flame', 'burn', 'glow', 'crackle', 'fires', 'campfire', 'embers'];

function sanitizeText(text) {
    if (!text) return text;
    
    // Comprehensive fire theme removal
    const firePatterns = [
        /\(.*firelight.*\)/gi,  // Remove stage directions with firelight
        /\(.*fire.*catching.*\)/gi,  // Remove fire catching descriptions
        /firelight catching/gi,  // Remove firelight catching phrases
        /the fire.*casting/gi,  // Remove fire casting shadows
        /fire.*shadows/gi,  // Remove fire shadows
        /fire.*reflecting/gi,  // Remove fire reflecting
        /fire.*eyes/gi,  // Remove fire in eyes
        /fire.*face/gi,  // Remove fire on face
        /across.*fire/gi,  // Remove across the fire
        /fire.*long/gi,  // Remove fire casting long
        /fire.*understanding/gi,  // Remove fire catching understanding
        /fire.*movement/gi,  // Remove fire catching movement
    ];
    
    let sanitized = text;
    firePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });
    
    // Clean up extra spaces and line breaks
    sanitized = sanitized.replace(/\n\s*\n/g, '\n').trim();
    
    return sanitized || text; // Return original if sanitized is empty
}

class ClintMemory {
    constructor(storagePath, profileManager = null, sessionManager = null) {
        this.storagePath = storagePath;
        this.memoryPath = path.join(storagePath, 'memory');
        this.profilePath = path.join(this.memoryPath, 'profile.json');
        this.patternsPath = path.join(this.memoryPath, 'patterns.json');
        this.contextPath = path.join(this.memoryPath, 'context');
        this.sessionManager = sessionManager;
        this.profileManager = profileManager;
        
        // Memory layers (from immediate to deep)
        this.layers = {
            immediate: [],      // Last 50 messages (increased from 20)
            recent: [],         // Last 7 days summarized
            patterns: {
                daily_routines: {},
                communication_style: {},
                topics: {},
                people: {}
            },       // Recurring themes and habits
            profile: {},        // Long-term user understanding
            wisdom: []          // Deep insights about the user
        };
        
        // Token budget management
        this.TOKEN_BUDGET = 24000;  // Maximum tokens for context injection
        this.RELEVANCE_THRESHOLD = 0.4;  // Minimum score to include
        
        this.initialize();
    }
    
    async initialize() {
        // Ensure memory directories exist
        await fs.mkdir(this.memoryPath, { recursive: true });
        await fs.mkdir(this.contextPath, { recursive: true });
        
        // Load existing memory
        await this.loadMemory();
    }
    
    // Load persistent memory from disk
    async loadMemory() {
        try {
            // Load user profile
            const profileData = await fs.readFile(this.profilePath, 'utf8');
            this.layers.profile = JSON.parse(profileData);
        } catch (e) {
            // Initialize empty profile
            this.layers.profile = {
                name: null,
                preferences: {},
                communication_style: {},
                interests: [],
                people_mentioned: {},
                locations: [],
                work_context: {},
                emotional_patterns: {},
                created: new Date(),
                last_updated: new Date()
            };
        }
        
        try {
            // Load patterns
            const patternsData = await fs.readFile(this.patternsPath, 'utf8');
            this.layers.patterns = JSON.parse(patternsData);
        } catch (e) {
            this.layers.patterns = {
                daily_routines: {},
                weekly_patterns: {},
                topics: {},
                sentiment_trends: [],
                task_patterns: {},
                language_patterns: {}
            };
        }
        
        // Load recent context
        await this.loadRecentContext();
        
        // Initialize immediate layer with historical data
        await this.loadImmediateFromHistory();
    }
    
    // ============= NEW COMPRESSION & SELECTION METHODS =============
    
    // Get the dominant emotional or topical pattern from recent period
    getDominantPattern(days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        // Check emotional patterns
        let dominantEmotion = null;
        let maxEmotionCount = 0;
        
        Object.keys(this.layers.profile.emotional_patterns || {}).forEach(emotion => {
            const recentOccurrences = (this.layers.profile.emotional_patterns[emotion] || [])
                .filter(e => new Date(e.time).getTime() > cutoff);
            
            if (recentOccurrences.length > maxEmotionCount) {
                maxEmotionCount = recentOccurrences.length;
                dominantEmotion = emotion;
            }
        });
        
        // Check topic patterns
        let dominantTopic = null;
        let maxTopicCount = 0;
        
        Object.keys(this.layers.patterns.topics || {}).forEach(topic => {
            const topicData = this.layers.patterns.topics[topic];
            if (topicData.last_discussed && new Date(topicData.last_discussed).getTime() > cutoff) {
                if (topicData.count > maxTopicCount) {
                    maxTopicCount = topicData.count;
                    dominantTopic = topic;
                }
            }
        });
        
        // Return the stronger pattern
        if (maxEmotionCount > maxTopicCount * 2) {
            return {
                type: 'emotional',
                summary: `${dominantEmotion}`,
                confidence: Math.min(maxEmotionCount / 10, 1),
                count: maxEmotionCount
            };
        } else if (dominantTopic) {
            return {
                type: 'topic',
                summary: dominantTopic,
                confidence: Math.min(maxTopicCount / 10, 1),
                count: maxTopicCount
            };
        }
        
        return null;
    }
    
    // Get the most discussed person with sentiment
    getKeyPerson(days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        let keyPerson = null;
        let maxMentions = 0;
        
        Object.keys(this.layers.profile.people_mentioned || {}).forEach(person => {
            const personData = this.layers.profile.people_mentioned[person];
            if (personData.last_mentioned && new Date(personData.last_mentioned).getTime() > cutoff) {
                if (personData.mention_count > maxMentions) {
                    maxMentions = personData.mention_count;
                    keyPerson = {
                        name: person,
                        mentions: personData.mention_count,
                        sentiment: this.inferPersonSentiment(person)
                    };
                }
            }
        });
        
        return keyPerson;
    }
    
    // Infer sentiment about a person from context
    inferPersonSentiment(personName) {
        // Look through recent messages mentioning this person
        const recentMentions = this.layers.immediate.filter(msg => 
            msg.text.toLowerCase().includes(personName.toLowerCase())
        );
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        recentMentions.forEach(msg => {
            const text = msg.text.toLowerCase();
            // Simple sentiment detection
            if (text.match(/love|great|wonderful|happy|proud/)) positiveCount++;
            if (text.match(/difficult|frustrated|angry|disappointed|worried/)) negativeCount++;
        });
        
        if (positiveCount > negativeCount * 2) return 'positive';
        if (negativeCount > positiveCount * 2) return 'tense';
        if (negativeCount > 0 && positiveCount > 0) return 'complex';
        return 'neutral';
    }
    
    // Get active conversation threads that seem unresolved
    getActiveThread(days = 3) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        // Look for questions or concerns that weren't resolved
        const recentQuestions = this.layers.immediate.filter(msg => {
            if (msg.sender !== 'user') return false;
            const isRecent = new Date(msg.timestamp).getTime() > cutoff;
            const hasQuestion = msg.text.includes('?') || 
                               msg.text.match(/should i|what if|how do|wonder/i);
            return isRecent && hasQuestion;
        });
        
        if (recentQuestions.length > 0) {
            // Extract the core question/concern
            const lastQuestion = recentQuestions[recentQuestions.length - 1];
            return {
                thread: this.extractCoreConcern(lastQuestion.text),
                lastMentioned: lastQuestion.timestamp,
                weight: 0.7
            };
        }
        
        return null;
    }
    
    // Extract the essence of a concern or question
    extractCoreConcern(text) {
        // Remove filler words and get to the core
        const cleaned = text
            .replace(/i'm not sure|i wonder|maybe|perhaps|i think/gi, '')
            .replace(/[?]/g, '')
            .trim();
        
        // Truncate to essence (first 50 chars)
        return cleaned.length > 50 ? cleaned.substring(0, 47) + '...' : cleaned;
    }
    
    // Calculate relevance score for a memory item against current message
    calculateRelevance(memoryItem, currentMessage) {
        const msgLower = currentMessage.toLowerCase();
        
        // Recency score (exponential decay over 7 days)
        const ageInDays = memoryItem.lastMentioned ? 
            (Date.now() - new Date(memoryItem.lastMentioned).getTime()) / (24 * 60 * 60 * 1000) : 7;
        const recencyScore = Math.exp(-ageInDays / 7);
        
        // Frequency score (normalized)
        const frequencyScore = Math.min((memoryItem.count || 1) / 10, 1);
        
        // Resonance score (semantic match)
        let resonanceScore = 0;
        
        if (memoryItem.type === 'person') {
            if (msgLower.includes(memoryItem.name.toLowerCase())) {
                resonanceScore = 1.0;
            } else if (msgLower.includes('family') && ['dad', 'mom', 'brother', 'sister'].includes(memoryItem.name.toLowerCase())) {
                resonanceScore = 0.5;
            }
        } else if (memoryItem.type === 'topic') {
            const topicKeywords = this.getTopicKeywords(memoryItem.name);
            const matches = topicKeywords.filter(k => msgLower.includes(k)).length;
            resonanceScore = matches > 0 ? Math.min(matches / topicKeywords.length, 1) : 0;
        } else if (memoryItem.type === 'emotional') {
            const emotionalKeywords = this.getEmotionalKeywords(memoryItem.emotion);
            const hasEmotionalContent = emotionalKeywords.some(k => msgLower.includes(k));
            resonanceScore = hasEmotionalContent ? 0.6 : 0;
        }
        
        // Weighted combination
        return (recencyScore * 0.3) + (frequencyScore * 0.2) + (resonanceScore * 0.5);
    }
    
    // Get keywords associated with a topic
    getTopicKeywords(topic) {
        const topicMap = {
            work: ['work', 'job', 'meeting', 'project', 'deadline', 'boss', 'team', 'office'],
            health: ['health', 'doctor', 'sick', 'tired', 'sleep', 'exercise', 'gym'],
            family: ['family', 'dad', 'mom', 'father', 'mother', 'parent', 'brother', 'sister'],
            tech: ['code', 'programming', 'app', 'software', 'build', 'debug', 'computer'],
            philosophy: ['meaning', 'purpose', 'think', 'believe', 'feel', 'understand', 'why']
        };
        return topicMap[topic] || [topic];
    }
    
    // Get keywords associated with emotions
    getEmotionalKeywords(emotion) {
        const emotionMap = {
            positive: ['happy', 'good', 'great', 'excited', 'joy', 'pleased'],
            negative: ['sad', 'angry', 'frustrated', 'upset', 'worried', 'stressed'],
            stressed: ['overwhelmed', 'pressure', 'busy', 'tired', 'exhausted'],
            contemplative: ['thinking', 'wondering', 'considering', 'reflecting']
        };
        return emotionMap[emotion] || [emotion];
    }
    
    // Estimate token count (rough: 1 token ≈ 4 characters)
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    
    // Compress memory item based on its relevance score
    compressMemoryItem(item, score) {
        try {
            // If it's a raw string, return it trimmed.
            if (typeof item === 'string') {
                const s = item.trim();
                return s.length ? s : '';
            }
            // Defensive check
            if (!item || typeof item !== 'object') {
                return '';
            }
            // Extract common fields
            const name = (item.name || '').toString().trim();
            const sentiment = (item.sentiment || '').toString().trim();
            const summary = (item.summary || '').toString().trim();
            const thread = (item.thread || '').toString().trim();
            const keyword = (item.keyword || '').toString().trim();

            // Prefer explicit summary
            if (summary) {
                return (score > 0.7) ? ('Recent: ' + summary) : summary;
            }
            // Thread continuation
            if (thread) {
                return 'Continuing: ' + thread;
            }
            // Person mention
            if (name) {
                if (score > 0.8) return name + (sentiment ? ' (' + sentiment + ' dynamic)' : '') + ' frequently discussed';
                if (score > 0.6) return name + (sentiment ? ' (' + sentiment + ')' : '') + ' mentioned';
                return name + ' relevant';
            }
            // Fallbacks
            if (keyword) return 'Recent: ' + keyword;
            if (item.topic)  return 'Topic: '  + String(item.topic).trim();
            if (item.person) return 'Person: ' + String(item.person).trim();
            if (item.title)  return String(item.title).trim();
            // Last resort: join up to two small fields
            const fields = ['topic','person','title','description','note'];
            const parts = [];
            for (let i = 0; i < fields.length; i++) {
                const k = fields[i];
                if (item[k]) parts.push(k + ': ' + String(item[k]).toString().trim());
                if (parts.length >= 2) break;
            }
            return parts.join(' ').trim();
        } catch (e) {
            return '';
        }
    }
    
    // Main method: Generate compressed context for prompt injection
    async generateCompressedContext(currentMessage = '', maxTokens = 16000) {
        const candidates = [];
        
        // Get dominant pattern
        const pattern = this.getDominantPattern(7);
        if (pattern) {
            candidates.push({
                type: 'pattern',
                content: pattern,
                score: this.calculateRelevance(
                    { type: 'emotional', emotion: pattern.summary, count: pattern.count },
                    currentMessage
                )
            });
        }
        
        // Get key person
        const keyPerson = this.getKeyPerson(7);
        if (keyPerson) {
            candidates.push({
                type: 'person',
                content: keyPerson,
                score: this.calculateRelevance(
                    { type: 'person', name: keyPerson.name, count: keyPerson.mentions },
                    currentMessage
                )
            });
        }
        
        // Get active thread
        const thread = this.getActiveThread(3);
        if (thread) {
            candidates.push({
                type: 'thread',
                content: thread,
                score: thread.weight
            });
        }
        
        // Sort by relevance score
        candidates.sort((a, b) => b.score - a.score);
        
        // Build context string within token budget
        let context = '[Context: ';
        let tokensUsed = 10; // Account for wrapper
        
        for (const candidate of candidates) {
            if (candidate.score < this.RELEVANCE_THRESHOLD) continue;
            
            const compressed = this.compressMemoryItem(candidate.content, candidate.score);
            if (!compressed || !compressed.trim()) { continue; }
            const itemTokens = this.estimateTokens(compressed);
            
            if (tokensUsed + itemTokens + 2 <= maxTokens) {
                if (tokensUsed > 10) context += ' ';
                context += compressed + '.';
                tokensUsed += itemTokens + 2;
            }
        }
        
        // Only return context if we have something meaningful
        if (tokensUsed > 10) {
            context += ']';
            return context;
        }
        
        return ''; // Return empty if no relevant context
    }
    
    // ============= EXISTING METHODS CONTINUE BELOW =============
    
    // Process new messages and learn
    async processMessages(messages) {
        // Update immediate memory (append new messages, keep historical context, deduplicate)
        const allMessages = [...this.layers.immediate, ...messages];
        const uniqueMessages = [];
        const seen = new Set();
        
        for (const msg of allMessages) {
            const key = `${msg.sender}:${msg.text}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMessages.push(msg);
            }
        }
        
        // GROK4'S FIRE SANITIZER - clean fire themes from new messages
        const sanitizedUniqueMessages = uniqueMessages.slice(-50).map(msg => {
            if (msg.sender === 'clint' && msg.text) {
                return { ...msg, text: sanitizeText(msg.text) };
            }
            return msg;
        });
        
        this.layers.immediate = sanitizedUniqueMessages;
        
        // Extract patterns and update profile
        for (const msg of messages) {
            if (msg.sender === 'user') {
                await this.analyzeMessage(msg);
            }
        }
        
        // Update patterns based on aggregate data
        await this.updatePatterns(messages);
        
        // Generate new insights if enough data
        if (messages.length > 50) {
            await this.generateInsights(messages);
        }
        
        // Save updated memory
        await this.saveMemory();
    }
    
    // Analyze individual message for learning
    async analyzeMessage(msg) {
        const text = msg.text.toLowerCase();
        const time = new Date(msg.timestamp);
        
        // Extract entities and update profile
        
        // 1. People mentioned (dad, mom, sarah, etc.)
        const peoplePatterns = [
            /\b(dad|father|mom|mother|brother|sister|wife|husband|son|daughter|friend)\b/gi,
            /\b([A-Z][a-z]+)\b/g  // Proper names
        ];
        
        peoplePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(person => {
                    if (!this.layers.profile.people_mentioned[person]) {
                        this.layers.profile.people_mentioned[person] = {
                            first_mentioned: time,
                            mention_count: 0,
                            contexts: []
                        };
                    }
                    this.layers.profile.people_mentioned[person].mention_count++;
                    this.layers.profile.people_mentioned[person].last_mentioned = time;
                });
            }
        });
        
        // 2. Emotional indicators
        const emotions = {
            positive: ['happy', 'good', 'great', 'excellent', 'excited', 'love'],
            negative: ['sad', 'angry', 'frustrated', 'tired', 'stressed', 'worried'],
            neutral: ['okay', 'fine', 'alright']
        };
        
        Object.keys(emotions).forEach(sentiment => {
            emotions[sentiment].forEach(word => {
                if (text.includes(word)) {
                    if (!this.layers.profile) {
                        this.layers.profile = {};
                    }
                    if (!this.layers.profile.emotional_patterns) {
                        this.layers.profile.emotional_patterns = {};
                    }
                    if (!this.layers.profile.emotional_patterns[sentiment]) {
                        this.layers.profile.emotional_patterns[sentiment] = [];
                    }
                    this.layers.profile.emotional_patterns[sentiment].push({
                        time: time,
                        context: msg.text.substring(0, 100)
                    });
                }
            });
        });
        
        // 3. Enhanced topics and interests taxonomy
        const topics = {
            work: ['work', 'job', 'meeting', 'project', 'deadline', 'boss', 'team', 'career', 'business', 'client', 'colleague', 'office', 'task', 'goal', 'objective'],
            health: ['gym', 'workout', 'run', 'health', 'doctor', 'sleep', 'exercise', 'fitness', 'wellness', 'medical', 'therapy', 'mental', 'physical', 'stress', 'energy'],
            tech: ['code', 'programming', 'app', 'software', 'debug', 'api', 'computer', 'technology', 'digital', 'system', 'algorithm', 'data', 'database', 'server', 'clint', 'ai', 'artificial intelligence', 'machine learning'],
            family: ['family', 'dad', 'mom', 'parent', 'brother', 'sister', 'relative', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin', 'spouse', 'partner', 'child', 'son', 'daughter'],
            philosophy: ['meaning', 'purpose', 'think', 'believe', 'feel', 'understand', 'wisdom', 'truth', 'reality', 'existence', 'consciousness', 'mind', 'soul', 'spirit', 'values', 'principles', 'morals', 'ethics'],
            productivity: ['productivity', 'efficiency', 'organization', 'planning', 'schedule', 'time management', 'focus', 'concentration', 'habits', 'routine', 'system', 'method', 'approach', 'strategy'],
            creativity: ['creative', 'art', 'music', 'writing', 'design', 'inspiration', 'imagination', 'innovation', 'ideas', 'brainstorming', 'expression', 'artistic'],
            relationships: ['friend', 'friendship', 'relationship', 'connection', 'social', 'community', 'support', 'trust', 'love', 'care', 'companionship', 'loneliness'],
            learning: ['learn', 'learning', 'study', 'education', 'knowledge', 'skill', 'experience', 'growth', 'development', 'improvement', 'practice', 'training'],
            travel: ['travel', 'trip', 'vacation', 'journey', 'adventure', 'explore', 'visit', 'destination', 'flight', 'hotel', 'experience'],
            food: ['food', 'eating', 'meal', 'cooking', 'recipe', 'restaurant', 'dinner', 'lunch', 'breakfast', 'hungry', 'taste', 'flavor'],
            entertainment: ['movie', 'film', 'book', 'reading', 'game', 'gaming', 'music', 'show', 'television', 'tv', 'entertainment', 'fun', 'enjoyment'],
            home: ['home', 'house', 'apartment', 'living', 'space', 'room', 'furniture', 'decor', 'comfort', 'cozy', 'personal'],
            nature: ['nature', 'outdoor', 'outside', 'park', 'garden', 'tree', 'flower', 'mountain', 'ocean', 'beach', 'hiking', 'walking'],
            money: ['money', 'financial', 'budget', 'cost', 'price', 'expensive', 'cheap', 'investment', 'saving', 'spending', 'income', 'salary'],
            future: ['future', 'tomorrow', 'next', 'later', 'plan', 'goal', 'dream', 'aspiration', 'hope', 'expectation', 'anticipation']
        };
        
        Object.keys(topics).forEach(topic => {
            topics[topic].forEach(word => {
                if (text.includes(word)) {
                    if (!this.layers.patterns.topics[topic]) {
                        this.layers.patterns.topics[topic] = {
                            count: 0,
                            last_discussed: null,
                            contexts: []
                        };
                    }
                    this.layers.patterns.topics[topic].count++;
                    this.layers.patterns.topics[topic].last_discussed = time;
                }
            });
        });
        
        // 4. Time patterns
        const hour = time.getHours();
        const dayOfWeek = time.getDay();
        
        if (!this.layers.patterns.daily_routines) {
            this.layers.patterns.daily_routines = {};
        }
        if (!this.layers.patterns.daily_routines[hour]) {
            this.layers.patterns.daily_routines[hour] = [];
        }
        this.layers.patterns.daily_routines[hour].push({
            type: this.categorizeMessage(text),
            day: dayOfWeek
        });
    }
    
    // Categorize message type
    categorizeMessage(text) {
        if (text.includes('?')) return 'question';
        if (text.match(/\b(need to|should|must|have to)\b/)) return 'task';
        if (text.length > 100) return 'reflection';
        if (text.match(/\b(feel|felt|feeling)\b/)) return 'emotional';
        return 'statement';
    }
    
    // Update behavioral patterns
    async updatePatterns(messages) {
        // Conversation frequency patterns
        const messagesByDay = {};
        messages.forEach(msg => {
            const day = new Date(msg.timestamp).toDateString();
            if (!messagesByDay[day]) messagesByDay[day] = 0;
            messagesByDay[day]++;
        });
        
        // Calculate average messages per day
        const avgMessages = Object.values(messagesByDay).reduce((a, b) => a + b, 0) / Object.keys(messagesByDay).length;
        
        this.layers.patterns.engagement = {
            average_daily_messages: Math.round(avgMessages),
            most_active_hour: this.findMostActiveHour(),
            conversation_style: this.analyzeConversationStyle(messages),
            updated: new Date()
        };
    }
    
    // Find when user is most active
    findMostActiveHour() {
        const hourCounts = {};
        if (this.layers.patterns.daily_routines) {
            Object.keys(this.layers.patterns.daily_routines).forEach(hour => {
                hourCounts[hour] = this.layers.patterns.daily_routines[hour].length;
            });
        }
        
        return Object.keys(hourCounts).reduce((a, b) => 
            hourCounts[a] > hourCounts[b] ? a : b, '12');
    }
    
    // Analyze how the user communicates
    analyzeConversationStyle(messages) {
        const userMessages = messages.filter(m => m.sender === 'user');
        const avgLength = userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length;
        
        return {
            average_message_length: Math.round(avgLength),
            prefers_short: avgLength < 50,
            uses_questions: userMessages.filter(m => m.text.includes('?')).length / userMessages.length,
            reflective: userMessages.filter(m => m.text.length > 100).length / userMessages.length
        };
    }
    
    // Generate deep insights
    async generateInsights(messages) {
        const insights = [];
        
        // Insight 1: Communication pattern
        if (this.layers.patterns.engagement?.average_daily_messages > 20) {
            insights.push({
                type: 'engagement',
                insight: 'High engagement user - benefits from daily reflection',
                confidence: 0.8
            });
        }
        
        // Insight 2: Emotional patterns
        const emotions = this.layers.profile?.emotional_patterns || {};
        if (emotions.positive?.length > emotions.negative?.length * 2) {
            insights.push({
                type: 'emotional',
                insight: 'Generally positive outlook with constructive mindset',
                confidence: 0.7
            });
        }
        
        // Insight 3: Topic preferences
        const topTopics = Object.keys(this.layers.patterns.topics || {})
            .sort((a, b) => (this.layers.patterns.topics[b]?.count || 0) - (this.layers.patterns.topics[a]?.count || 0))
            .slice(0, 3);
        
        if (topTopics.length > 0) {
            insights.push({
                type: 'interests',
                insight: `Primary focus areas: ${topTopics.join(', ')}`,
                confidence: 0.9
            });
        }
        
        // Insight 4: Task patterns
        const taskMessages = messages.filter(m => 
            m.text.match(/\b(need to|should|must|have to|remind me)\b/)
        );
        
        if (taskMessages.length > messages.length * 0.2) {
            insights.push({
                type: 'productivity',
                insight: 'Task-oriented with focus on getting things done',
                confidence: 0.75
            });
        }
        
        this.layers.wisdom = insights;
    }
    
    // Add a durable wisdom insight (lightweight persistence)
    async addWisdomInsight(insight) {
        try {
            if (!this.layers.wisdom || !Array.isArray(this.layers.wisdom)) {
                this.layers.wisdom = [];
            }
            // Minimal de-dupe by insight text/type
            const key = (insight && (insight.insight || insight.text || JSON.stringify(insight))).slice(0, 200);
            const exists = this.layers.wisdom.some(w => (w.insight || w.text) === key);
            if (!exists) {
                const entry = Object.assign(
                    { type: 'model_proposed', confidence: 0.6, created_at: new Date().toISOString() },
                    typeof insight === 'object' ? insight : { insight: String(insight) }
                );
                if (!entry.insight && entry.text) entry.insight = entry.text;
                this.layers.wisdom.push(entry);
                await this.saveMemory();
            }
        } catch (e) {
            // swallow errors to avoid breaking chat
        }
    }
    
    // Create context for the next conversation (preserved for compatibility)
    async buildContext() {
        const context = {
            immediate_context: this.layers.immediate.length > 0 ? 
                this.layers.immediate.slice(-10).map(m => ({
                    sender: m.sender,
                    text: m.text.substring(0, 500) // Increased from 100 to 500 characters
                })) : 
                (this.layers.recent?.immediate_context || []).slice(-10),
            
            user_profile: {
                known_people: Object.keys(this.layers.profile.people_mentioned || {})
                    .filter(p => this.layers.profile.people_mentioned[p].mention_count > 2),
                frequent_topics: Object.keys(this.layers.patterns.topics || {})
                    .filter(t => this.layers.patterns.topics[t].count > 0),
                communication_style: this.layers.patterns.engagement?.conversation_style,
                emotional_state: this.getRecentEmotionalState()
            },
            
            insights: this.layers.wisdom.filter(i => i.confidence > 0.7),
            
            patterns: {
                most_active_time: this.layers.patterns.engagement?.most_active_hour,
                recurring_tasks: this.getRecurringTasks()
            }
        };
        
        return context;
    }
    
    // Get recent emotional state
    getRecentEmotionalState() {
        const recent = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
        const recentEmotions = {};
        
        Object.keys(this.layers.profile.emotional_patterns || {}).forEach(emotion => {
            const recentOccurrences = this.layers.profile.emotional_patterns[emotion]
                .filter(e => new Date(e.time).getTime() > recent);
            if (recentOccurrences.length > 0) {
                recentEmotions[emotion] = recentOccurrences.length;
            }
        });
        
        return recentEmotions;
    }
    
    // Identify recurring tasks
    getRecurringTasks() {
        const tasks = {};
        
        // Analyze task patterns from messages
        // This would be more sophisticated in production
        return tasks;
    }
    
    // Save memory to disk
    async saveMemory() {
        // Save profile
        await fs.writeFile(
            this.profilePath,
            JSON.stringify(this.layers.profile, null, 2),
            'utf8'
        );
        
        // Save patterns
        await fs.writeFile(
            this.patternsPath,
            JSON.stringify(this.layers.patterns, null, 2),
            'utf8'
        );
        
        // Save current context for next session
        const contextFile = path.join(
            this.contextPath,
            `context_${new Date().toISOString().split('T')[0]}.json`
        );
        
        await fs.writeFile(
            contextFile,
            JSON.stringify(await this.buildContext(), null, 2),
            'utf8'
        );
    }
    
    // Load recent context for continuity
    async loadRecentContext() {
        try {
            const files = await fs.readdir(this.contextPath);
            const sortedFiles = files.sort().reverse();
            
            if (sortedFiles.length > 0) {
                const latestContext = await fs.readFile(
                    path.join(this.contextPath, sortedFiles[0]),
                    'utf8'
                );
                
                this.layers.recent = JSON.parse(latestContext);
            }
        } catch (e) {
            console.log('No previous context found');
        }
    }
    
    // Load immediate layer with historical data for better retrieval
    async loadImmediateFromHistory() {
        try {
            const files = await fs.readdir(this.contextPath);
            const sortedFiles = files.sort().reverse();
            
            // Load last few context files to populate immediate layer
            const messages = [];
            for (let i = 0; i < Math.min(3, sortedFiles.length); i++) {
                try {
                    const contextData = await fs.readFile(
                        path.join(this.contextPath, sortedFiles[i]),
                        'utf8'
                    );
                    const context = JSON.parse(contextData);
                    if (context.immediate_context) {
                        context.immediate_context.forEach(msg => {
                            messages.push({
                                sender: msg.sender,
                                text: msg.text,
                                timestamp: new Date()
                            });
                        });
                    }
                } catch (e) {
                    // Skip corrupted files
                }
            }
            
            // Set immediate layer to last 20 messages from history
            // GROK4'S FIRE SANITIZER - clean fire themes from historical messages
            const sanitizedMessages = messages.slice(-20).map(msg => {
                if (msg.sender === 'clint' && msg.text) {
                    return { ...msg, text: sanitizeText(msg.text) };
                }
                return msg;
            });
            
            this.layers.immediate = sanitizedMessages;
            console.log(`[Memory] Loaded ${this.layers.immediate.length} historical messages into immediate layer (sanitized)`);
            
            // Also load historical profile data from the richest context file
            if (sortedFiles.length > 0) {
                try {
                    // Find the context file with the richest profile data
                    let richestContext = null;
                    let maxTopics = 0;
                    
                    for (const file of sortedFiles.slice(0, 3)) { // Check last 3 files
                        try {
                            const contextData = await fs.readFile(
                                path.join(this.contextPath, file),
                                'utf8'
                            );
                            const context = JSON.parse(contextData);
                            
                            const topicCount = context.user_profile?.frequent_topics?.length || 0;
                            if (topicCount > maxTopics) {
                                maxTopics = topicCount;
                                richestContext = context;
                            }
                        } catch (e) {
                            // Skip corrupted files
                        }
                    }
                    
                    if (richestContext && richestContext.user_profile) {
                        // Merge historical profile data with current patterns
                        if (richestContext.user_profile.frequent_topics) {
                            this.layers.patterns.topics = richestContext.user_profile.frequent_topics.reduce((acc, topic) => {
                                acc[topic] = { count: 5, last_discussed: new Date().toISOString() };
                                return acc;
                            }, this.layers.patterns.topics || {});
                        }
                        
                        if (richestContext.user_profile.communication_style) {
                            this.layers.patterns.engagement = {
                                ...this.layers.patterns.engagement,
                                conversation_style: richestContext.user_profile.communication_style
                            };
                        }
                        
                        // Also load known people into profile layer
                        if (richestContext.user_profile.known_people) {
                            this.layers.profile.people_mentioned = richestContext.user_profile.known_people.reduce((acc, person) => {
                                acc[person] = { mention_count: 3, last_mentioned: new Date().toISOString() };
                                return acc;
                            }, this.layers.profile.people_mentioned || {});
                        }
                        
                        console.log(`[Memory] Loaded historical profile data: topics=${richestContext.user_profile.frequent_topics?.length || 0}, people=${richestContext.user_profile.known_people?.length || 0}`);
                    }
                } catch (e) {
                    console.log('[Memory] Could not load historical profile data');
                }
            }
            
        } catch (e) {
            console.log('[Memory] No historical context files found for immediate layer');
        }
    }
    
    // DEPRECATED: Use generateCompressedContext instead
    // Keeping for backward compatibility
    async generatePromptContext() {
        // Redirect to new compressed version
        return this.generateCompressedContext('', this.TOKEN_BUDGET);
    }

    // ============= PROFILE INTEGRATION METHODS =============
    
    // Enhance memory with profile-specific context
    async enhanceWithProfile(activeProfile, message) {
        if (!this.profileManager || !activeProfile) {
            return;
        }

        try {
            // Get profile data
            const profile = await this.profileManager.getProfile(activeProfile);
            if (!profile) return;

            // Enhance patterns layer with profile patterns
            if (profile.patterns && profile.patterns.length > 0) {
                const recentPatterns = profile.patterns.slice(-5); // Last 5 patterns
                this.layers.patterns.profile_patterns = recentPatterns.map(p => ({
                    note: p.note,
                    relation: p.relation,
                    emotional: p.emotional,
                    timestamp: p.event
                }));
            }

            // Enhance profile layer with profile-specific data
            if (profile.toneBaseline) {
                this.layers.profile.tone_baseline = profile.toneBaseline;
            }

            // Add profile-specific communication style
            if (profile.recurs > 10) { // Established user
                this.layers.profile.communication_style = {
                    established_user: true,
                    interaction_count: profile.recurs,
                    last_seen: profile.lastSeen
                };
            }

            console.log(`[Memory] Enhanced memory with profile data for ${activeProfile}`);

        } catch (error) {
            console.error('[Memory] Error enhancing with profile:', error.message);
        }
    }

    // Get profile-aware context fragments
    async getProfileAwareFragments(activeProfile, message) {
        const fragments = [];

        try {
            // Get profile summary
            const profileSummary = await this.profileManager.getProfileSummary(activeProfile);
            if (profileSummary) {
                fragments.push({
                    ts: 'profile',
                    content: `User profile: ${profileSummary.id} (${profileSummary.recurs} interactions)`,
                    relevance: 0.8,
                    source: 'profile_manager'
                });

                // Add recent patterns if available
                if (profileSummary.summary && profileSummary.summary !== "No recent patterns") {
                    fragments.push({
                        ts: 'profile',
                        content: `Recent patterns: ${profileSummary.summary}`,
                        relevance: 0.6,
                        source: 'profile_manager'
                    });
                }
            }

            // Add profile-specific memory fragments
            if (this.layers.patterns.profile_patterns) {
                const recentPattern = this.layers.patterns.profile_patterns[this.layers.patterns.profile_patterns.length - 1];
                if (recentPattern) {
                    fragments.push({
                        ts: 'profile',
                        content: `Last interaction: ${recentPattern.note}`,
                        relevance: 0.5,
                        source: 'profile_memory'
                    });
                }
            }

            // Add actual conversation history for the active profile
            if (this.sessionManager && typeof this.sessionManager.getProfileMessages === 'function') {
                console.log(`[Memory] Getting conversation history for profile: ${activeProfile}`);
                const recentMessages = this.sessionManager.getProfileMessages(activeProfile).slice(-5);
                console.log(`[Memory] Retrieved ${recentMessages.length} messages for ${activeProfile}`);
                recentMessages.forEach(msg => {
                    if (msg.text && msg.text.length > 10) {
                        console.log(`[Memory] Adding conversation fragment: ${msg.text.substring(0, 50)}...`);
                        fragments.push({
                            ts: 'conversation',
                            content: msg.text,
                            relevance: 0.7,
                            source: 'conversation_history'
                        });
                    }
                });
            } else {
                console.log(`[Memory] Session manager not available or getProfileMessages not a function`);
            }

        } catch (error) {
            console.error('[Memory] Error getting profile-aware fragments:', error.message);
        }

        return fragments;
    }
}

module.exports = ClintMemory;