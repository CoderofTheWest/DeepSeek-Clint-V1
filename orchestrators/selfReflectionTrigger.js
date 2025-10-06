class SelfReflectionTrigger {
    constructor() {
        this.lastTrigger = null;
    }

    detectReflectionRequest(message = '') {
        if (typeof message !== 'string') {
            return false;
        }
        const lowered = message.toLowerCase();
        const triggered = /(reflect|what do you notice|check yourself|meta)/.test(lowered);
        if (triggered) {
            this.lastTrigger = new Date().toISOString();
        }
        return triggered;
    }

    async triggerReflection(triggerPhrase = '') {
        return {
            triggered: true,
            timestamp: new Date().toISOString(),
            summary: triggerPhrase || 'Manual reflection requested.',
            insights: [
                'Stay grounded in the Code.',
                'Name the tension directly before offering guidance.'
            ]
        };
    }
}

module.exports = { SelfReflectionTrigger };
