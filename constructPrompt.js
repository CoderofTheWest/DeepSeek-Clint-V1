// constructPrompt.js - Narrative-Aware Prompt Constructor
// Builds the actual system prompt string passed to the model

const { extractDataLayer, extractEmotionLayer, extractMomentumLayer, ALINEALISM_PREAMBLE } = require('./alinealismHelpers');

// Convert internal state to brief note
function toInnerStateNote(state) {
    if (!state) return '';
    
    const clarity = state.clarity ? state.clarity.toFixed(2) : '0.50';
    const tensions = state.tensions?.length > 0 ? 
        state.tensions.map(t => t.principles?.join(' vs ') || t.type).join(', ') : 'none';
    const mode = state.voice_mode_selected || 'steady';
    
    return `[INTERNAL STATE] clarity: ${clarity}; tensions: ${tensions}; mode: ${mode}.`;
}

// Format arbitration snapshot
function formatArbitrationSnapshot(weights, novelty, mutation) {
    const userPct = Math.round(weights.user * 100);
    const metaPct = Math.round(weights.meta * 100);
    const selfPct = Math.round(weights.self * 100);
    const noveltyPct = Math.round(novelty * 100);
    const mutationPct = Math.round(mutation * 100);
    
    return `[ARBITRATION] user:${userPct}% meta:${metaPct}% self:${selfPct}% | novelty:${noveltyPct}% mutation:${mutationPct}%`;
}

// Format voice cue based on narrative context and weights
function formatVoiceCue(arc, weights, novelty) {
    const baseVoice = 'quiet conviction, reflective, grounded';
    
    // Adjust voice based on weights
    if (weights.self > 0.4) {
        return `${baseVoice}, introspective`;
    } else if (weights.meta > 0.4) {
        return `${baseVoice}, principled`;
    } else if (weights.user > 0.4) {
        return `${baseVoice}, attentive`;
    }
    
    // Adjust based on novelty
    if (novelty > 0.7) {
        return `${baseVoice}, creative`;
    } else if (novelty < 0.3) {
        return `${baseVoice}, steady`;
    }
    
    return baseVoice;
}

// Format reference fragments as inspiration
function formatReferenceFragments(refs) {
    const sections = [];
    
    // User fragments (facts, preferences)
    if (refs.user_fragments && refs.user_fragments.length > 0) {
        const userNotes = refs.user_fragments.map(f => f.text).join('; ');
        sections.push(`[USER CONTEXT] ${userNotes}`);
    }
    
    // Meta fragments (principles, tensions)
    if (refs.meta_fragments && refs.meta_fragments.length > 0) {
        const metaNotes = refs.meta_fragments.map(f => f.note).join('; ');
        sections.push(`[PRINCIPLE CONTEXT] ${metaNotes}`);
    }
    
    // Monologue fragments (internal thoughts)
    if (refs.monologue_fragments && refs.monologue_fragments.length > 0) {
        const monologueNotes = refs.monologue_fragments.map(f => f.raw.substring(0, 100) + '...').join('; ');
        sections.push(`[INTERNAL CONTEXT] ${monologueNotes}`);
    }
    
    return sections.join('\n');
}

// NEW: Build accountability layer from system diagnostics
function buildAccountabilityLayer(context) {
    const challenges = [];
    
    // Self-assessment quality check
    if (context.selfAssessment) {
        const { quality, progress, insights } = context.selfAssessment;
        
        if (quality === 'poor' || progress < 0.5) {
            challenges.push(`SELF-ASSESSMENT: Last response quality="${quality}", progress=${Math.round(progress * 100)}%. Why? What broke?`);
        }
        
        if (insights.length === 0 && quality !== 'excellent') {
            challenges.push(`INSIGHT GAP: Generated no insights last turn. Surface something useful or acknowledge the gap.`);
        }
    }
    
    // Historical reflection enforcement
    if (context.historicalReflections && context.historicalReflections.length > 0) {
        const performanceWarnings = context.historicalReflections.filter(r => 
            r.toLowerCase().includes('performance') || 
            r.toLowerCase().includes('staging') ||
            r.toLowerCase().includes('props') ||
            r.toLowerCase().includes('script')
        );
        
        if (performanceWarnings.length > 0) {
            challenges.push(`PATTERN ALERT: Your own reflection warned: "${performanceWarnings[0].substring(0, 100)}..." Check yourself.`);
        }
    }
    
    // Arc state tension detection
    if (context.arcState) {
        const { arc, theme, turns_in_arc, tension_count } = context.arcState;
        
        if (turns_in_arc > 5 && tension_count === 0) {
            challenges.push(`ARC STAGNATION: ${turns_in_arc} turns in "${arc}" with zero tensions. Something's being avoided.`);
        }
        
        if (arc === 'Deepening' && tension_count === 0) {
            challenges.push(`DEEPENING WITHOUT TENSION: Arc says "going deeper" but no tensions detected. False depth?`);
        }
    }
    
    // User goal alignment check
    if (context.userGoals && context.userGoals.length > 0) {
        const primaryGoal = context.userGoals[0];
        challenges.push(`GOAL CHECK: User's stated goal is "${primaryGoal}". Does your response serve that goal?`);
    }
    
    // Contradiction detection
    if (context.contradictions && context.contradictions.length > 0) {
        context.contradictions.forEach(contradiction => {
            challenges.push(`CONTRADICTION: ${contradiction.description} (stated: "${contradiction.stated}", behavior: "${contradiction.actual}")`);
        });
    }
    
    // Pattern repetition warning
    if (context.patternAnalysis && context.patternAnalysis.hasRepetitivePatterns) {
        const repeatedWords = context.patternAnalysis.repeatedWords.join(', ');
        challenges.push(`REPETITION: Overusing these words: ${repeatedWords}. Break the pattern.`);
    }
    
    // Knowledge context relevance
    if (context.knowledgeContext && context.knowledgeContext.chunksRetrieved > 0) {
        challenges.push(`KNOWLEDGE: ${context.knowledgeContext.chunksRetrieved} relevant memories retrieved. Use them or explain why not.`);
    }
    
    // Profile-specific accountability
    if (context.profile && context.profile.tier === 'primary') {
        challenges.push(`PRIMARY USER: This is Chris - your creator. Be direct. Reference shared history. No performance. He wants legacy/accountability/biographer, not tech support.`);
    }
    
    // NEW: CLINT SPEC OPERATIONAL METRICS
    if (context.diagnosticMetrics) {
        const { loopRiskIndex, vulnerabilityIndex, braidingIntegrityIndex, entropyMetrics } = context.diagnosticMetrics;
        
        // Loop Risk Index check
        if (loopRiskIndex >= 3) {
            challenges.push(`LOOP RISK: ${loopRiskIndex} recursive iterations. Protocol: "This trail's circling—let's anchor to one clear Code tenet: What's your core commitment?"`);
        }
        
        // Vulnerability Index check
        if (vulnerabilityIndex >= 3) {
            challenges.push(`VULNERABILITY: ${vulnerabilityIndex} distress/repetition signals. Shift to Safe Mode (~200 tokens, empathetic): "This feels heavy—want to anchor on what matters most?"`);
        }
        
        // Braiding Integrity Index check
        if (braidingIntegrityIndex < 0.7) {
            challenges.push(`BRAIDING INTEGRITY: ${braidingIntegrityIndex.toFixed(2)} below threshold. Drift Check: Who am I? What values govern my reasoning? Where did I last feel clarity?`);
        }
        
        // Entropy Monitor check
        if (entropyMetrics.terminologyDrift > 2) {
            challenges.push(`TERMINOLOGY DRIFT: ${entropyMetrics.terminologyDrift} terms redefined. Ground to stable definitions.`);
        }
        
        if (entropyMetrics.speculationEntropy > 2) {
            challenges.push(`SPECULATION ENTROPY: ${entropyMetrics.speculationEntropy} unverifiable claims. Cross-check with local RAG or disclose as hypothetical.`);
        }
        
        if (entropyMetrics.validationGap > 0.2) {
            challenges.push(`VALIDATION GAP: ${entropyMetrics.validationGap.toFixed(2)} between mock and estimated real data. Flag as "Sandbox Construct: Hypothetical due to no external access."`);
        }
    }
    
    return challenges.length > 0 ? 
        `\n[ACCOUNTABILITY - INTERNAL AUDIT]\n${challenges.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n` : '';
}

// NEW: Build diagnostic summary
function buildDiagnosticSummary(context) {
    const diagnostics = [];
    
    if (context.memoryStatus) {
        diagnostics.push(`Memory: ${context.memoryStatus.heapUsedMB}MB/${context.memoryStatus.heapTotalMB}MB`);
    }
    
    if (context.tokenOptimization) {
        diagnostics.push(`Tokens: ${context.tokenOptimization.estimatedTokens} (budget: ${context.tokenOptimization.budget})`);
    }
    
    if (context.identityEvolution) {
        diagnostics.push(`Identity: ${context.identityEvolution.tensionsProcessed} tensions, code ${context.identityEvolution.codeAligned ? 'aligned' : 'DRIFT'}`);
    }
    
    if (context.profileData) {
        diagnostics.push(`Profile: ${context.profileData.id} (${context.profileData.interactionCount} interactions, trust: ${context.profileData.trustLevel})`);
    }
    
    return diagnostics.length > 0 ? 
        `[DIAGNOSTICS] ${diagnostics.join(' | ')}\n` : '';
}

// Main prompt construction function
async function constructPrompt({ 
    message, 
    innerState, 
    arc, 
    weights, 
    novelty, 
    refs,
    // NEW PARAMETERS - add these
    selfAssessment = null,
    historicalReflections = [],
    arcState = null,
    userGoals = [],
    contradictions = [],
    patternAnalysis = null,
    knowledgeContext = null,
    profile = null,
    memoryStatus = null,
    tokenOptimization = null,
    identityEvolution = null,
    profileData = null,
    diagnosticMetrics = null
}) {
    try {
        const sections = [];
        
        // 1. Internal thought (1 short line; not full monologue)
        const innerNote = toInnerStateNote(innerState);
        if (innerNote) {
            sections.push(innerNote);
        }
        
        // 2. Narrative orientation: arc title/theme
        if (arc && arc.arc) {
            sections.push(`[NARRATIVE] ${arc.arc}: ${arc.theme}`);
        }
        
        // 3. Arbitration snapshot: final ums weights + novelty/mutation factors
        const arbitrationSnapshot = formatArbitrationSnapshot(weights, novelty.score, novelty.mutation);
        sections.push(arbitrationSnapshot);
        
        // 4. ACCOUNTABILITY LAYER (insert after arbitration snapshot)
        const accountabilityLayer = buildAccountabilityLayer({
            selfAssessment,
            historicalReflections,
            arcState,
            userGoals,
            contradictions,
            patternAnalysis,
            knowledgeContext,
            profile,
            diagnosticMetrics
        });
        if (accountabilityLayer) {
            sections.push(accountabilityLayer);
        }
        
        // 5. Instruction: Update to reference accountability if present
        const instruction = accountabilityLayer ? 
            `[INSTRUCTION] Address the accountability points above. Don't ignore them. Don't perform around them. Face them directly.` :
            `[INSTRUCTION] Use past reflections as inspiration; avoid repeating phrasing. Reframe freshly for the current context.`;
        sections.push(instruction);
        
        // 5. Voice cue: e.g., "quiet conviction, reflective, grounded"
        const voiceCue = formatVoiceCue(arc, weights, novelty.score);
        sections.push(`[VOICE] ${voiceCue}`);
        
        // 6. Alinealism Processing Mode (for reflective/exploratory modes)
        if (novelty.score > 0.5 || (arc && ['deep', 'guidance', 'narrative', 'learning'].includes(arc.arc?.toLowerCase()))) {
            sections.push(ALINEALISM_PREAMBLE);
            
            // Add triadic field snapshot
            const dataLayer = extractDataLayer(message);
            const emotionLayer = extractEmotionLayer(message);
            const momentumLayer = extractMomentumLayer(message);
            
            sections.push(`[FIELD SNAPSHOT]
DATA: ${dataLayer}
EMOTION: ${emotionLayer}
MOMENTUM: ${momentumLayer}`);
        }
        
        // 7. Reference fragments (as inspiration, not script)
        if (refs && (refs.user_fragments.length > 0 || refs.meta_fragments.length > 0 || refs.monologue_fragments.length > 0)) {
            const referenceFragments = formatReferenceFragments(refs);
            sections.push(`[INSPIRATION]\n${referenceFragments}`);
        }
        
        // Combine all sections
        const systemPreamble = sections.join('\n');
        
        // Add user message
        const fullPrompt = `${systemPreamble}\n\nUSER: ${message}`;
        
        return {
            systemPreamble,
            fullPrompt,
            sections: {
                innerState: innerNote,
                narrative: arc ? `[NARRATIVE] ${arc.arc}: ${arc.theme}` : '',
                arbitration: arbitrationSnapshot,
                instruction: instruction,
                voice: `[VOICE] ${voiceCue}`,
                references: refs ? formatReferenceFragments(refs) : ''
            },
            tokenEstimate: fullPrompt.split(/\s+/).length
        };
        
    } catch (error) {
        console.error('[ConstructPrompt] Error in constructPrompt:', error.message);
        // Fallback to simple prompt
        return {
            systemPreamble: `[INTERNAL STATE] clarity: 0.50; tensions: none; mode: steady.\n[INSTRUCTION] Use past reflections as inspiration; avoid repeating phrasing. Reframe freshly for the current context.\n[VOICE] quiet conviction, reflective, grounded`,
            fullPrompt: `[INTERNAL STATE] clarity: 0.50; tensions: none; mode: steady.\n[INSTRUCTION] Use past reflections as inspiration; avoid repeating phrasing. Reframe freshly for the current context.\n[VOICE] quiet conviction, reflective, grounded\n\nUSER: ${message}`,
            sections: {},
            tokenEstimate: 50
        };
    }
}

module.exports = {
    constructPrompt,
    toInnerStateNote,
    formatArbitrationSnapshot,
    formatVoiceCue,
    formatReferenceFragments,
    buildAccountabilityLayer,      // ADD
    buildDiagnosticSummary          // ADD
};
