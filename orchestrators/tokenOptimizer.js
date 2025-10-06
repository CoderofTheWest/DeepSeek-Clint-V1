class TokenOptimizer {
    optimizeContext(messages = [], profileId = 'default', arcState = {}) {
        const joined = messages
            .slice(-10)
            .map(msg => msg.content || msg.text || '')
            .filter(Boolean)
            .join('\n');

        return {
            optimizedContext: joined,
            tokenEstimate: joined.split(/\s+/).length,
            diagnostics: {
                messageCount: messages.length,
                profileId,
                arc: arcState?.arc || 'steady'
            }
        };
    }
}

module.exports = { TokenOptimizer };
