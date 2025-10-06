const { constructPrompt } = require('../constructPrompt');

async function constructPromptOptimized(options) {
    const result = await constructPrompt(options);
    return {
        ...result,
        prompt: result.fullPrompt,
        optimized: false
    };
}

module.exports = { constructPromptOptimized };
