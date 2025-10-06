async function retrieveContext({
    message,
    weights = { user: 0.33, meta: 0.33, self: 0.34 },
    memory,
    metaMemory,
    sessionManager,
    activeProfile
} = {}) {
    const fragments = [];
    const userMessages = sessionManager ? sessionManager.getProfileMessages(activeProfile || 'default') : [];

    if (Array.isArray(userMessages) && userMessages.length > 0) {
        fragments.push(...userMessages.slice(-5).map(msg => ({
            text: msg.text || msg.content || '',
            sender: msg.sender || 'user',
            timestamp: msg.timestamp || Date.now(),
            source: 'session'
        })));
    }

    // Attempt to use memory system if available
    let memoryNotes = [];
    if (memory && typeof memory.buildContext === 'function') {
        try {
            const context = await memory.buildContext({ limit: 5, profileId: activeProfile });
            if (context && Array.isArray(context.immediate_context)) {
                memoryNotes = context.immediate_context.map(entry => ({
                    text: entry.text,
                    sender: entry.sender || 'memory',
                    timestamp: entry.timestamp,
                    source: 'memory'
                }));
            }
        } catch (error) {
            console.warn('[Retrieval] Failed to build memory context:', error.message);
        }
    }

    const response = {
        fragments,
        user_fragments: fragments,
        meta_fragments: memoryNotes,
        profile_fragments: [],
        weights,
        message,
        activeProfile,
        metaMemory
    };

    return response;
}

module.exports = { retrieveContext };
