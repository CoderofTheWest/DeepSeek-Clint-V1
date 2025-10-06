// parseMessageForTriggers.js - Message-Driven Loop Parser
// Detects message types and extracts keywords to drive reactive arbitration and retrieval

// Parse message to detect trigger type and extract relevant keywords
function parseMessageForTriggers(message) {
    const lower = message.toLowerCase();
    const triggers = [];
    const keywords = [];
    
    // 1. Recall request detection
    if (/\b(remind me|what did i say|last time|yesterday|earlier|before|previous|recall|remember)\b/.test(lower)) {
        triggers.push('recall');
        // Extract time references
        const timeMatches = lower.match(/\b(yesterday|earlier|last time|before|previous|recently|earlier today)\b/g);
        if (timeMatches) keywords.push(...timeMatches);
    }
    
    // 2. Principle conflict detection
    if (/\b(should i|is it right|what matters more|conflicted|torn between|dilemma|moral|ethical|principle|honor|integrity|courage|truth|lie|honest|deceive)\b/.test(lower)) {
        triggers.push('principle');
        // Extract principle-related terms
        const principleMatches = lower.match(/\b(should|right|wrong|moral|ethical|principle|honor|integrity|courage|truth|lie|honest|deceive|conflicted|torn|dilemma)\b/g);
        if (principleMatches) keywords.push(...principleMatches);
    }
    
    // 3. Reflection/meaning-seeking detection
    if (/\b(why|what if|imagine|meaning|purpose|wonder|think about|reflect|philosophy|existential|deeper|significance|matter|important|value)\b/.test(lower)) {
        triggers.push('reflection');
        // Extract reflection-related terms
        const reflectionMatches = lower.match(/\b(why|what if|imagine|meaning|purpose|wonder|think|reflect|philosophy|existential|deeper|significance|matter|important|value)\b/g);
        if (reflectionMatches) keywords.push(...reflectionMatches);
    }
    
    // 4. New fact detection (proper nouns, numbers, first-time entities)
    const properNouns = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const numbers = message.match(/\b\d+(?:\.\d+)?\b/g) || [];
    const newEntities = message.match(/\b(?:the|a|an)\s+[a-z]+\b/g) || [];
    
    if (properNouns.length > 0 || numbers.length > 0 || newEntities.length > 2) {
        triggers.push('new_fact');
        keywords.push(...properNouns.slice(0, 3)); // Limit to first 3 proper nouns
        keywords.push(...numbers.slice(0, 2)); // Limit to first 2 numbers
    }
    
    // 5. Emotional state detection
    if (/\b(frustrated|angry|upset|worried|anxious|excited|happy|sad|confused|overwhelmed|tired|exhausted)\b/.test(lower)) {
        triggers.push('emotional');
        const emotionMatches = lower.match(/\b(frustrated|angry|upset|worried|anxious|excited|happy|sad|confused|overwhelmed|tired|exhausted)\b/g);
        if (emotionMatches) keywords.push(...emotionMatches);
    }
    
    // 6. Task/action request detection
    if (/\b(help me|can you|please|do this|make|create|build|write|explain|show me|how to)\b/.test(lower)) {
        triggers.push('task');
        const taskMatches = lower.match(/\b(help|can you|please|do|make|create|build|write|explain|show|how to)\b/g);
        if (taskMatches) keywords.push(...taskMatches);
    }
    
    // Determine primary trigger type (most specific wins)
    let primaryType = 'general';
    if (triggers.includes('recall')) primaryType = 'recall';
    else if (triggers.includes('principle')) primaryType = 'principle';
    else if (triggers.includes('reflection')) primaryType = 'reflection';
    else if (triggers.includes('new_fact')) primaryType = 'new_fact';
    else if (triggers.includes('emotional')) primaryType = 'emotional';
    else if (triggers.includes('task')) primaryType = 'task';
    
    // Clean and deduplicate keywords
    const cleanKeywords = [...new Set(keywords.filter(k => k && k.length > 2))];
    
    return {
        type: primaryType,
        triggers: triggers,
        keywords: cleanKeywords,
        confidence: triggers.length > 0 ? Math.min(triggers.length * 0.3, 1.0) : 0.1,
        message_length: message.length,
        has_question: /\?/.test(message),
        has_emphasis: /[!]{1,3}/.test(message)
    };
}

// Get weight mapping based on trigger type
function getWeightMapping(triggerType) {
    const mappings = {
        'recall': { user: 0.7, meta: 0.2, self: 0.1 },
        'principle': { user: 0.2, meta: 0.6, self: 0.2 },
        'reflection': { user: 0.2, meta: 0.2, self: 0.6 },
        'new_fact': { user: 0.4, meta: 0.4, self: 0.2 },
        'emotional': { user: 0.3, meta: 0.3, self: 0.4 },
        'task': { user: 0.5, meta: 0.3, self: 0.2 },
        'general': { user: 0.34, meta: 0.33, self: 0.33 }
    };
    
    return mappings[triggerType] || mappings['general'];
}

// Get retrieval depth based on trigger type
function getRetrievalDepth(triggerType) {
    const depths = {
        'recall': 'deep',      // Need more context for recall
        'principle': 'deep',   // Need principle history
        'reflection': 'shallow', // Keep it focused for reflection
        'new_fact': 'shallow', // Just need current context
        'emotional': 'shallow', // Don't overwhelm with context
        'task': 'shallow',     // Focus on current task
        'general': 'shallow'
    };
    
    return depths[triggerType] || 'shallow';
}

module.exports = {
    parseMessageForTriggers,
    getWeightMapping,
    getRetrievalDepth
};
