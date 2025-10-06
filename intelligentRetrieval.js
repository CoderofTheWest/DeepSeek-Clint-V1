/**
 * Intelligent Memory Retrieval System
 * Integrates semantic memory with existing memory system for smart contextual retrieval
 */

const { SemanticMemory } = require('./semanticMemory');

class IntelligentRetrieval {
    constructor(storagePath, openaiClient, existingMemory) {
        this.semanticMemory = new SemanticMemory(storagePath, openaiClient);
        this.existingMemory = existingMemory; // Original memory system
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        await this.semanticMemory.initialize();
        this.initialized = true;
        
        console.log('[IntelligentRetrieval] Initialized with semantic memory system');
    }

    /**
     * Smart contextual retrieval that combines multiple intelligence layers
     */
    async retrieveContext(message, options = {}) {
        try {
            await this.initialize();
            
            const {
                maxResults = 5,
                includeSemantic = true,
                includeTraditional = true,
                includeTemporal = true,
                includeCrossReference = true
            } = options;

            const results = [];

            // 1. Semantic search for meaning-based retrieval
            if (includeSemantic) {
                const semanticResults = await this.semanticSearch(message, maxResults);
                results.push(...semanticResults.map(r => ({
                    ...r,
                    source: 'semantic',
                    intelligence: 'vector_embedding'
                })));
            }

            // 2. Traditional keyword-based search
            if (includeTraditional) {
                const traditionalResults = await this.traditionalSearch(message, maxResults);
                results.push(...traditionalResults.map(r => ({
                    ...r,
                    source: 'traditional',
                    intelligence: 'keyword_matching'
                })));
            }

            // 3. Temporal intelligence search
            if (includeTemporal) {
                const temporalResults = await this.temporalSearch(message, maxResults);
                results.push(...temporalResults.map(r => ({
                    ...r,
                    source: 'temporal',
                    intelligence: 'temporal_reasoning'
                })));
            }

            // 4. Cross-reference search
            if (includeCrossReference) {
                const crossRefResults = await this.crossReferenceSearch(message, maxResults);
                results.push(...crossRefResults.map(r => ({
                    ...r,
                    source: 'cross_reference',
                    intelligence: 'semantic_clustering'
                })));
            }

            // 5. Intelligent ranking and deduplication
            const rankedResults = this.intelligentRanking(results, message);

            return {
                fragments: rankedResults.slice(0, maxResults),
                searchTypes: {
                    semantic: results.filter(r => r.source === 'semantic').length,
                    traditional: results.filter(r => r.source === 'traditional').length,
                    temporal: results.filter(r => r.source === 'temporal').length,
                    crossReference: results.filter(r => r.source === 'cross_reference').length
                },
                intelligence: 'multi_layer'
            };

        } catch (error) {
            console.error('[IntelligentRetrieval] Error in contextual retrieval:', error.message);
            return { fragments: [], searchTypes: {}, intelligence: 'fallback' };
        }
    }

    /**
     * Semantic search using vector embeddings
     */
    async semanticSearch(message, maxResults) {
        try {
            const results = await this.semanticMemory.semanticSearch(message, {
                maxResults: maxResults * 2, // Get more for filtering
                minSimilarity: 0.1  // Lower threshold for better recall
            });

            return results.map(result => ({
                text: result.memory.text,
                similarity: result.similarity,
                relevanceScore: result.relevanceScore,
                timestamp: result.memory.timestamp,
                type: result.memory.type,
                cluster: result.cluster,
                relatedMemories: result.relatedMemories
            }));

        } catch (error) {
            console.error('[IntelligentRetrieval] Semantic search error:', error.message);
            return [];
        }
    }

    /**
     * Traditional keyword-based search
     */
    async traditionalSearch(message, maxResults) {
        try {
            // Use existing memory system for traditional search
            const userContext = await this.existingMemory.buildContext();
            const fragments = [];

            if (userContext.immediate_context) {
                userContext.immediate_context.forEach(msg => {
                    if (msg.sender === 'user') {
                        const similarity = this.calculateKeywordSimilarity(msg.text, message);
                        if (similarity > 0.3) {
                            fragments.push({
                                text: msg.text,
                                similarity: similarity,
                                relevanceScore: similarity,
                                timestamp: msg.timestamp || new Date(),
                                type: 'conversation'
                            });
                        }
                    }
                });
            }

            return fragments
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, maxResults);

        } catch (error) {
            console.error('[IntelligentRetrieval] Traditional search error:', error.message);
            return [];
        }
    }

    /**
     * Temporal intelligence search
     */
    async temporalSearch(message, maxResults) {
        try {
            const temporalRef = this.semanticMemory.parseTemporalReference(message);
            if (!temporalRef) return [];

            const results = await this.semanticMemory.semanticSearch(message, {
                maxResults: maxResults * 2,
                temporalFilter: temporalRef,
                minSimilarity: 0.05  // Even lower for temporal search
            });

            return results.map(result => ({
                text: result.memory.text,
                similarity: result.similarity,
                relevanceScore: result.relevanceScore,
                timestamp: result.memory.timestamp,
                type: result.memory.type,
                temporalMatch: temporalRef.pattern
            }));

        } catch (error) {
            console.error('[IntelligentRetrieval] Temporal search error:', error.message);
            return [];
        }
    }

    /**
     * Cross-reference search using semantic clustering
     */
    async crossReferenceSearch(message, maxResults) {
        try {
            // First find memories related to the query
            const primaryResults = await this.semanticMemory.semanticSearch(message, {
                maxResults: 3,
                minSimilarity: 0.1  // Lower threshold for cross-reference
            });

            const crossRefFragments = [];

            // For each primary result, find related memories from the same cluster
            for (const result of primaryResults) {
                if (result.relatedMemories && result.relatedMemories.length > 0) {
                    for (const relatedMemory of result.relatedMemories) {
                        crossRefFragments.push({
                            text: relatedMemory.text,
                            similarity: 0.5, // Medium similarity for cross-reference
                            relevanceScore: 0.6,
                            timestamp: relatedMemory.timestamp,
                            type: relatedMemory.type,
                            crossReference: true,
                            primaryMemory: result.memory.text.substring(0, 100)
                        });
                    }
                }
            }

            return crossRefFragments.slice(0, maxResults);

        } catch (error) {
            console.error('[IntelligentRetrieval] Cross-reference search error:', error.message);
            return [];
        }
    }

    /**
     * Intelligent ranking that combines multiple factors
     */
    intelligentRanking(results, query) {
        // Deduplicate by text content
        const uniqueResults = new Map();
        
        for (const result of results) {
            const key = result.text.substring(0, 100); // Use first 100 chars as key
            if (!uniqueResults.has(key) || uniqueResults.get(key).relevanceScore < result.relevanceScore) {
                uniqueResults.set(key, result);
            }
        }

        const deduplicated = Array.from(uniqueResults.values());

        // Enhanced ranking algorithm
        return deduplicated.map(result => {
            let finalScore = result.relevanceScore || 0;

            // Boost for semantic search results
            if (result.source === 'semantic') {
                finalScore += 0.1;
            }

            // Boost for temporal matches
            if (result.temporalMatch) {
                finalScore += 0.15;
            }

            // Boost for cross-references
            if (result.crossReference) {
                finalScore += 0.05;
            }

            // Boost for recent memories
            const ageInDays = (Date.now() - new Date(result.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            const recencyBoost = Math.exp(-ageInDays / 7); // Exponential decay over 7 days
            finalScore += recencyBoost * 0.1;

            // Boost for cluster size (more related memories = more important)
            if (result.cluster && result.cluster.memoryIds) {
                const clusterSize = result.cluster.memoryIds.length;
                finalScore += Math.min(clusterSize * 0.02, 0.1);
            }

            return {
                ...result,
                finalScore: Math.min(finalScore, 1.0)
            };
        }).sort((a, b) => b.finalScore - a.finalScore);
    }

    /**
     * Calculate keyword similarity (simple implementation)
     */
    calculateKeywordSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size; // Jaccard similarity
    }

    /**
     * Add memory to semantic system
     */
    async addMemory(memory) {
        try {
            await this.initialize();
            return await this.semanticMemory.addMemory(memory);
        } catch (error) {
            console.error('[IntelligentRetrieval] Error adding memory:', error.message);
            throw error;
        }
    }

    /**
     * Get comprehensive memory statistics
     */
    async getStats() {
        try {
            await this.initialize();
            const semanticStats = this.semanticMemory.getStats();
            
            return {
                semantic: semanticStats,
                traditional: {
                    totalMemories: this.existingMemory?.layers?.immediate?.length || 0,
                    patterns: Object.keys(this.existingMemory?.layers?.patterns?.topics || {}).length
                },
                intelligence: {
                    vectorEmbeddings: semanticStats.totalMemories,
                    semanticClusters: semanticStats.totalClusters,
                    temporalIntelligence: true,
                    crossReferenceSearch: true,
                    contextualRanking: true
                }
            };
        } catch (error) {
            console.error('[IntelligentRetrieval] Error getting stats:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Smart search with natural language queries
     */
    async smartSearch(query, options = {}) {
        try {
            await this.initialize();

            // Parse query for different search types
            const queryAnalysis = this.analyzeQuery(query);
            
            const searchOptions = {
                maxResults: options.maxResults || 5,
                includeSemantic: queryAnalysis.needsSemantic,
                includeTraditional: queryAnalysis.needsTraditional,
                includeTemporal: queryAnalysis.needsTemporal,
                includeCrossReference: queryAnalysis.needsCrossReference
            };

            const results = await this.retrieveContext(query, searchOptions);

            return {
                ...results,
                queryAnalysis,
                smartSearch: true
            };

        } catch (error) {
            console.error('[IntelligentRetrieval] Smart search error:', error.message);
            return { fragments: [], error: error.message };
        }
    }

    /**
     * Analyze query to determine best search strategies
     */
    analyzeQuery(query) {
        const lower = query.toLowerCase();
        
        return {
            needsSemantic: true, // Always use semantic search
            needsTraditional: lower.includes('exact') || lower.includes('keyword'),
            needsTemporal: /(last|recently|yesterday|earlier|before|when did)/.test(lower),
            needsCrossReference: lower.includes('related') || lower.includes('similar') || lower.includes('like'),
            queryType: this.detectQueryType(query)
        };
    }

    /**
     * Detect the type of query being asked
     */
    detectQueryType(query) {
        const lower = query.toLowerCase();
        
        if (/(when|last time|earlier|before)/.test(lower)) return 'temporal';
        if (/(what|how|why)/.test(lower)) return 'semantic';
        if (/(related|similar|like)/.test(lower)) return 'cross_reference';
        if (/(exact|keyword)/.test(lower)) return 'traditional';
        
        return 'general';
    }
}

module.exports = { IntelligentRetrieval };
