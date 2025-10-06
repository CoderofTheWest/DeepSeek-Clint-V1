class SimplifiedProfileSystem {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.trustLinks = [];
        this.activeProfile = 'default';
    }

    async loadTrustLinks() {
        this.trustLinks = this.trustLinks || [];
    }

    async loadMultiModalProfiles() {
        return [];
    }

    async addTrustLink(name, context, relationship = 'unknown', trust = 0.5) {
        this.trustLinks.push({ name, context, relationship, trust, createdAt: new Date().toISOString() });
        return { success: true };
    }

    switchToChris() {
        this.activeProfile = 'chris';
    }
}

module.exports = SimplifiedProfileSystem;
