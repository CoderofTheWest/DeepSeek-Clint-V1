const { constructPrompt } = require('./constructPrompt');

class ProfileAwarePrompt {
    constructor(profileManager, memory) {
        this.profileManager = profileManager;
        this.memory = memory;
    }

    async constructPromptWithProfile(options = {}) {
        const base = await constructPrompt(options);
        const profileName = typeof options.profile === 'string'
            ? options.profile
            : options.profile?.name || 'guest';

        const contextLines = [];
        if (options.context) {
            contextLines.push(`PROFILE CONTEXT: ${options.context}`);
        }
        contextLines.push(`SPEAK AS CLINT TO ${profileName}. HONOR THE CODE.`);

        return {
            ...base,
            prompt: `${base.fullPrompt}\n\n${contextLines.join('\n')}`
        };
    }
}

module.exports = ProfileAwarePrompt;
