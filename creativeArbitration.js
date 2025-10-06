// creativeArbitration.js - Creative Arbitration Layer
// Extends existing arbitration with temporal & creative signals

const fs = require('fs').promises;
const path = require('path');

// Baseline heuristics for creative arbitration
const creativeHeuristics = {
    reflectionTerms: ['why', 'what if', 'imagine', 'suppose', 'paradox', 'contradiction', 'torn', 'on the one hand'],
    maxRecentForEchoCheck: 5,
    similarityThresholdEcho: 0.75,
    similarityThresholdDrop: 0.80, // hard drop
    noveltyBoostPerCue: 0.1,       // cap to +0.3
    weightsClamp: [0.2, 0.6]       // keep ums weights within range
};

// Simple cosine similarity calculation
function cosineSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const allWords = [...new Set([...words1, ...words2])];
    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
    const vector2 = allWords.map(word => words2.filter(w => w === word).length);
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
}

// Check for reflective/creative keywords
function detectReflectiveCues(message) {
    const lower = message.toLowerCase();
    let cueCount = 0;
    
    creativeHeuristics.reflectionTerms.forEach(term => {
        if (lower.includes(term)) {
            cueCount++;
        }
    });
    
    return Math.min(cueCount * creativeHeuristics.noveltyBoostPerCue, 0.3);
}

// Get recent conversation turns for echo detection
async function getRecentTurns(sessionManager, count = 5) {
    try {
        const messages = sessionManager.getUnifiedMessages();
        return messages.slice(-count * 2); // Get last N user+assistant pairs
    } catch (error) {
        console.error('[CreativeArbitration] Failed to get recent turns:', error.message);
        return [];
    }
}

// Calculate echo similarity with recent turns
function calculateEchoSimilarity(message, recentTurns) {
    let maxSimilarity = 0;
    let echoCount = 0;
    
    recentTurns.forEach(turn => {
        if (turn.sender === 'user' || turn.sender === 'clint') {
            const similarity = cosineSimilarity(message, turn.text);
            maxSimilarity = Math.max(maxSimilarity, similarity);
            
            if (similarity >= creativeHeuristics.similarityThresholdEcho) {
                echoCount++;
            }
        }
    });
    
    return { maxSimilarity, echoCount };
}

// Get current narrative arc state
async function getArcState(consciousness) {
    try {
        const identityGraph = consciousness.identityGraph;
        if (identityGraph && identityGraph.currentArc) {
            return await identityGraph.currentArc();
        }
        return { arc: 'steady presence', theme: 'grounded reflection' };
    } catch (error) {
        console.error('[CreativeArbitration] Failed to get arc state:', error.message);
        return { arc: 'steady presence', theme: 'grounded reflection' };
    }
}

// Main creative arbitration function
async function creativeArbitration({ message, weights_ums, recent_texts, arc_state, heuristics = creativeHeuristics }) {
    try {
        // Start with base weights
        let finalWeights = { ...weights_ums };
        let noveltyScore = 0.5; // baseline
        let retrievalDepth = 'shallow';
        let mutationFactor = 0.3;
        
        // 1. Calculate echo similarity
        const echoData = calculateEchoSimilarity(message, recent_texts);
        
        // 2. Adjust novelty based on echoes
        if (echoData.maxSimilarity >= heuristics.similarityThresholdDrop) {
            noveltyScore = Math.min(noveltyScore + 0.4, 1.0);
            mutationFactor = Math.min(mutationFactor + 0.3, 1.0);
            retrievalDepth = 'none';
        } else if (echoData.maxSimilarity >= heuristics.similarityThresholdEcho) {
            noveltyScore = Math.min(noveltyScore + 0.2, 1.0);
            mutationFactor = Math.min(mutationFactor + 0.2, 0.8);
            retrievalDepth = 'shallow';
        }
        
        // 3. Detect reflective/creative cues
        const reflectiveBoost = detectReflectiveCues(message);
        noveltyScore = Math.min(noveltyScore + reflectiveBoost, 1.0);
        
        // 4. Adjust weights based on novelty
        if (noveltyScore > 0.7) {
            // High novelty: favor self (inner creativity)
            finalWeights.self = Math.min(finalWeights.self + 0.2, heuristics.weightsClamp[1]);
            finalWeights.user = Math.max(finalWeights.user - 0.1, heuristics.weightsClamp[0]);
            finalWeights.meta = Math.max(finalWeights.meta - 0.1, heuristics.weightsClamp[0]);
        } else if (noveltyScore < 0.3) {
            // Low novelty: favor user memory (recall)
            finalWeights.user = Math.min(finalWeights.user + 0.2, heuristics.weightsClamp[1]);
            finalWeights.self = Math.max(finalWeights.self - 0.1, heuristics.weightsClamp[0]);
            finalWeights.meta = Math.max(finalWeights.meta - 0.1, heuristics.weightsClamp[0]);
        }
        
        // 5. Adjust retrieval depth based on novelty and arc state
        if (arc_state && arc_state.arc.includes('new chapter')) {
            noveltyScore = Math.min(noveltyScore + 0.2, 1.0);
            retrievalDepth = 'shallow';
        }
        
        if (noveltyScore > 0.6) {
            retrievalDepth = 'shallow';
        } else if (noveltyScore < 0.4) {
            retrievalDepth = 'deep';
        }
        
        // 6. Normalize weights
        const sum = finalWeights.user + finalWeights.meta + finalWeights.self;
        finalWeights.user = finalWeights.user / sum;
        finalWeights.meta = finalWeights.meta / sum;
        finalWeights.self = finalWeights.self / sum;
        
        return {
            novelty_score: noveltyScore,
            retrieval_depth: retrievalDepth,
            mutation_factor: mutationFactor,
            final_weights: finalWeights,
            echo_data: {
                max_similarity: echoData.maxSimilarity,
                echo_count: echoData.echoCount
            },
            reflective_boost: reflectiveBoost,
            arc_state: arc_state
        };
        
    } catch (error) {
        console.error('[CreativeArbitration] Error in creative arbitration:', error.message);
        // Fallback to original weights
        return {
            novelty_score: 0.5,
            retrieval_depth: 'shallow',
            mutation_factor: 0.3,
            final_weights: weights_ums,
            echo_data: { max_similarity: 0, echo_count: 0 },
            reflective_boost: 0,
            arc_state: { arc: 'steady presence', theme: 'grounded reflection' }
        };
    }
}

module.exports = {
    creativeArbitration,
    getRecentTurns,
    getArcState,
    creativeHeuristics
};
