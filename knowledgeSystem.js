const { ChromaClient } = require('chromadb');
const { DefaultEmbeddingFunction } = require('@chroma-core/default-embed');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

class KnowledgeSystem {
    constructor() {
        this.client = new ChromaClient();
        this.collectionName = 'clint-knowledge';
        this.knowledgeDir = './knowledge';
        this.collection = null;
        this.embeddingFunction = new DefaultEmbeddingFunction();
        this.processedChunks = new Set(); // Track processed chunks to prevent duplicates
    }

    async initialize() {
        try {
            console.log('[KnowledgeSystem] Initializing Chroma client...');
            
            // Check if collection exists, create if not
            try {
                this.collection = await this.client.getCollection({ 
                    name: this.collectionName,
                    embeddingFunction: this.embeddingFunction
                });
                console.log('[KnowledgeSystem] Found existing collection:', this.collectionName);
                
                // Load existing chunk IDs to prevent duplicates
                await this.loadExistingChunkIds();
            } catch (error) {
                console.log('[KnowledgeSystem] Creating new collection:', this.collectionName);
                this.collection = await this.client.createCollection({
                    name: this.collectionName,
                    metadata: { description: "Clint's knowledge base including Code of the West, protocols, and frameworks" },
                    embeddingFunction: this.embeddingFunction
                });
            }

            // Load and process all knowledge files
            await this.loadKnowledgeFiles();
            
            console.log('[KnowledgeSystem] Knowledge system initialized successfully');
            return true;
        } catch (error) {
            console.error('[KnowledgeSystem] Initialization failed:', error.message);
            return false;
        }
    }
    
    async loadExistingChunkIds() {
        try {
            const existingData = await this.collection.get();
            if (existingData.ids) {
                existingData.ids.forEach(id => this.processedChunks.add(id));
                console.log(`[KnowledgeSystem] Loaded ${existingData.ids.length} existing chunk IDs`);
            }
        } catch (error) {
            console.log('[KnowledgeSystem] No existing chunks found');
        }
    }

    async loadKnowledgeFiles() {
        try {
            const files = fs.readdirSync(this.knowledgeDir);
            const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
            
            console.log(`[KnowledgeSystem] Found ${pdfFiles.length} PDF files to process`);
            
            // Get existing collection count to check for duplicates
            let existingCount = 0;
            try {
                const existingData = await this.collection.get();
                existingCount = existingData.ids.length;
                console.log(`[KnowledgeSystem] Existing collection has ${existingCount} chunks`);
            } catch (error) {
                console.log('[KnowledgeSystem] No existing collection found, starting fresh');
            }
            
            const documents = [];
            const metadatas = [];
            const ids = [];
            let newChunksCount = 0;

            for (const file of pdfFiles) {
                try {
                    console.log(`[KnowledgeSystem] Processing: ${file}`);
                    const filePath = path.join(this.knowledgeDir, file);
                    const dataBuffer = fs.readFileSync(filePath);
                    const pdfData = await pdf(dataBuffer);
                    
                    // Split large documents into chunks for better retrieval
                    const chunks = this.chunkText(pdfData.text, 1000); // 1000 char chunks
                    
                    chunks.forEach((chunk, index) => {
                        const chunkId = `${file}_chunk_${index}`;
                        
                        // Check if this chunk already exists (simple duplicate prevention)
                        if (!this.processedChunks.has(chunkId)) {
                            documents.push(chunk);
                            metadatas.push({
                                source: file,
                                chunk: index,
                                total_chunks: chunks.length,
                                type: this.getDocumentType(file),
                                processed_at: new Date().toISOString()
                            });
                            ids.push(chunkId);
                            this.processedChunks.add(chunkId);
                            newChunksCount++;
                        }
                    });
                    
                    console.log(`[KnowledgeSystem] Processed ${file}: ${chunks.length} chunks (${newChunksCount} new)`);
                } catch (error) {
                    console.error(`[KnowledgeSystem] Error processing ${file}:`, error.message);
                }
            }

            if (documents.length > 0) {
                console.log(`[KnowledgeSystem] Adding ${documents.length} new document chunks to collection...`);
                await this.collection.add({
                    documents: documents,
                    metadatas: metadatas,
                    ids: ids
                });
                console.log(`[KnowledgeSystem] Knowledge files loaded successfully. Total chunks: ${existingCount + newChunksCount}`);
            } else {
                console.log('[KnowledgeSystem] No new documents to add');
            }
        } catch (error) {
            console.error('[KnowledgeSystem] Error loading knowledge files:', error.message);
        }
    }

    chunkText(text, chunkSize) {
        const chunks = [];
        const sentences = text.split(/[.!?]+/);
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence.trim();
            } else {
                currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    getDocumentType(filename) {
        const lowerName = filename.toLowerCase();
        if (lowerName.includes('code') && lowerName.includes('west')) return 'governing-spec';
        if (lowerName.includes('compass')) return 'internal-compass';
        if (lowerName.includes('epistemic')) return 'epistemic-framework';
        if (lowerName.includes('contradiction')) return 'contradiction-protocol';
        if (lowerName.includes('narrative')) return 'narrative-protocol';
        if (lowerName.includes('emergence')) return 'emergence-theory';
        if (lowerName.includes('ritual')) return 'ritual-theory';
        if (lowerName.includes('relational')) return 'relational-framework';
        return 'general-knowledge';
    }

    async searchKnowledge(query, limit = 5) {
        try {
            if (!this.collection) {
                throw new Error('Knowledge system not initialized');
            }

            const results = await this.collection.query({
                queryTexts: [query],
                nResults: limit
            });

            return {
                documents: results.documents[0] || [],
                metadatas: results.metadatas[0] || [],
                distances: results.distances[0] || []
            };
        } catch (error) {
            console.error('[KnowledgeSystem] Search error:', error.message);
            return { documents: [], metadatas: [], distances: [] };
        }
    }

    async addNewKnowledge(filePath, documentType = 'general-knowledge') {
        try {
            if (!filePath.toLowerCase().endsWith('.pdf')) {
                throw new Error('Only PDF files are supported');
            }

            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            const chunks = this.chunkText(pdfData.text, 1000);
            
            const documents = [];
            const metadatas = [];
            const ids = [];

            chunks.forEach((chunk, index) => {
                documents.push(chunk);
                metadatas.push({
                    source: path.basename(filePath),
                    chunk: index,
                    total_chunks: chunks.length,
                    type: documentType
                });
                ids.push(`${path.basename(filePath)}_chunk_${index}`);
            });

            await this.collection.add({
                documents: documents,
                metadatas: metadatas,
                ids: ids
            });

            console.log(`[KnowledgeSystem] Added ${chunks.length} chunks from ${path.basename(filePath)}`);
            return true;
        } catch (error) {
            console.error('[KnowledgeSystem] Error adding new knowledge:', error.message);
            return false;
        }
    }

    async addPersonalMemory(userId, memoryType, content, metadata = {}) {
        try {
            console.log(`[KnowledgeSystem] Adding personal memory for user ${userId}: ${memoryType}`);
            
            // Generate unique ID for this memory
            const memoryId = `personal_${userId}_${memoryType}_${Date.now()}`;
            
            // Add personal memories to RAG with user-specific metadata
            await this.collection.add({
                documents: [content],
                metadatas: [{
                    type: 'personal-memory',
                    userId: userId,
                    memoryType: memoryType, // 'story', 'relationship', 'preference', 'reflection'
                    timestamp: new Date().toISOString(),
                    ...metadata
                }],
                ids: [memoryId]
            });
            
            console.log(`[KnowledgeSystem] Personal memory added successfully`);
            return true;
        } catch (error) {
            console.error('[KnowledgeSystem] Error adding personal memory:', error);
            return false;
        }
    }

    async searchPersonalMemories(query, userId, limit = 3) {
        try {
            if (!this.collection) {
                throw new Error('Knowledge system not initialized');
            }

            // Search without where clause first, then filter manually
            const results = await this.collection.query({
                queryTexts: [query],
                nResults: limit * 10 // Get more results to filter through
            });

            // Filter to only personal memories for this user
            const personalResults = {
                documents: [],
                metadatas: [],
                distances: []
            };

            if (results.documents[0]) {
                results.documents[0].forEach((doc, index) => {
                    const metadata = results.metadatas[0][index];
                    if (metadata && metadata.userId === userId && (metadata.type === 'personal-memory' || metadata.type === 'full-self-reflection')) {
                        personalResults.documents.push(doc);
                        personalResults.metadatas.push(metadata);
                        personalResults.distances.push(results.distances[0][index]);
                    }
                });
            }

            // Limit to requested number
            personalResults.documents = personalResults.documents.slice(0, limit);
            personalResults.metadatas = personalResults.metadatas.slice(0, limit);
            personalResults.distances = personalResults.distances.slice(0, limit);

            return personalResults;
        } catch (error) {
            console.error('[KnowledgeSystem] Personal memory search error:', error.message);
            return { documents: [], metadatas: [], distances: [] };
        }
    }

    async searchKnowledgeWithUserContext(query, userId, limit = 5) {
        try {
            if (!this.collection) {
                throw new Error('Knowledge system not initialized');
            }

            // Get general knowledge
            const generalResults = await this.searchKnowledge(query, limit);
            
            // Get personal memories for this user
            const personalResults = await this.searchPersonalMemories(query, userId, 2);
            
            // Combine results with personal memories prioritized
            const combinedResults = {
                documents: [...personalResults.documents, ...generalResults.documents],
                metadatas: [...personalResults.metadatas, ...generalResults.metadatas],
                distances: [...personalResults.distances, ...generalResults.distances]
            };

            return combinedResults;
        } catch (error) {
            console.error('[KnowledgeSystem] Combined search error:', error.message);
            return { documents: [], metadatas: [], distances: [] };
        }
    }

    async getCollectionStats() {
        try {
            if (!this.collection) return null;
            
            const count = await this.collection.count();
            return {
                totalDocuments: count,
                collectionName: this.collectionName
            };
        } catch (error) {
            console.error('[KnowledgeSystem] Error getting stats:', error.message);
            return null;
        }
    }

    // NEW: Delete entries by keyword to surgically remove telemetry obsession
    async deleteByKeyword(keyword, limit = 100) {
        try {
            if (!this.collection) {
                console.warn('[KnowledgeSystem] Collection not initialized');
                return { deleted: 0, error: 'Collection not initialized' };
            }

            console.log(`[KnowledgeSystem] Searching for entries containing keyword: "${keyword}"`);
            
            // Search for entries containing the keyword
            const searchResults = await this.collection.query({
                queryTexts: [keyword],
                nResults: limit,
                include: ['metadatas', 'documents']
            });

            if (!searchResults.ids || searchResults.ids.length === 0) {
                console.log(`[KnowledgeSystem] No entries found containing keyword: "${keyword}"`);
                return { deleted: 0, keyword: keyword };
            }

            // Extract IDs to delete
            const idsToDelete = [];
            for (let i = 0; i < searchResults.ids.length; i++) {
                const document = searchResults.documents[i];
                const metadata = searchResults.metadatas[i];
                const id = searchResults.ids[i];
                
                // Check if the keyword appears in the document text or metadata
                const documentText = document ? document.toLowerCase() : '';
                const metadataText = metadata ? JSON.stringify(metadata).toLowerCase() : '';
                
                if (documentText.includes(keyword.toLowerCase()) || metadataText.includes(keyword.toLowerCase())) {
                    idsToDelete.push(id);
                    console.log(`[KnowledgeSystem] Marking for deletion: ${id} (contains "${keyword}")`);
                }
            }

            if (idsToDelete.length === 0) {
                console.log(`[KnowledgeSystem] No entries actually contain keyword: "${keyword}"`);
                return { deleted: 0, keyword: keyword };
            }

            // Delete the entries
            await this.collection.delete({
                ids: idsToDelete
            });

            console.log(`[KnowledgeSystem] Successfully deleted ${idsToDelete.length} entries containing keyword: "${keyword}"`);
            return { 
                deleted: idsToDelete.length, 
                keyword: keyword,
                deletedIds: idsToDelete
            };

        } catch (error) {
            console.error(`[KnowledgeSystem] Error deleting by keyword "${keyword}":`, error.message);
            return { 
                deleted: 0, 
                keyword: keyword, 
                error: error.message 
            };
        }
    }
}

module.exports = KnowledgeSystem;
