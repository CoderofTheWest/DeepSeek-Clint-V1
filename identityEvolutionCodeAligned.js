class IdentityEvolutionCodeAligned {
    constructor(storagePath, memory) {
        this.storagePath = storagePath;
        this.memory = memory;
        this.tensions = [];
    }

    recordTension(tension) {
        this.tensions.push({ ...tension, recordedAt: new Date().toISOString() });
    }

    getStats() {
        return {
            tensionCount: this.tensions.length
        };
    }
}

module.exports = IdentityEvolutionCodeAligned;
