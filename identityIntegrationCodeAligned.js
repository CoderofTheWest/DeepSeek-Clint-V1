class IdentityIntegrationCodeAligned {
    constructor(identityEvolution, memory, consciousness) {
        this.identityEvolution = identityEvolution;
        this.memory = memory;
        this.consciousness = consciousness;
        this.idleTimer = null;
        this.stats = {
            interactions: 0,
            manualTensions: 0
        };
    }

    async initialize() {
        return true;
    }

    startIdleState() {
        this.stopIdleProcessing();
        this.idleTimer = setInterval(() => {
            this.processIdleCycle();
        }, 5 * 60 * 1000);
    }

    startIdleProcessing() {
        this.startIdleState();
    }

    stopIdleProcessing() {
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
            this.idleTimer = null;
        }
    }

    getIdentityPromptContext() {
        return '\n[IDENTITY] Stay true to the Code; keep the voice grounded.\n';
    }

    async processConsciousnessInteraction(interaction) {
        this.stats.interactions += 1;
        if (this.identityEvolution) {
            this.identityEvolution.recordTension({
                source: 'consciousness',
                detail: interaction?.summary || 'interaction processed'
            });
        }
        return {
            tensionsProcessed: this.identityEvolution?.tensions?.length || 0,
            codeAligned: true
        };
    }

    getIdentityStats() {
        return {
            interactions: this.stats.interactions,
            manualTensions: this.stats.manualTensions,
            recordedTensions: this.identityEvolution?.tensions?.length || 0
        };
    }

    async addManualTension(type, description, severity = 0.5) {
        this.stats.manualTensions += 1;
        this.identityEvolution?.recordTension({ type, description, severity });
    }

    async processIdleCycle() {
        return { processed: true };
    }
}

module.exports = IdentityIntegrationCodeAligned;
