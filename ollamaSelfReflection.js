class OllamaSelfReflection {
    constructor() {
        this.totalReflections = 0;
        this.lastReflectionAt = null;
        this.lastSummary = null;
    }

    getReflectionStats() {
        return {
            totalReflections: this.totalReflections,
            lastReflectionAt: this.lastReflectionAt,
            lastSummary: this.lastSummary,
            provider: 'stubbed-ollama'
        };
    }

    async generateSelfReflection(recentMessages = [], userProfile = {}, knowledgeContext = '') {
        const window = Array.isArray(recentMessages)
            ? recentMessages.slice(-6)
            : [];

        const userMessages = window
            .filter(msg => msg.role === 'user' || msg.sender === 'user')
            .map(msg => msg.content || msg.text || '')
            .join(' ')
            .trim();

        const assistantMessages = window
            .filter(msg => msg.role === 'assistant' || msg.sender === 'clint')
            .map(msg => msg.content || msg.text || '')
            .join(' ')
            .trim();

        const observations = [];

        if (userMessages) {
            observations.push(`The user has been talking about: ${this._summarizeText(userMessages)}.`);
        }

        if (assistantMessages) {
            observations.push(`My recent replies emphasised: ${this._summarizeText(assistantMessages)}.`);
        }

        if (knowledgeContext) {
            observations.push('There is background context available, but I should only lean on it if it genuinely fits.');
        }

        if (observations.length === 0) {
            observations.push('Not enough fresh material to reflect on. Hold presence and stay attentive.');
        }

        const reflection = `Internal note: ${observations.join(' ')} ${this._buildNextStep(userProfile)}`.trim();

        this.totalReflections += 1;
        this.lastReflectionAt = new Date().toISOString();
        this.lastSummary = reflection.slice(0, 140);

        return { reflection };
    }

    _summarizeText(text) {
        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= 120) {
            return cleaned;
        }
        return `${cleaned.slice(0, 117)}...`;
    }

    _buildNextStep(userProfile) {
        if (!userProfile || typeof userProfile !== 'object') {
            return 'Stay grounded and ask a direct, useful question.';
        }

        if (userProfile.type === 'anchor' || userProfile.trustLevel === 'MAXIMUM') {
            return 'Lean into the established trust. Offer a clear, honest observation and invite them to go one layer deeper.';
        }

        return 'Maintain steady presence. Focus on clarity and give space for them to respond.';
    }
}

module.exports = OllamaSelfReflection;
