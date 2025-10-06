/**
 * Semantic Memory System
 * Implements intelligent memory retrieval with vector embeddings, semantic clustering,
 * temporal intelligence, cross-reference search, and contextual ranking
 */

const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

class SemanticMemory {
    constructor(storagePath, openaiClient) {
        this.storagePath = storagePath;
        this.memoryPath = path.join(storagePath, 'semantic_memory');
        this.embeddingsPath = path.join(this.memoryPath, 'embeddings.json');
        this.clustersPath = path.join(this.memoryPath, 'clusters.json');
        this.openai = openaiClient;
        
        // Memory storage
        this.embeddings = new Map(); // memory_id -> embedding vector
        this.memoryIndex = new Map(); // memory_id -> memory object
        this.clusters = new Map(); // cluster_id -> cluster object
        this.temporalIndex = new Map(); // timestamp -> memory_ids
        
        // Configuration
        this.embeddingModel = 'text-embedding-3-small';
        this.maxTokens = 8191; // OpenAI embedding limit
        this.clusterThreshold = 0.7; // Similarity threshold for clustering
        this.maxClusters = 50;
        
        // Diversity monitoring to prevent robot obsession
        this.robotKeywords = ['robot', 'servo', 'command', 'movement', 'tonypi', 'servo', 'motor', 'sensor'];
        this.maxRobotClusterRatio = 0.6; // Max 60% robot clusters (more reasonable for robot-integrated system)
        
        // Temporal patterns
        this.temporalPatterns = {
            'last week': -7,
            'last month': -30,
            'recently': -7,
            'yesterday': -1,
            'last time': -1,
            'earlier today': -0.5,
            'this morning': -0.25,
            'before the meeting': -0.1
        };
    }

    async initialize() {
        try {
            // Ensure directory exists
            await fs.mkdir(this.memoryPath, { recursive: true });
            
            // Load existing data
            await this.loadEmbeddings();
            await this.loadClusters();
            
            console.log('[SemanticMemory] Initialized with', this.embeddings.size, 'embeddings and', this.clusters.size, 'clusters');
        } catch (error) {
            console.error('[SemanticMemory] Initialization error:', error.message);
        }
    }

    /**
     * Add a memory with automatic embedding and clustering
     */
    async addMemory(memory) {
        try {
            const memoryId = this.generateMemoryId(memory);
            
            // Generate embedding
            const embedding = await this.generateEmbedding(memory.text);
            
            // Store in memory index
            const memoryObject = {
                id: memoryId,
                text: memory.text,
                timestamp: memory.timestamp || new Date(),
                type: memory.type || 'conversation',
                metadata: memory.metadata || {},
                embedding: embedding,
                clusterId: null
            };
            
            this.memoryIndex.set(memoryId, memoryObject);
            this.embeddings.set(memoryId, embedding);
            
            // Add to temporal index
            const timeKey = this.getTimeKey(memoryObject.timestamp);
            if (!this.temporalIndex.has(timeKey)) {
                this.temporalIndex.set(timeKey, []);
            }
            this.temporalIndex.get(timeKey).push(memoryId);
            
            // Cluster the memory
            await this.clusterMemory(memoryObject);
            
            // Save to disk
            await this.saveEmbeddings();
            await this.saveClusters();
            
            return memoryObject;
            
        } catch (error) {
            console.error('[SemanticMemory] Error adding memory:', error.message);
            throw error;
        }
    }

    /**
     * Generate embedding for text using OpenAI
     */
    async generateEmbedding(text) {
        try {
            // Truncate text if too long
            const truncatedText = text.length > this.maxTokens ? 
                text.substring(0, this.maxTokens) : text;
            
            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: truncatedText
            });
            
            return response.data[0].embedding;
            
        } catch (error) {
            console.error('[SemanticMemory] Error generating embedding:', error.message);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Cluster a memory based on semantic similarity
     */
    async clusterMemory(memory) {
        try {
            // Check memory diversity before clustering
            await this.ensureMemoryDiversity();
            
            let bestCluster = null;
            let bestSimilarity = 0;
            
            // Find most similar cluster
            for (const [clusterId, cluster] of this.clusters) {
                if (cluster.centroid && cluster.memoryIds.length > 0) {
                    const similarity = this.cosineSimilarity(memory.embedding, cluster.centroid);
                    if (similarity > bestSimilarity && similarity > this.clusterThreshold) {
                        bestSimilarity = similarity;
                        bestCluster = clusterId;
                    }
                }
            }
            
            if (bestCluster) {
                // Add to existing cluster
                const cluster = this.clusters.get(bestCluster);
                cluster.memoryIds.push(memory.id);
                cluster.updated = new Date();
                
                // Update centroid
                cluster.centroid = this.updateCentroid(cluster);
                memory.clusterId = bestCluster;
                
            } else {
                // Create new cluster
                const clusterId = this.generateClusterId();
                const cluster = {
                    id: clusterId,
                    memoryIds: [memory.id],
                    centroid: memory.embedding.slice(), // Copy the embedding
                    keywords: this.extractKeywords(memory.text),
                    created: new Date(),
                    updated: new Date(),
                    type: memory.type
                };
                
                this.clusters.set(clusterId, cluster);
                memory.clusterId = clusterId;
            }
            
        } catch (error) {
            console.error('[SemanticMemory] Error clustering memory:', error.message);
        }
    }

    /**
     * Ensure memory diversity to prevent robot obsession
     */
    async ensureMemoryDiversity() {
        try {
            const robotClusters = Array.from(this.clusters.values()).filter(
                cluster => cluster.keywords && cluster.keywords.some(keyword => 
                    this.robotKeywords.includes(keyword.toLowerCase())
                )
            );
            
            const totalClusters = this.clusters.size;
            const robotClusterRatio = totalClusters > 0 ? robotClusters.length / totalClusters : 0;
            
            if (robotClusterRatio > this.maxRobotClusterRatio) {
                console.warn(`[SemanticMemory] Too many robot clusters (${robotClusterRatio.toFixed(2)}), rebalancing`);
                await this.rebalanceClusters();
            }
            
            return robotClusterRatio;
        } catch (error) {
            console.error('[SemanticMemory] Error ensuring memory diversity:', error.message);
            return 0;
        }
    }

    /**
     * Rebalance clusters to reduce robot obsession
     */
    async rebalanceClusters() {
        try {
            const robotClusters = Array.from(this.clusters.values()).filter(
                cluster => cluster.keywords && cluster.keywords.some(keyword => 
                    this.robotKeywords.includes(keyword.toLowerCase())
                )
            );
            
            // Merge similar robot clusters to reduce ratio
            const maxRobotClusters = Math.floor(totalClusters * this.maxRobotClusterRatio);
            if (robotClusters.length > maxRobotClusters) {
                const clustersToMerge = robotClusters.slice(0, robotClusters.length - maxRobotClusters);
                const targetCluster = robotClusters[robotClusters.length - 1];
                
                for (const cluster of clustersToMerge) {
                    // Move memories to target cluster
                    targetCluster.memoryIds.push(...cluster.memoryIds);
                    targetCluster.keywords = [...new Set([...targetCluster.keywords, ...cluster.keywords])];
                    
                    // Remove the merged cluster
                    this.clusters.delete(cluster.id);
                }
                
                // Update target cluster centroid
                targetCluster.centroid = this.updateCentroid(targetCluster);
                targetCluster.updated = new Date();
                
                console.log(`[SemanticMemory] Merged ${clustersToMerge.length} robot clusters to reduce ratio`);
            }
            
            await this.saveClusters();
        } catch (error) {
            console.error('[SemanticMemory] Error rebalancing clusters:', error.message);
        }
    }

    /**
     * Update cluster centroid based on all memories in cluster
     */
    updateCentroid(cluster) {
        if (cluster.memoryIds.length === 0) return null;
        
        const embeddings = cluster.memoryIds.map(id => this.embeddings.get(id)).filter(e => e);
        if (embeddings.length === 0) return null;
        
        const centroid = new Array(embeddings[0].length).fill(0);
        
        // Average all embeddings
        for (const embedding of embeddings) {
            for (let i = 0; i < embedding.length; i++) {
                centroid[i] += embedding[i];
            }
        }
        
        // Normalize
        for (let i = 0; i < centroid.length; i++) {
            centroid[i] /= embeddings.length;
        }
        
        return centroid;
    }

    /**
     * Semantic search with cross-reference capabilities
     */
    async semanticSearch(query, options = {}) {
        try {
            const {
                maxResults = 10,
                includeClusters = true,
                temporalFilter = null,
                typeFilter = null,
                minSimilarity = 0.3
            } = options;
            
            // Generate query embedding
            const queryEmbedding = await this.generateEmbedding(query);
            
            // Search all memories
            const results = [];
            
            for (const [memoryId, memory] of this.memoryIndex) {
                // Apply filters
                if (typeFilter && memory.type !== typeFilter) continue;
                if (temporalFilter && !this.matchesTemporalFilter(memory.timestamp, temporalFilter)) continue;
                
                // Calculate similarity
                const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
                
                if (similarity >= minSimilarity) {
                    results.push({
                        memory,
                        similarity,
                        relevanceScore: this.calculateRelevanceScore(memory, query, similarity)
                    });
                }
            }
            
            // Sort by relevance score
            results.sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            // Add cluster information if requested
            if (includeClusters) {
                for (const result of results) {
                    if (result.memory.clusterId) {
                        const cluster = this.clusters.get(result.memory.clusterId);
                        result.cluster = cluster;
                        result.relatedMemories = cluster.memoryIds
                            .filter(id => id !== result.memory.id)
                            .slice(0, 3)
                            .map(id => this.memoryIndex.get(id))
                            .filter(m => m);
                    }
                }
            }
            
            return results.slice(0, maxResults);
            
        } catch (error) {
            console.error('[SemanticMemory] Error in semantic search:', error.message);
            return [];
        }
    }

    /**
     * Temporal intelligence - understand relative time references
     */
    parseTemporalReference(text) {
        const lower = text.toLowerCase();
        
        for (const [pattern, daysOffset] of Object.entries(this.temporalPatterns)) {
            if (lower.includes(pattern)) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + daysOffset);
                return {
                    pattern,
                    daysOffset,
                    targetDate,
                    type: 'relative'
                };
            }
        }
        
        // Parse absolute dates
        const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
        if (dateMatch) {
            const [, month, day, year] = dateMatch;
            return {
                pattern: dateMatch[0],
                targetDate: new Date(year, month - 1, day),
                type: 'absolute'
            };
        }
        
        return null;
    }

    /**
     * Check if memory matches temporal filter
     */
    matchesTemporalFilter(timestamp, temporalFilter) {
        if (!temporalFilter) return true;
        
        const memoryDate = new Date(timestamp);
        
        if (temporalFilter.type === 'relative') {
            const now = new Date();
            const daysDiff = (now - memoryDate) / (1000 * 60 * 60 * 24);
            return Math.abs(daysDiff - Math.abs(temporalFilter.daysOffset)) <= 1;
        }
        
        if (temporalFilter.type === 'absolute') {
            const targetDate = new Date(temporalFilter.targetDate);
            const daysDiff = Math.abs(targetDate - memoryDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 1;
        }
        
        return true;
    }

    /**
     * Calculate comprehensive relevance score
     */
    calculateRelevanceScore(memory, query, similarity) {
        // Base similarity score (0-1)
        let score = similarity;
        
        // Recency boost (more recent = higher score)
        const ageInDays = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.exp(-ageInDays / 30); // Exponential decay over 30 days
        score += recencyBoost * 0.2;
        
        // Importance boost based on metadata
        if (memory.metadata.importance) {
            score += memory.metadata.importance * 0.1;
        }
        
        // Keyword match boost
        const keywordMatches = this.countKeywordMatches(memory.text, query);
        score += keywordMatches * 0.05;
        
        // Cluster size boost (memories in larger clusters are more relevant)
        if (memory.clusterId) {
            const cluster = this.clusters.get(memory.clusterId);
            if (cluster && cluster.memoryIds.length > 1) {
                score += Math.min(cluster.memoryIds.length * 0.01, 0.1);
            }
        }
        
        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Count keyword matches between memory and query
     */
    countKeywordMatches(memoryText, query) {
        const memoryWords = memoryText.toLowerCase().split(/\s+/);
        const queryWords = query.toLowerCase().split(/\s+/);
        
        let matches = 0;
        for (const queryWord of queryWords) {
            if (memoryWords.includes(queryWord)) {
                matches++;
            }
        }
        
        return matches;
    }

    /**
     * Extract keywords from text
     */
    extractKeywords(text) {
        // Simple keyword extraction - could be enhanced with NLP
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !this.isStopWord(word));
        
        // Count frequency
        const wordCount = {};
        for (const word of words) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
        
        // Return top keywords
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    /**
     * Check if word is a stop word
     */
    isStopWord(word) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ]);
        return stopWords.has(word);
    }

    /**
     * Generate unique memory ID
     */
    generateMemoryId(memory) {
        const timestamp = memory.timestamp || new Date();
        const textHash = this.simpleHash(memory.text);
        return `mem_${timestamp.getTime()}_${textHash}`;
    }

    /**
     * Generate unique cluster ID
     */
    generateClusterId() {
        return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Simple hash function
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get time key for temporal indexing
     */
    getTimeKey(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    /**
     * Load embeddings from disk
     */
    async loadEmbeddings() {
        try {
            const data = await fs.readFile(this.embeddingsPath, 'utf8');
            const parsed = JSON.parse(data);
            
            this.embeddings = new Map(Object.entries(parsed.embeddings || {}));
            this.memoryIndex = new Map(Object.entries(parsed.memoryIndex || {}));
            this.temporalIndex = new Map(Object.entries(parsed.temporalIndex || {}));
            
        } catch (error) {
            // File doesn't exist yet, start fresh
            console.log('[SemanticMemory] No existing embeddings found, starting fresh');
        }
    }

    /**
     * Save embeddings to disk
     */
    async saveEmbeddings() {
        try {
            const data = {
                embeddings: Object.fromEntries(this.embeddings),
                memoryIndex: Object.fromEntries(this.memoryIndex),
                temporalIndex: Object.fromEntries(this.temporalIndex),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.embeddingsPath, JSON.stringify(data, null, 2));
            
        } catch (error) {
            console.error('[SemanticMemory] Error saving embeddings:', error.message);
        }
    }

    /**
     * Load clusters from disk
     */
    async loadClusters() {
        try {
            const data = await fs.readFile(this.clustersPath, 'utf8');
            const parsed = JSON.parse(data);
            
            this.clusters = new Map(Object.entries(parsed.clusters || {}));
            
        } catch (error) {
            // File doesn't exist yet, start fresh
            console.log('[SemanticMemory] No existing clusters found, starting fresh');
        }
    }

    /**
     * Save clusters to disk
     */
    async saveClusters() {
        try {
            const data = {
                clusters: Object.fromEntries(this.clusters),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.clustersPath, JSON.stringify(data, null, 2));
            
        } catch (error) {
            console.error('[SemanticMemory] Error saving clusters:', error.message);
        }
    }

    /**
     * Get memory statistics
     */
    getStats() {
        return {
            totalMemories: this.memoryIndex.size,
            totalClusters: this.clusters.size,
            averageClusterSize: this.clusters.size > 0 ? 
                Array.from(this.clusters.values()).reduce((sum, cluster) => sum + cluster.memoryIds.length, 0) / this.clusters.size : 0,
            memoryTypes: this.getMemoryTypeDistribution(),
            temporalRange: this.getTemporalRange()
        };
    }

    /**
     * Get distribution of memory types
     */
    getMemoryTypeDistribution() {
        const types = {};
        for (const memory of this.memoryIndex.values()) {
            types[memory.type] = (types[memory.type] || 0) + 1;
        }
        return types;
    }

    /**
     * Get temporal range of memories
     */
    getTemporalRange() {
        const timestamps = Array.from(this.memoryIndex.values()).map(m => new Date(m.timestamp));
        if (timestamps.length === 0) return null;
        
        return {
            oldest: new Date(Math.min(...timestamps)),
            newest: new Date(Math.max(...timestamps)),
            span: Math.max(...timestamps) - Math.min(...timestamps)
        };
    }
}

module.exports = { SemanticMemory };



