const fs = require('fs').promises;
const path = require('path');

class ProfileIsolatedMemory {
    constructor(storagePath, options = {}) {
        this.basePath = path.join(storagePath, 'profile-isolated-memory');
        this.maxEntriesPerProfile = options.maxEntriesPerProfile || 200;
        this.contextWindow = options.contextWindow || 20;
        this.cache = new Map();
    }

    async _ensureProfilePath(profileId) {
        if (!profileId) {
            throw new Error('profileId is required');
        }

        await fs.mkdir(this.basePath, { recursive: true });
        const filePath = path.join(this.basePath, `${profileId}.json`);

        if (!this.cache.has(profileId)) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const records = JSON.parse(content);
                this.cache.set(profileId, Array.isArray(records) ? records : []);
            } catch (error) {
                // Initialize empty cache when file missing or invalid
                this.cache.set(profileId, []);
            }
        }

        return filePath;
    }

    async addProfileMemory(profileId, memory) {
        if (!profileId || !memory || typeof memory !== 'object') {
            return;
        }

        const filePath = await this._ensureProfilePath(profileId);
        const records = this.cache.get(profileId) || [];

        const normalizedEntry = {
            sender: memory.sender || 'system',
            text: typeof memory.text === 'string' ? memory.text : '',
            timestamp: memory.timestamp || Date.now(),
            profileId,
            metadata: memory.metadata || {}
        };

        if (!normalizedEntry.text) {
            return;
        }

        records.push(normalizedEntry);

        // Keep only recent entries to prevent uncontrolled growth
        if (records.length > this.maxEntriesPerProfile) {
            records.splice(0, records.length - this.maxEntriesPerProfile);
        }

        this.cache.set(profileId, records);

        try {
            await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf8');
        } catch (error) {
            console.error('[ProfileIsolatedMemory] Failed to persist memory:', error.message);
        }
    }

    async getProfileContext(profileId) {
        if (!profileId) {
            return '';
        }

        await this._ensureProfilePath(profileId);
        const records = this.cache.get(profileId) || [];

        if (records.length === 0) {
            return '';
        }

        const recent = records.slice(-this.contextWindow);
        const formatted = recent
            .map(entry => {
                const when = new Date(entry.timestamp).toISOString();
                return `(${when}) ${entry.sender}: ${entry.text}`;
            })
            .join('\n');

        return `[PROFILE-SPECIFIC CONTEXT]\n${formatted}\n[END PROFILE-SPECIFIC CONTEXT]`;
    }
}

module.exports = ProfileIsolatedMemory;
