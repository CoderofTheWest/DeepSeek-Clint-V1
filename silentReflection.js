class SilentReflectionSystem {
    constructor() {
        this.reflections = [];
    }

    generateSilentContext(userId = 'default') {
        const recent = this.reflections.slice(-3).map(r => r.summary).join(' ');
        if (!recent) {
            return 'Hold the quiet. Notice the room before you speak.';
        }
        return `Quiet note (${userId}): ${recent}`;
    }

    storeReflection(reflection) {
        if (!reflection) return;
        this.reflections.push({
            reflection,
            summary: typeof reflection === 'string' ? reflection.slice(0, 140) : 'silent',
            timestamp: new Date().toISOString()
        });
    }

    processResponse(responseText, profileId = 'default') {
        const summary = responseText
            ? responseText.split('\n').map(line => line.trim()).filter(Boolean)[0] || responseText.slice(0, 140)
            : '';
        this.storeReflection(`(${profileId}) ${summary}`);
        return summary;
    }
}

module.exports = SilentReflectionSystem;
