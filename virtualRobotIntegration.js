const { EventEmitter } = require('events');

class VirtualRobotIntegration extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
    }
}

module.exports = VirtualRobotIntegration;
