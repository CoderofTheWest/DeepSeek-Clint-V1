const { EventEmitter } = require('events');

class TonyPiIntegrationServer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
    }

    async start() {
        return false;
    }
}

module.exports = TonyPiIntegrationServer;
