// Conversation context filtering system to prevent hallucination feedback loops

class ConversationContextFilter {
    constructor() {
        // Patterns that indicate memory-testing questions
        this.memoryTestPatterns = [
            /Do you remember.*bike/i,
            /Do you remember.*dragon/i,
            /Do you remember.*unicorn/i,
            /Do you remember.*time traveler/i,
            /Do you remember.*fly/i,
            /Do you remember.*elephant/i
        ];
        
        // Patterns that indicate hallucinated responses
        this.hallucinationPatterns = [
            /She ran alongside you/,
            /hand on the seat/,
            /red bike/,
            /flat tire/,
            /patched the tube/,
            /midnight flight/,
            /pet dragon/,
            /pet unicorn/,
            /time traveler from the year/
        ];
        
        // Patterns that indicate denial responses (good responses)
        this.denialPatterns = [
            /No\. I don't/,
            /I don't recall/,
            /I don't remember/,
            /My memory's not built that way/,
            /That's not a trail I ride/,
            /Stories like that—they don't stick/
        ];
    }
    
    // Check if a message is a memory-testing question
    isMemoryTestQuestion(text) {
        return this.memoryTestPatterns.some(pattern => pattern.test(text));
    }
    
    // Check if a response contains hallucination
    containsHallucination(text) {
        return this.hallucinationPatterns.some(pattern => pattern.test(text));
    }
    
    // Check if a response is a proper denial
    isProperDenial(text) {
        return this.denialPatterns.some(pattern => pattern.test(text));
    }
    
    // Filter conversation history to remove hallucinated exchanges
    filterConversationHistory(messages) {
        const filteredMessages = [];
        let skipNext = false;
        
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            
            // If we're skipping (previous message was hallucinated), check if this is a denial
            if (skipNext) {
                if (message.sender === 'clint' && this.isProperDenial(message.text)) {
                    // This is a proper denial, include it and stop skipping
                    filteredMessages.push(message);
                    skipNext = false;
                }
                // Otherwise, continue skipping
                continue;
            }
            
            // Check if this is a memory test question
            if (message.sender === 'user' && this.isMemoryTestQuestion(message.text)) {
                // Include the question but mark that we should skip the response if it's hallucinated
                filteredMessages.push(message);
                // Check the next message (Clint's response)
                if (i + 1 < messages.length) {
                    const nextMessage = messages[i + 1];
                    if (nextMessage.sender === 'clint' && this.containsHallucination(nextMessage.text)) {
                        // Skip the hallucinated response
                        skipNext = true;
                        i++; // Skip the next message
                    } else if (nextMessage.sender === 'clint' && this.isProperDenial(nextMessage.text)) {
                        // Include the proper denial
                        filteredMessages.push(nextMessage);
                        i++; // Skip the next message
                    }
                }
            } else {
                // Regular message, include it
                filteredMessages.push(message);
            }
        }
        
        return filteredMessages;
    }
    
    // Filter session messages for context injection
    filterSessionMessages(messages) {
        return this.filterConversationHistory(messages);
    }
    
    // Filter memory retrieval results
    filterMemoryResults(memories) {
        return memories.filter(memory => {
            // Remove memories that contain hallucinated content
            if (memory.type === 'clint_response' && this.containsHallucination(memory.text)) {
                return false;
            }
            return true;
        });
    }
    
    // Filter profile patterns
    filterProfilePatterns(patterns) {
        return patterns.filter(pattern => {
            const note = pattern.note || '';
            // Remove memory-testing questions from profile patterns
            if (this.isMemoryTestQuestion(note)) {
                return false;
            }
            return true;
        });
    }
    
    // Clean existing conversation data
    async cleanConversationData(sessionManager, memory, profileManager) {
        try {
            console.log('[ConversationFilter] Starting conversation data cleanup...');
            
            // Clean session messages
            const allSessions = sessionManager.getAllSessions();
            for (const session of allSessions) {
                const originalCount = session.messages.length;
                session.messages = this.filterSessionMessages(session.messages);
                const removedCount = originalCount - session.messages.length;
                if (removedCount > 0) {
                    console.log(`[ConversationFilter] Removed ${removedCount} hallucinated messages from session ${session.id}`);
                    await sessionManager.saveSession(session);
                }
            }
            
            // Clean memory system
            const allMemories = await memory.getAllMemories();
            const filteredMemories = this.filterMemoryResults(allMemories);
            const removedMemories = allMemories.length - filteredMemories.length;
            if (removedMemories > 0) {
                console.log(`[ConversationFilter] Removed ${removedMemories} hallucinated memories`);
                await memory.clearAllMemories();
                for (const cleanMemory of filteredMemories) {
                    await memory.addMemory(cleanMemory);
                }
            }
            
            // Clean profile patterns
            await profileManager.cleanHallucinatedPatterns('chris');
            
            console.log('[ConversationFilter] Conversation data cleanup completed');
        } catch (error) {
            console.error('[ConversationFilter] Error during cleanup:', error.message);
        }
    }
}

module.exports = ConversationContextFilter;
