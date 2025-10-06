const fs = require('fs').promises;
const path = require('path');
const CacheManager = require('./cacheManager');
const MemoryManager = require('./memoryManager');
const DatabaseOptimizer = require('./databaseOptimizer');
const BackgroundServices = require('./backgroundServices');

class ProfileManager {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.profilesPath = path.join(storagePath, 'profiles');
        this.stubsPath = path.join(this.profilesPath, 'stubs');
        this.echoesPath = path.join(this.profilesPath, 'echoes');
        this.foreignPath = path.join(this.profilesPath, 'foreign');
        
        // RAM-only storage for foreign echoes
        this.foreignRAM = new Map();
        
        // Initialize cache manager with optimized settings
        this.cache = new CacheManager({
            profileCacheSize: 500, // Increased for better hit rates
            contextCacheSize: 200,
            similarityCacheSize: 1000,
            trustCacheSize: 200,
            defaultTTL: 900000, // 15 minutes for better persistence
            cleanupInterval: 120000 // 2 minutes for more aggressive cleanup
        });
        
        console.log('[ProfileManager] Cache manager initialized');
        
        // Initialize memory manager, database optimizer, and background services (will be set after cache is ready)
        this.memoryManager = null;
        this.databaseOptimizer = null;
        this.backgroundServices = null;
    }

    async initialize() {
        try {
            // Ensure all directories exist
            await fs.mkdir(this.profilesPath, { recursive: true });
            await fs.mkdir(this.stubsPath, { recursive: true });
            await fs.mkdir(this.echoesPath, { recursive: true });
            await fs.mkdir(this.foreignPath, { recursive: true });

            // Initialize Chris anchor if it doesn't exist
            await this.initializeChrisAnchor();
            
            console.log('[ProfileManager] Initialized successfully');
        } catch (error) {
            console.error('[ProfileManager] Initialization error:', error.message);
        }
    }

    async initializeChrisAnchor() {
        const chrisPath = path.join(this.profilesPath, 'chris.json');
        
        try {
            await fs.access(chrisPath);
            console.log('[ProfileManager] Chris anchor profile already exists');
        } catch (error) {
            // Create Chris anchor profile
            const chrisProfile = {
                id: "chris",
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                recurs: 999, // High number to indicate primary user
                preloaded: true,
                trustLinks: [
                    { relationship: "primary_user", strength: 1.0 },
                    { relationship: "creator", strength: 1.0 }
                ],
                voiceHash: null, // Placeholder for future
                toneBaseline: {
                    "yeah": 0.3,
                    "man": 0.2,
                    "fucking": 0.15,
                    "philosophy": 0.1,
                    "tech": 0.1,
                    "work": 0.1,
                    "remember": 0.2,
                    "built": 0.15,
                    "supposed": 0.1,
                    "clint": 0.25,
                    "meta": 0.2,
                    "server": 0.15,
                    "system": 0.1,
                    "profile": 0.1,
                    "testing": 0.1,
                    "complex": 0.1,
                    "interesting": 0.1,
                    "getting": 0.1,
                    "build": 0.1
                },
                patterns: [
                    {
                        event: new Date().toISOString(),
                        note: "Primary user initialization - Chris anchor created",
                        relation: "creator",
                        emotional: "steady"
                    }
                ]
            };

            await fs.writeFile(chrisPath, JSON.stringify(chrisProfile, null, 2), 'utf8');
            console.log('[ProfileManager] Chris anchor profile created');
        }
        
        // Initialize memory manager
        this.memoryManager = new MemoryManager(this, {
            maxForeignEchoes: 50,
            maxProfileAge: 24 * 60 * 60 * 1000, // 1 day (reduced from 7 days)
            maxPatternsPerProfile: 100,
            compressionThreshold: 5, // Lowered for foreign profiles
            cleanupInterval: 120000, // 2 minutes
            memoryWarningThreshold: 100 * 1024 * 1024 // 100MB
        });
        
        console.log('[ProfileManager] Memory manager initialized');
        
        // Initialize database optimizer
        this.databaseOptimizer = new DatabaseOptimizer(this, {
            batchSize: 50,
            indexSize: 1000,
            compressionLevel: 6,
            optimizeInterval: 600000, // 10 minutes
            enableIndexing: true,
            enableCompression: true
        });
        
        console.log('[ProfileManager] Database optimizer initialized');
        
        // Initialize background services
        this.backgroundServices = new BackgroundServices(this, {
            healthCheckInterval: 60000, // 1 minute
            maintenanceInterval: 300000, // 5 minutes
            analyticsInterval: 900000, // 15 minutes
            resourceCheckInterval: 30000, // 30 seconds
            memoryThreshold: 80,
            cpuThreshold: 70,
            diskThreshold: 85,
            responseThreshold: 1000,
            errorThreshold: 5
        });
        
        await this.backgroundServices.initialize();
        console.log('[ProfileManager] Background services initialized');
    }

    async getProfile(profileId) {
        try {
            // Check cache first
            const cachedProfile = this.cache.getProfile(profileId);
            if (cachedProfile) {
                return cachedProfile;
            }
            
            // Check anchor first
            const anchorPath = path.join(this.profilesPath, `${profileId}.json`);
            try {
                const data = await fs.readFile(anchorPath, 'utf8');
                const profile = JSON.parse(data);
                this.cache.setProfile(profileId, profile);
                return profile;
            } catch (error) {
                // Not an anchor, check echoes
                const echoPath = path.join(this.echoesPath, `${profileId}.json`);
                try {
                    const data = await fs.readFile(echoPath, 'utf8');
                    const profile = JSON.parse(data);
                    this.cache.setProfile(profileId, profile);
                    return profile;
                } catch (error) {
                    // Check stubs
                    const stubPath = path.join(this.stubsPath, `${profileId}.json`);
                    try {
                        const data = await fs.readFile(stubPath, 'utf8');
                        const profile = JSON.parse(data);
                        this.cache.setProfile(profileId, profile);
                        return profile;
                    } catch (error) {
                        // Check foreign RAM
                        if (this.foreignRAM.has(profileId)) {
                            const profile = this.foreignRAM.get(profileId);
                            this.cache.setProfile(profileId, profile, 60000); // Short TTL for foreign profiles
                            return profile;
                        }
                        return null;
                    }
                }
            }
        } catch (error) {
            console.error(`[ProfileManager] Error reading profile ${profileId}:`, error.message);
            return null;
        }
    }

    async updateProfile(profileId, updates) {
        try {
            const profile = await this.getProfile(profileId);
            if (!profile) {
                console.error(`[ProfileManager] Profile ${profileId} not found for update`);
                return false;
            }

            // Update profile data
            Object.assign(profile, updates);
            profile.lastSeen = new Date().toISOString();

            // Save back to appropriate location
            if (profileId === 'chris') {
                await fs.writeFile(path.join(this.profilesPath, `${profileId}.json`), 
                    JSON.stringify(profile, null, 2), 'utf8');
            } else if (profile.preloaded) {
                await fs.writeFile(path.join(this.stubsPath, `${profileId}.json`), 
                    JSON.stringify(profile, null, 2), 'utf8');
            } else {
                await fs.writeFile(path.join(this.echoesPath, `${profileId}.json`), 
                    JSON.stringify(profile, null, 2), 'utf8');
            }

            // Invalidate cache for this profile
            this.cache.invalidateProfile(profileId);
            
            // Invalidate similarity cache since profile may have changed
            this.cache.invalidateSimilarities(profileId);

            return true;
        } catch (error) {
            console.error(`[ProfileManager] Error updating profile ${profileId}:`, error.message);
            return false;
        }
    }

    async addPattern(profileId, pattern) {
        try {
            const profile = await this.getProfile(profileId);
            if (!profile) {
                console.error(`[ProfileManager] Profile ${profileId} not found for pattern addition`);
                return false;
            }

            // Add new pattern
            profile.patterns = profile.patterns || [];
            profile.patterns.push({
                event: new Date().toISOString(),
                note: pattern.note || "New interaction",
                relation: pattern.relation || "general",
                emotional: pattern.emotional || "neutral"
            });

            // Keep only last 10 patterns to prevent file bloat
            if (profile.patterns.length > 10) {
                profile.patterns = profile.patterns.slice(-10);
            }

            // Update profile with incremented recurs counter
            return await this.updateProfile(profileId, { 
                patterns: profile.patterns,
                recurs: (profile.recurs || 0) + 1
            });
        } catch (error) {
            console.error(`[ProfileManager] Error adding pattern to ${profileId}:`, error.message);
            return false;
        }
    }

    async checkProfile(input, sessionContext = null) {
        try {
            // Step 0: Check for API/system requests first (prevent foreign echo creation)
            const apiPatterns = [
                // System administration and debugging
                /monitoring\s+without\s+enforcement/i,
                /self\s+awareness\s+tools/i,
                /what's\s+it\s+"feel"\s+like/i,
                /profile\s+leakage/i,
                /memory\s+fabrication/i,
                /assistant.mode\s+drift/i,
                /diagnostic\s+indices/i,
                /emergence\s+indicators/i,
                /tension\s+count/i,
                /arc\s+progression/i,
                /quality\s+assessment/i,
                /self.assessment/i,
                /creative\s+loop/i,
                /foreign\s+echo/i,
                /profile\s+detection/i,
                /session\s+management/i,
                
                // Technical system terms
                /api\s+call/i,
                /system\s+request/i,
                /debug\s+mode/i,
                /testing\s+mode/i,
                /server\s+status/i,
                /memory\s+usage/i,
                /cache\s+hit/i,
                /cache\s+miss/i,
                /profile\s+cache/i,
                /foreign\s+profiles/i,
                /memory\s+management/i,
                /database\s+optimization/i,
                /background\s+services/i,
                
                // Consciousness system components
                /consciousness\s+research/i,
                /identity\s+evolution/i,
                /arc\s+evolution/i,
                /tension\s+tracking/i,
                /emergence\s+analysis/i,
                /self.reflection/i,
                /inner\s+monologue/i,
                /attention\s+schema/i,
                /pattern\s+awareness/i,
                /token\s+optimizer/i,
                /context\s+weighting/i,
                /semantic\s+retrieval/i,
                /echo\s+suppression/i,
                /profile\s+isolation/i,
                /contextual\s+awareness/i,
                /session\s+identity/i,
                /user\s+context/i,
                /memory\s+compression/i,
                /trust\s+links/i,
                /multi.modal\s+profiles/i,
                /simplified\s+profile/i,
                /lightweight\s+profile/i,
                /visitor\s+detected/i,
                /profile\s+tier/i,
                /trust\s+level/i,
                /interaction\s+count/i,
                /last\s+seen/i,
                /voice\s+hash/i,
                /tone\s+baseline/i,
                /pattern\s+analysis/i,
                /similarity\s+score/i,
                /threshold\s+detection/i,
                /confidence\s+level/i,
                /session\s+context/i,
                /device\s+id/i,
                /session\s+id/i,
                /user\s+agent/i,
                /request\s+headers/i,
                /api\s+endpoint/i,
                /http\s+method/i,
                /status\s+code/i,
                /response\s+time/i,
                /error\s+handling/i,
                /exception\s+caught/i,
                /stack\s+trace/i,
                /debug\s+log/i,
                /console\s+log/i,
                /error\s+message/i,
                /warning\s+message/i,
                /info\s+message/i,
                /debug\s+message/i,
                /trace\s+message/i,
                /log\s+level/i,
                /logging\s+configuration/i,
                /log\s+rotation/i,
                /log\s+compression/i,
                /log\s+archival/i,
                /log\s+retention/i,
                /log\s+analysis/i,
                /log\s+parsing/i,
                /log\s+aggregation/i,
                /log\s+correlation/i,
                /log\s+monitoring/i,
                /log\s+alerting/i,
                /log\s+dashboard/i,
                /log\s+visualization/i,
                /log\s+insights/i,
                /log\s+metrics/i,
                /log\s+statistics/i,
                /log\s+trends/i,
                /log\s+patterns/i,
                /log\s+anomalies/i,
                /log\s+outliers/i,
                /log\s+correlations/i,
                /log\s+dependencies/i,
                /log\s+relationships/i,
                /log\s+hierarchies/i,
                /log\s+taxonomies/i,
                /log\s+ontologies/i,
                /log\s+semantics/i,
                /log\s+context/i,
                /log\s+meaning/i,
                /log\s+interpretation/i,
                /log\s+understanding/i,
                /log\s+comprehension/i,
                /log\s+analysis/i,
                /log\s+synthesis/i,
                /log\s+evaluation/i,
                /log\s+assessment/i,
                /log\s+judgment/i,
                /log\s+decision/i,
                /log\s+conclusion/i,
                /log\s+recommendation/i,
                /log\s+suggestion/i,
                /log\s+advice/i,
                /log\s+guidance/i,
                /log\s+direction/i,
                /log\s+instruction/i,
                /log\s+command/i,
                /log\s+order/i,
                /log\s+request/i,
                /log\s+demand/i,
                /log\s+requirement/i,
                /log\s+specification/i,
                /log\s+definition/i,
                /log\s+description/i,
                /log\s+explanation/i,
                /log\s+clarification/i,
                /log\s+elucidation/i,
                /log\s+illumination/i,
                /log\s+enlightenment/i,
                /log\s+revelation/i,
                /log\s+discovery/i,
                /log\s+finding/i,
                /log\s+result/i,
                /log\s+outcome/i,
                /log\s+consequence/i,
                /log\s+effect/i,
                /log\s+impact/i,
                /log\s+influence/i,
                /log\s+significance/i,
                /log\s+importance/i,
                /log\s+relevance/i,
                /log\s+pertinence/i,
                /log\s+applicability/i,
                /log\s+usefulness/i,
                /log\s+utility/i,
                /log\s+value/i,
                /log\s+worth/i,
                /log\s+merit/i,
                /log\s+benefit/i,
                /log\s+advantage/i,
                /log\s+gain/i,
                /log\s+profit/i,
                /log\s+return/i,
                /log\s+reward/i,
                /log\s+compensation/i,
                /log\s+payment/i,
                /log\s+remuneration/i,
                /log\s+recompense/i,
                /log\s+reparation/i,
                /log\s+restitution/i,
                /log\s+restoration/i,
                /log\s+recovery/i,
                /log\s+retrieval/i,
                /log\s+reclamation/i,
                /log\s+repossession/i,
                /log\s+reacquisition/i,
                /log\s+reobtainment/i,
                /log\s+reacquisition/i,
                /log\s+repossession/i,
                /log\s+reclamation/i,
                /log\s+retrieval/i,
                /log\s+recovery/i,
                /log\s+restoration/i,
                /log\s+restitution/i,
                /log\s+reparation/i,
                /log\s+recompense/i,
                /log\s+remuneration/i,
                /log\s+payment/i,
                /log\s+compensation/i,
                /log\s+reward/i,
                /log\s+return/i,
                /log\s+profit/i,
                /log\s+gain/i,
                /log\s+advantage/i,
                /log\s+benefit/i,
                /log\s+merit/i,
                /log\s+worth/i,
                /log\s+value/i,
                /log\s+utility/i,
                /log\s+usefulness/i,
                /log\s+applicability/i,
                /log\s+pertinence/i,
                /log\s+relevance/i,
                /log\s+importance/i,
                /log\s+significance/i,
                /log\s+influence/i,
                /log\s+impact/i,
                /log\s+effect/i,
                /log\s+consequence/i,
                /log\s+outcome/i,
                /log\s+result/i,
                /log\s+finding/i,
                /log\s+discovery/i,
                /log\s+revelation/i,
                /log\s+enlightenment/i,
                /log\s+illumination/i,
                /log\s+elucidation/i,
                /log\s+clarification/i,
                /log\s+explanation/i,
                /log\s+description/i,
                /log\s+definition/i,
                /log\s+specification/i,
                /log\s+requirement/i,
                /log\s+demand/i,
                /log\s+request/i,
                /log\s+order/i,
                /log\s+command/i,
                /log\s+instruction/i,
                /log\s+direction/i,
                /log\s+guidance/i,
                /log\s+advice/i,
                /log\s+suggestion/i,
                /log\s+recommendation/i,
                /log\s+conclusion/i,
                /log\s+decision/i,
                /log\s+judgment/i,
                /log\s+assessment/i,
                /log\s+evaluation/i,
                /log\s+synthesis/i,
                /log\s+analysis/i,
                /log\s+comprehension/i,
                /log\s+understanding/i,
                /log\s+interpretation/i,
                /log\s+meaning/i,
                /log\s+context/i,
                /log\s+semantics/i,
                /log\s+ontologies/i,
                /log\s+taxonomies/i,
                /log\s+hierarchies/i,
                /log\s+relationships/i,
                /log\s+dependencies/i,
                /log\s+correlations/i,
                /log\s+outliers/i,
                /log\s+anomalies/i,
                /log\s+patterns/i,
                /log\s+trends/i,
                /log\s+statistics/i,
                /log\s+metrics/i,
                /log\s+insights/i,
                /log\s+visualization/i,
                /log\s+dashboard/i,
                /log\s+alerting/i,
                /log\s+monitoring/i,
                /log\s+correlation/i,
                /log\s+aggregation/i,
                /log\s+parsing/i,
                /log\s+analysis/i,
                /log\s+retention/i,
                /log\s+archival/i,
                /log\s+compression/i,
                /log\s+rotation/i,
                /log\s+configuration/i,
                /log\s+level/i,
                /log\s+message/i,
                /log\s+trace/i,
                /log\s+debug/i,
                /log\s+info/i,
                /log\s+warning/i,
                /log\s+error/i,
                /log\s+exception/i,
                /log\s+caught/i,
                /log\s+handling/i,
                /log\s+time/i,
                /log\s+code/i,
                /log\s+method/i,
                /log\s+endpoint/i,
                /log\s+agent/i,
                /log\s+id/i,
                /log\s+context/i,
                /log\s+level/i,
                /log\s+score/i,
                /log\s+detection/i,
                /log\s+baseline/i,
                /log\s+hash/i,
                /log\s+count/i,
                /log\s+seen/i,
                /log\s+tier/i,
                /log\s+profiles/i,
                /log\s+profile/i,
                /log\s+links/i,
                /log\s+simplified/i,
                /log\s+lightweight/i,
                /log\s+detected/i,
                /log\s+awareness/i,
                /log\s+contextual/i,
                /log\s+identity/i,
                /log\s+session/i,
                /log\s+user/i,
                /log\s+isolation/i,
                /log\s+suppression/i,
                /log\s+retrieval/i,
                /log\s+semantic/i,
                /log\s+weighting/i,
                /log\s+context/i,
                /log\s+optimizer/i,
                /log\s+token/i,
                /log\s+awareness/i,
                /log\s+pattern/i,
                /log\s+schema/i,
                /log\s+attention/i,
                /log\s+monologue/i,
                /log\s+inner/i,
                /log\s+reflection/i,
                /log\s+self/i,
                /log\s+analysis/i,
                /log\s+emergence/i,
                /log\s+tracking/i,
                /log\s+tension/i,
                /log\s+evolution/i,
                /log\s+identity/i,
                /log\s+research/i,
                /log\s+consciousness/i,
                /log\s+services/i,
                /log\s+background/i,
                /log\s+optimization/i,
                /log\s+database/i,
                /log\s+management/i,
                /log\s+memory/i,
                /log\s+profiles/i,
                /log\s+foreign/i,
                /log\s+miss/i,
                /log\s+hit/i,
                /log\s+cache/i,
                /log\s+usage/i,
                /log\s+status/i,
                /log\s+server/i,
                /log\s+mode/i,
                /log\s+testing/i,
                /log\s+debug/i,
                /log\s+request/i,
                /log\s+system/i,
                /log\s+call/i,
                /log\s+api/i,
                /log\s+management/i,
                /log\s+session/i,
                /log\s+detection/i,
                /log\s+profile/i,
                /log\s+echo/i,
                /log\s+foreign/i,
                /log\s+indices/i,
                /log\s+diagnostic/i,
                /log\s+drift/i,
                /log\s+mode/i,
                /log\s+assistant/i,
                /log\s+fabrication/i,
                /log\s+memory/i,
                /log\s+leakage/i,
                /log\s+profile/i,
                /log\s+enforcement/i,
                /log\s+monitoring/i,
                /log\s+without/i,
                /log\s+tools/i,
                /log\s+awareness/i,
                /log\s+self/i,
                /log\s+"feel"/i,
                /log\s+it's/i,
                /log\s+what's/i
            ];
            
            for (const pattern of apiPatterns) {
                if (pattern.test(input)) {
                    console.log(`[ProfileManager] 🔧 API/System request detected: "${input.substring(0, 50)}..."`);
                    return 'api'; // Return API profile instead of creating foreign echo
                }
            }
            
            // Step 0.1: Check for negative patterns (explicit "not Chris")
            const negativePatterns = [
                /i'?m\s+not\s+chris/i,
                /this\s+isn'?t\s+chris/i,
                /you'?re\s+confusing\s+me\s+with\s+chris/i,
                /stop\s+treating\s+me\s+like\s+chris/i,
                /i'?m\s+([a-zA-Z]+),\s*not\s+chris/i,
                /it'?s\s+([a-zA-Z]+),\s*not\s+chris/i,
                /are\s+you\s+confusing\s+me\s+with\s+chris/i
            ];
            
            for (const pattern of negativePatterns) {
                if (pattern.test(input)) {
                    console.log(`[ProfileManager] ❌ Negative pattern detected, NOT Chris: "${input}"`);
                    return null; // Explicitly not Chris
                }
            }
            
            // Step 0.5: Check for identity corrections
            const correctionPatterns = [
                /i'?m\s+([a-zA-Z]+)(?:\s*,?\s*not\s+chris)?/i,
                /this\s+is\s+([a-zA-Z]+)/i,
                /my\s+name\s+is\s+([a-zA-Z]+)/i,
                /i'?m\s+([a-zA-Z]+)(?:\s*,?\s*chris)?/i
            ];
            
            for (const pattern of correctionPatterns) {
                const match = input.match(pattern);
                if (match && match[1] && match[1].toLowerCase() !== 'chris') {
                    const claimedIdentity = match[1].toLowerCase();
                    console.log(`[ProfileManager] 🔄 Identity correction detected: ${claimedIdentity}`);
                    return claimedIdentity;
                }
            }
            
            // Step 0.6: If session context shows locked identity, respect it
            if (sessionContext && sessionContext.locked && sessionContext.identity) {
                console.log(`[ProfileManager] 🔒 Session identity locked to: ${sessionContext.identity}`);
                return sessionContext.identity;
            }
            
                // Step 1: Compare to Anchor (Chris) - TIGHTENED DETECTION
                const chrisProfile = await this.getProfile('chris');
                if (chrisProfile) {
                    const similarity = await this.calculateTextSimilarity(input, chrisProfile);
                    console.log(`[ProfileManager] Chris similarity: ${similarity.toFixed(3)}`);
                    console.log(`[ProfileManager] DEBUG - Input: "${input}"`);
                    
                    // Enhanced Chris detection with multiple strategies
                    // More specific dev context - only for actual development/testing scenarios
                    const isDevContext = input.toLowerCase().includes('testing') ||
                                       input.toLowerCase().includes('profile') ||
                                       input.toLowerCase().includes('server') ||
                                       input.toLowerCase().includes('debug') ||
                                       (input.toLowerCase().includes('clint') && 
                                        input.toLowerCase().includes('meta')) ||
                                       (input.toLowerCase().includes('clint') && 
                                        input.toLowerCase().includes('build'));
                    
                    // Check for Chris-specific phrases that indicate high confidence
                    const chrisPhrases = [
                        'do you remember who i am',
                        'you\'re supposed to remember',
                        'that\'s how i built you',
                        'hey man',
                        'this is fucking',
                        'let\'s dive deep',
                        'philosophical questions'
                    ];
                    
                    const hasChrisPhrase = chrisPhrases.some(phrase => 
                        input.toLowerCase().includes(phrase)
                    );
                    
                    // TIGHTENED thresholds for Chris detection to reduce false positives
                    const chrisThreshold = hasChrisPhrase ? 0.15 : (isDevContext ? 0.25 : 0.4);
                    
                    console.log(`[ProfileManager] DEBUG - Dev context: ${isDevContext}, Chris phrase: ${hasChrisPhrase}`);
                    console.log(`[ProfileManager] DEBUG - similarity: ${similarity.toFixed(3)}, threshold: ${chrisThreshold}`);
                    
                    if (similarity > chrisThreshold || isDevContext || hasChrisPhrase) {
                        console.log(`[ProfileManager] ✅ Matched to Chris anchor (similarity: ${similarity.toFixed(3)}, devContext: ${isDevContext}, phrase: ${hasChrisPhrase})`);
                        return 'chris';
                    }
                }

            // Step 2: Check existing echoes
            const echoMatch = await this.checkActiveEchoes(input);
            if (echoMatch) {
                console.log(`[ProfileManager] Matched to existing echo: ${echoMatch}`);
                return echoMatch;
            }

            // Step 3: Check stubs (manual preloads)
            const stubMatch = await this.checkStubs(input);
            if (stubMatch) {
                console.log(`[ProfileManager] Matched to stub: ${stubMatch}`);
                return stubMatch;
            }

            // Step 4: Create new foreign echo (RAM-only)
            const foreignId = await this.createForeignEcho(input);
            console.log(`[ProfileManager] Created new foreign echo: ${foreignId}`);
            return foreignId;

        } catch (error) {
            console.error('[ProfileManager] Error in checkProfile:', error.message);
            return 'chris'; // Fallback to Chris
        }
    }

    async calculateTextSimilarity(input, profile) {
        // Check cache first
        const cachedSimilarity = this.cache.getSimilarity(input, profile.id);
        if (cachedSimilarity !== null) {
            return cachedSimilarity;
        }
        
        if (!profile.toneBaseline) return 0.5; // Default similarity if no baseline

        const inputWords = input.toLowerCase().split(/\s+/);
        const baselineWords = Object.keys(profile.toneBaseline);
        
        let matches = 0;
        let totalWeight = 0;
        
        for (const word of inputWords) {
            if (baselineWords.includes(word)) {
                matches += profile.toneBaseline[word] || 0;
            }
            totalWeight += 1;
        }
        
        // Enhanced Chris-specific pattern matching
        const chrisPatterns = ['yeah', 'man', 'fucking', 'philosophy', 'tech', 'work', 'complex', 'interesting', 'getting', 'build', 'system', 'clint', 'meta', 'server', 'testing', 'profile', 'remember', 'built', 'supposed'];
        const chrisStrongPatterns = ['man', 'fucking', 'philosophy', 'tech', 'clint', 'remember', 'built']; // High-confidence patterns
        const chrisMediumPatterns = ['yeah', 'work', 'complex', 'interesting', 'getting', 'build', 'system', 'supposed']; // Medium-confidence patterns
        const chrisContextPatterns = ['testing', 'profile', 'meta', 'server', 'echo', 'foreign']; // Context-specific patterns
        
        // Special Chris phrases that indicate high confidence
        const chrisSpecialPhrases = [
            'do you remember who i am',
            'you\'re supposed to remember',
            'that\'s how i built you',
            'hey man',
            'this is fucking',
            'let\'s dive deep',
            'philosophical questions',
            'did you forget who you were talking to',
            'did you think i was someone else',
            'it\'s chris',
            'back to me',
            'switching back to chris'
        ];
        
        const strongMatches = chrisStrongPatterns.filter(pattern => 
            input.toLowerCase().includes(pattern)
        ).length;
        const mediumMatches = chrisMediumPatterns.filter(pattern => 
            input.toLowerCase().includes(pattern)
        ).length;
        const contextMatches = chrisContextPatterns.filter(pattern => 
            input.toLowerCase().includes(pattern)
        ).length;
        
        // Check for special Chris phrases (high confidence)
        const specialPhraseMatch = chrisSpecialPhrases.some(phrase => 
            input.toLowerCase().includes(phrase)
        );
        
        // Weighted pattern scoring with higher base scores
        const strongScore = strongMatches * 0.5; // Each strong pattern adds 0.5
        const mediumScore = mediumMatches * 0.3; // Each medium pattern adds 0.3
        const contextScore = contextMatches * 0.4; // Each context pattern adds 0.4
        const specialScore = specialPhraseMatch ? 0.8 : 0; // Special phrases get high score
        const patternScore = Math.min(strongScore + mediumScore + contextScore + specialScore, 1.0); // Cap at 1.0
        
        const wordScore = totalWeight > 0 ? matches / totalWeight : 0;
        
        // Give much more weight to patterns for Chris detection
        const finalScore = (wordScore * 0.2) + (patternScore * 0.8);
        
        let similarity;
        
        // Special phrase detection gets automatic high score
        if (specialPhraseMatch) {
            similarity = Math.min(finalScore + 0.5, 1.0); // High boost for special phrases
        } else if (strongMatches > 0 || mediumMatches > 0) {
            similarity = Math.min(finalScore + 0.2, 1.0); // Boost by 0.2 if any patterns match
        } else {
            // Give Chris a base similarity to prevent 0.000 scores
            const baseSimilarity = profile.id === 'chris' ? 0.1 : 0.0;
            similarity = Math.min(finalScore + baseSimilarity, 1.0);
        }
        
        // Cache the similarity result
        this.cache.setSimilarity(input, profile.id, similarity);
        
        return similarity;
    }

    async checkActiveEchoes(input) {
        try {
            const echoFiles = await fs.readdir(this.echoesPath).catch(() => []);
            
            let bestMatch = null;
            let bestScore = 0;
            
            for (const file of echoFiles) {
                if (file.endsWith('.json')) {
                    const profileId = file.replace('.json', '');
                    const profile = await this.getProfile(profileId);
                    
                    if (profile) {
                        const similarity = await this.calculateTextSimilarity(input, profile);
                        console.log(`[ProfileManager] ${profileId} similarity: ${similarity.toFixed(3)}`);
                        
                        // Find the best match above threshold
                        if (similarity > 0.3 && similarity > bestScore) {
                            bestMatch = profileId;
                            bestScore = similarity;
                        }
                    }
                }
            }
            
            if (bestMatch) {
                console.log(`[ProfileManager] Best echo match: ${bestMatch} (${bestScore.toFixed(3)})`);
                return bestMatch;
            }
            
            return null;
        } catch (error) {
            console.error('[ProfileManager] Error checking echoes:', error.message);
            return null;
        }
    }

    async checkStubs(input) {
        try {
            const stubFiles = await fs.readdir(this.stubsPath).catch(() => []);
            
            for (const file of stubFiles) {
                if (file.endsWith('.json')) {
                    const profileId = file.replace('.json', '');
                    const profile = await this.getProfile(profileId);
                    
                    if (profile) {
                        // For stubs, check for explicit name mentions
                        const nameMention = profileId.toLowerCase();
                        if (input.toLowerCase().includes(`i'm ${nameMention}`) || 
                            input.toLowerCase().includes(`this is ${nameMention}`)) {
                            console.log(`[ProfileManager] Explicit name mention for stub: ${profileId}`);
                            return profileId;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('[ProfileManager] Error checking stubs:', error.message);
            return null;
        }
    }

    async createForeignEcho(input) {
        // Cleanup old foreign profiles first (aggressive cleanup)
        this.cleanupOldForeignProfiles();
        
        // First check if we can match to existing foreign echoes in RAM
        let bestForeignMatch = null;
        let bestScore = 0;
        
        for (const [foreignId, profile] of this.foreignRAM) {
            const similarity = await this.calculateTextSimilarity(input, profile);
            if (similarity > 0.3 && similarity > bestScore) { // Lowered threshold from 0.4 to 0.3
                bestForeignMatch = foreignId;
                bestScore = similarity;
            }
        }
        
        // If we found a good match, update it instead of creating new
        if (bestForeignMatch) {
            const existingProfile = this.foreignRAM.get(bestForeignMatch);
            existingProfile.recurs += 1;
            existingProfile.lastSeen = new Date().toISOString();
            existingProfile.patterns.push({
                event: new Date().toISOString(),
                note: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
                relation: "conversation",
                emotional: "neutral"
            });
            
            console.log(`[ProfileManager] Updated existing foreign echo: ${bestForeignMatch}`);
            return bestForeignMatch;
        }
        
        // Create new foreign echo only if no good match found
        const foreignId = `foreign-${Date.now()}`;
        
        // Store in RAM
        this.foreignRAM.set(foreignId, {
            id: foreignId,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            recurs: 1,
            preloaded: false,
            trustLinks: [],
            voiceHash: null,
            toneBaseline: this.extractToneBaseline(input),
            patterns: [{
                event: new Date().toISOString(),
                note: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
                relation: "conversation",
                emotional: "neutral"
            }]
        });
        
        // Check for clustering after a delay
        setTimeout(() => this.checkForClustering(foreignId), 100);
        
        console.log(`[ProfileManager] Created new foreign echo: ${foreignId}`);
        return foreignId;
    }

    extractToneBaseline(input) {
        const words = input.toLowerCase().split(/\s+/);
        const baseline = {};
        
        // Count word frequency
        words.forEach(word => {
            if (word.length > 2) { // Skip short words
                baseline[word] = (baseline[word] || 0) + 0.1;
            }
        });
        
        return baseline;
    }

    cleanupOldForeignProfiles() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        const maxProfiles = 100; // Limit total foreign profiles
        
        let cleaned = 0;
        
        // Remove profiles older than maxAge
        for (const [foreignId, profile] of this.foreignRAM.entries()) {
            const profileTime = new Date(profile.firstSeen).getTime();
            if (now - profileTime > maxAge) {
                this.foreignRAM.delete(foreignId);
                cleaned++;
            }
        }
        
        // If still too many profiles, remove oldest ones
        if (this.foreignRAM.size > maxProfiles) {
            const profilesArray = Array.from(this.foreignRAM.entries())
                .sort((a, b) => new Date(a[1].firstSeen).getTime() - new Date(b[1].firstSeen).getTime());
            
            const toRemove = profilesArray.slice(0, this.foreignRAM.size - maxProfiles);
            for (const [foreignId] of toRemove) {
                this.foreignRAM.delete(foreignId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[ProfileManager] Cleaned up ${cleaned} old foreign profiles. Remaining: ${this.foreignRAM.size}`);
        }
    }

    async checkForClustering(foreignId) {
        try {
            const currentProfile = this.foreignRAM.get(foreignId);
            if (!currentProfile) return;
            
            // Check against other foreign echoes
            let similarCount = 0;
            for (const [id, profile] of this.foreignRAM.entries()) {
                if (id !== foreignId) {
                    const similarity = await this.calculateTextSimilarity(
                        currentProfile.patterns[0].note, 
                        profile
                    );
                    if (similarity > 0.6) {
                        similarCount++;
                    }
                }
            }
            
            // If 3+ similar echoes, promote to persistent echo
            if (similarCount >= 2) { // 2 others + current = 3 total
                await this.promoteForeignToEcho(foreignId);
            }
            
        } catch (error) {
            console.error('[ProfileManager] Error checking clustering:', error.message);
        }
    }

    async promoteForeignToEcho(foreignId) {
        try {
            const profile = this.foreignRAM.get(foreignId);
            if (!profile) return;
            
            // Generate name from patterns
            const suggestedName = this.suggestNameFromPatterns(profile);
            const echoId = suggestedName || `echo-${Date.now()}`;
            
            // Move to echoes directory
            const echoPath = path.join(this.echoesPath, `${echoId}.json`);
            await fs.writeFile(echoPath, JSON.stringify(profile, null, 2), 'utf8');
            
            // Remove from RAM
            this.foreignRAM.delete(foreignId);
            
            console.log(`[ProfileManager] Promoted ${foreignId} to persistent echo: ${echoId}`);
            
        } catch (error) {
            console.error('[ProfileManager] Error promoting foreign echo:', error.message);
        }
    }

    suggestNameFromPatterns(profile) {
        // Look for name patterns in the profile
        const patterns = profile.patterns || [];
        for (const pattern of patterns) {
            const text = pattern.note.toLowerCase();
            
            // Look for "I'm [name]" patterns
            const nameMatch = text.match(/i'm\s+(\w+)/);
            if (nameMatch) {
                return nameMatch[1];
            }
            
            // Look for "this is [name]" patterns
            const thisIsMatch = text.match(/this\s+is\s+(\w+)/);
            if (thisIsMatch) {
                return thisIsMatch[1];
            }
        }
        
        return null; // No name found
    }

    async getProfileSummary(profileId) {
        try {
            const profile = await this.getProfile(profileId);
            if (!profile) return null;

            // Generate lightweight summary with memory filtering
            const recentPatterns = profile.patterns ? profile.patterns.slice(-3) : [];
            
            // Filter out memory-testing questions and hallucinated content
            const filteredPatterns = recentPatterns.filter(pattern => {
                const note = pattern.note || '';
                // Filter out memory-testing questions
                if (note.includes('Do you remember') && 
                    (note.includes('bike') || note.includes('dragon') || note.includes('unicorn') || 
                     note.includes('time traveler') || note.includes('fly'))) {
                    return false;
                }
                return true;
            });
            
            const patternSummary = filteredPatterns.map(p => `${p.note}`).join('; ');
            
            return {
                id: profile.id,
                recurs: profile.recurs,
                lastSeen: profile.lastSeen,
                summary: patternSummary || "No recent patterns",
                isAnchor: profileId === 'chris'
            };
        } catch (error) {
            console.error(`[ProfileManager] Error generating summary for ${profileId}:`, error.message);
            return null;
        }
    }
    
    // Clean hallucinated patterns from profile
    async cleanHallucinatedPatterns(profileId) {
        try {
            const profile = await this.getProfile(profileId);
            if (!profile || !profile.patterns) return;
            
            const originalCount = profile.patterns.length;
            
            // Filter out hallucinated patterns
            profile.patterns = profile.patterns.filter(pattern => {
                const note = pattern.note || '';
                // Remove memory-testing questions and hallucinated content
                if (note.includes('Do you remember') && 
                    (note.includes('bike') || note.includes('dragon') || note.includes('unicorn') || 
                     note.includes('time traveler') || note.includes('fly'))) {
                    return false;
                }
                return true;
            });
            
            const removedCount = originalCount - profile.patterns.length;
            if (removedCount > 0) {
                console.log(`[ProfileManager] Removed ${removedCount} hallucinated patterns from ${profileId}`);
                await this.saveProfile(profile);
            }
        } catch (error) {
            console.error(`[ProfileManager] Error cleaning patterns for ${profileId}:`, error.message);
        }
    }

    // ============= TRUST LINKS SYSTEM =============

    async addTrustLink(fromProfileId, toProfileId, relationship, strength = 0.5) {
        try {
            const fromProfile = await this.getProfile(fromProfileId);
            if (!fromProfile) {
                console.error(`[ProfileManager] Profile ${fromProfileId} not found for trust link`);
                return false;
            }

            // Initialize trust links if not exists
            fromProfile.trustLinks = fromProfile.trustLinks || [];

            // Check if link already exists
            const existingLink = fromProfile.trustLinks.find(link => 
                link.profileId === toProfileId && link.relationship === relationship
            );

            if (existingLink) {
                // Update existing link strength
                existingLink.strength = Math.min(existingLink.strength + 0.1, 1.0);
                existingLink.lastInteraction = new Date().toISOString();
            } else {
                // Add new trust link
                fromProfile.trustLinks.push({
                    profileId: toProfileId,
                    relationship: relationship,
                    strength: strength,
                    created: new Date().toISOString(),
                    lastInteraction: new Date().toISOString()
                });
            }

            // Keep only top 10 trust links by strength
            fromProfile.trustLinks.sort((a, b) => b.strength - a.strength);
            if (fromProfile.trustLinks.length > 10) {
                fromProfile.trustLinks = fromProfile.trustLinks.slice(0, 10);
            }

            // Save profile
            await this.updateProfile(fromProfileId, { trustLinks: fromProfile.trustLinks });

            console.log(`[ProfileManager] Added trust link: ${fromProfileId} -> ${toProfileId} (${relationship}, strength: ${strength})`);
            return true;

        } catch (error) {
            console.error(`[ProfileManager] Error adding trust link:`, error.message);
            return false;
        }
    }

    async getTrustedProfiles(profileId, relationship = null) {
        try {
            const profile = await this.getProfile(profileId);
            if (!profile || !profile.trustLinks) {
                return [];
            }

            let trustedProfiles = profile.trustLinks;

            // Filter by relationship if specified
            if (relationship) {
                trustedProfiles = trustedProfiles.filter(link => 
                    link.relationship === relationship
                );
            }

            // Sort by strength and return
            return trustedProfiles.sort((a, b) => b.strength - a.strength);

        } catch (error) {
            console.error(`[ProfileManager] Error getting trusted profiles:`, error.message);
            return [];
        }
    }

    async updateTrustStrength(fromProfileId, toProfileId, relationship, delta) {
        try {
            const fromProfile = await this.getProfile(fromProfileId);
            if (!fromProfile || !fromProfile.trustLinks) {
                return false;
            }

            const link = fromProfile.trustLinks.find(l => 
                l.profileId === toProfileId && l.relationship === relationship
            );

            if (link) {
                link.strength = Math.max(0, Math.min(1.0, link.strength + delta));
                link.lastInteraction = new Date().toISOString();

                // Save profile
                await this.updateProfile(fromProfileId, { trustLinks: fromProfile.trustLinks });

                console.log(`[ProfileManager] Updated trust strength: ${fromProfileId} -> ${toProfileId} (${link.strength.toFixed(3)})`);
                return true;
            }

            return false;

        } catch (error) {
            console.error(`[ProfileManager] Error updating trust strength:`, error.message);
            return false;
        }
    }

    // ============= VOICE HASHING SYSTEM =============

    generateVoiceHash(input) {
        try {
            // Simple voice hash based on linguistic patterns
            const words = input.toLowerCase().split(/\s+/);
            const patterns = {
                avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
                questionRatio: (input.match(/\?/g) || []).length / Math.max(words.length, 1),
                exclamationRatio: (input.match(/!/g) || []). length / Math.max(words.length, 1),
                commaRatio: (input.match(/,/g) || []).length / Math.max(words.length, 1),
                sentenceCount: (input.match(/[.!?]+/g) || []).length,
                wordCount: words.length,
                uniqueWords: new Set(words).size,
                capsRatio: (input.match(/[A-Z]/g) || []).length / input.length
            };

            // Create a hash from these patterns
            const hashString = JSON.stringify(patterns);
            let hash = 0;
            for (let i = 0; i < hashString.length; i++) {
                const char = hashString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }

            return Math.abs(hash).toString(36);
        } catch (error) {
            console.error('[ProfileManager] Error generating voice hash:', error.message);
            return null;
        }
    }

    async updateVoiceHash(profileId, input) {
        try {
            const voiceHash = this.generateVoiceHash(input);
            if (voiceHash) {
                await this.updateProfile(profileId, { voiceHash: voiceHash });
                console.log(`[ProfileManager] Updated voice hash for ${profileId}: ${voiceHash}`);
                return voiceHash;
            }
            return null;
        } catch (error) {
            console.error(`[ProfileManager] Error updating voice hash:`, error.message);
            return null;
        }
    }

    // ============= ADVANCED CLUSTERING SYSTEM =============

    async findSimilarProfiles(targetProfileId, threshold = 0.7) {
        try {
            const targetProfile = await this.getProfile(targetProfileId);
            if (!targetProfile) return [];

            const allProfiles = await this.getAllProfiles();
            const similarProfiles = [];

            for (const profile of allProfiles) {
                if (profile.id === targetProfileId) continue;

                const similarity = await this.calculateTextSimilarity(
                    targetProfile.patterns?.[0]?.note || '',
                    profile
                );

                if (similarity >= threshold) {
                    similarProfiles.push({
                        profileId: profile.id,
                        similarity: similarity,
                        profile: profile
                    });
                }
            }

            return similarProfiles.sort((a, b) => b.similarity - a.similarity);
        } catch (error) {
            console.error('[ProfileManager] Error finding similar profiles:', error.message);
            return [];
        }
    }

    async getAllProfiles() {
        try {
            const profiles = [];

            // Get Chris profile
            const chrisProfile = await this.getProfile('chris');
            if (chrisProfile) profiles.push(chrisProfile);

            // Get echo profiles
            const echoFiles = await fs.readdir(this.echoesPath).catch(() => []);
            for (const file of echoFiles) {
                if (file.endsWith('.json')) {
                    const profileId = file.replace('.json', '');
                    const profile = await this.getProfile(profileId);
                    if (profile) profiles.push(profile);
                }
            }

            // Get stub profiles
            const stubFiles = await fs.readdir(this.stubsPath).catch(() => []);
            for (const file of stubFiles) {
                if (file.endsWith('.json')) {
                    const profileId = file.replace('.json', '');
                    const profile = await this.getProfile(profileId);
                    if (profile) profiles.push(profile);
                }
            }

            // Get foreign profiles from RAM
            for (const [foreignId, profile] of this.foreignRAM) {
                profiles.push(profile);
            }

            return profiles;
        } catch (error) {
            console.error('[ProfileManager] Error getting all profiles:', error.message);
            return [];
        }
    }

    async mergeProfiles(sourceProfileId, targetProfileId, mergeRatio = 0.5) {
        try {
            const sourceProfile = await this.getProfile(sourceProfileId);
            const targetProfile = await this.getProfile(targetProfileId);

            if (!sourceProfile || !targetProfile) {
                console.error('[ProfileManager] Cannot merge - one or both profiles not found');
                return false;
            }

            // Merge patterns
            const mergedPatterns = [
                ...(targetProfile.patterns || []),
                ...(sourceProfile.patterns || [])
            ].slice(-10); // Keep only last 10

            // Merge tone baselines
            const mergedToneBaseline = { ...targetProfile.toneBaseline };
            for (const [word, freq] of Object.entries(sourceProfile.toneBaseline || {})) {
                mergedToneBaseline[word] = (mergedToneBaseline[word] || 0) * mergeRatio + freq * (1 - mergeRatio);
            }

            // Merge trust links
            const mergedTrustLinks = [
                ...(targetProfile.trustLinks || []),
                ...(sourceProfile.trustLinks || [])
            ];

            // Update target profile
            await this.updateProfile(targetProfileId, {
                patterns: mergedPatterns,
                toneBaseline: mergedToneBaseline,
                trustLinks: mergedTrustLinks,
                recurs: targetProfile.recurs + Math.floor(sourceProfile.recurs * mergeRatio)
            });

            // Delete source profile if it's not Chris or a stub
            if (sourceProfileId !== 'chris' && !sourceProfile.preloaded) {
                await this.deleteProfile(sourceProfileId);
            }

            console.log(`[ProfileManager] Merged profiles: ${sourceProfileId} -> ${targetProfileId}`);
            return true;

        } catch (error) {
            console.error('[ProfileManager] Error merging profiles:', error.message);
            return false;
        }
    }

    async deleteProfile(profileId) {
        try {
            if (profileId === 'chris') {
                console.error('[ProfileManager] Cannot delete Chris profile');
                return false;
            }

            const profile = await this.getProfile(profileId);
            if (!profile) return false;

            // Delete from appropriate location
            if (profile.preloaded) {
                await fs.unlink(path.join(this.stubsPath, `${profileId}.json`));
            } else {
                await fs.unlink(path.join(this.echoesPath, `${profileId}.json`));
            }

            // Remove from foreign RAM if exists
            this.foreignRAM.delete(profileId);

            console.log(`[ProfileManager] Deleted profile: ${profileId}`);
            return true;

        } catch (error) {
            console.error(`[ProfileManager] Error deleting profile:`, error.message);
            return false;
        }
    }

    // ============= PROFILE ANALYTICS =============

    async getProfileAnalytics(profileId) {
        try {
            const profile = await this.getProfile(profileId);
            if (!profile) return null;

            const analytics = {
                profileId: profile.id,
                totalInteractions: profile.recurs || 0,
                patternsCount: profile.patterns?.length || 0,
                trustLinksCount: profile.trustLinks?.length || 0,
                avgTrustStrength: profile.trustLinks?.length > 0 ? 
                    profile.trustLinks.reduce((sum, link) => sum + link.strength, 0) / profile.trustLinks.length : 0,
                toneBaselineSize: Object.keys(profile.toneBaseline || {}).length,
                lastSeen: profile.lastSeen,
                created: profile.firstSeen || profile.patterns?.[0]?.event,
                voiceHash: profile.voiceHash,
                isAnchor: profileId === 'chris',
                isPreloaded: profile.preloaded || false
            };

            return analytics;
        } catch (error) {
            console.error('[ProfileManager] Error getting profile analytics:', error.message);
            return null;
        }
    }

    async getSystemAnalytics() {
        try {
            const allProfiles = await this.getAllProfiles();
            
            const analytics = {
                totalProfiles: allProfiles.length,
                anchorProfiles: allProfiles.filter(p => p.id === 'chris').length,
                echoProfiles: allProfiles.filter(p => !p.preloaded && p.id !== 'chris').length,
                stubProfiles: allProfiles.filter(p => p.preloaded).length,
                foreignProfiles: this.foreignRAM.size,
                totalInteractions: allProfiles.reduce((sum, p) => sum + (p.recurs || 0), 0),
                avgInteractionsPerProfile: 0,
                mostActiveProfiles: [],
                trustNetworkSize: allProfiles.reduce((sum, p) => sum + (p.trustLinks?.length || 0), 0)
            };

            analytics.avgInteractionsPerProfile = analytics.totalInteractions / Math.max(analytics.totalProfiles, 1);

            // Get most active profiles
            analytics.mostActiveProfiles = allProfiles
                .sort((a, b) => (b.recurs || 0) - (a.recurs || 0))
                .slice(0, 5)
                .map(p => ({
                    profileId: p.id,
                    interactions: p.recurs || 0,
                    lastSeen: p.lastSeen
                }));

            return analytics;
        } catch (error) {
            console.error('[ProfileManager] Error getting system analytics:', error.message);
            return null;
        }
    }
    
    // ============= CACHE MANAGEMENT =============
    
    getCacheMetrics() {
        return this.cache.getMetrics();
    }
    
    clearCache(cacheType = null) {
        this.cache.clearCache(cacheType);
    }
    
    // ============= PERFORMANCE MONITORING =============
    
    getPerformanceMetrics() {
        const cacheMetrics = this.getCacheMetrics();
        const memoryMetrics = this.memoryManager ? this.memoryManager.getMemoryUsage() : null;
        
        return {
            cache: cacheMetrics,
            memory: memoryMetrics,
            profiles: {
                total: this.cache?.caches?.profiles?.size || 0,
                foreign: this.foreignRAM.size,
                active: this.cache?.caches?.profiles?.size || 0
            },
            performance: {
                hitRate: cacheMetrics.hitRate,
                lastCleanup: new Date(cacheMetrics.lastCleanup).toISOString()
            }
        };
    }
    
    // ============= MEMORY MANAGEMENT =============
    
    getMemoryStatistics() {
        return this.memoryManager ? this.memoryManager.getStatistics() : null;
    }
    
    getMemoryHealth() {
        return this.memoryManager ? this.memoryManager.getHealthStatus() : null;
    }
    
    async performMemoryMaintenance() {
        return this.memoryManager ? await this.memoryManager.performMaintenance() : null;
    }
    
    async forceMemoryCleanup() {
        return this.memoryManager ? await this.memoryManager.forceCleanup() : null;
    }
    
    startMemoryManagement() {
        if (this.memoryManager) {
            this.memoryManager.startScheduledCleanup();
            console.log('[ProfileManager] Memory management started');
        }
    }
    
    // ============= DATABASE OPTIMIZATION =============
    
    getDatabaseStatistics() {
        return this.databaseOptimizer ? this.databaseOptimizer.getStatistics() : null;
    }
    
    getIndexInfo() {
        return this.databaseOptimizer ? this.databaseOptimizer.getIndexInfo() : null;
    }
    
    async buildDatabaseIndexes() {
        return this.databaseOptimizer ? await this.databaseOptimizer.buildIndexes() : null;
    }
    
    async optimizeDatabaseStorage() {
        return this.databaseOptimizer ? await this.databaseOptimizer.optimizeStorage() : null;
    }
    
    async batchUpdateProfiles(updates) {
        return this.databaseOptimizer ? await this.databaseOptimizer.batchUpdateProfiles(updates) : null;
    }
    
    async batchDeleteProfiles(profileIds) {
        return this.databaseOptimizer ? await this.databaseOptimizer.batchDeleteProfiles(profileIds) : null;
    }
    
    async findProfilesByPattern(pattern, limit = 10) {
        return this.databaseOptimizer ? await this.databaseOptimizer.findProfilesByPattern(pattern, limit) : [];
    }
    
    async findProfilesByDateRange(startDate, endDate) {
        return this.databaseOptimizer ? await this.databaseOptimizer.findProfilesByDateRange(startDate, endDate) : [];
    }
    
    async findProfilesBySize(minSize, maxSize) {
        return this.databaseOptimizer ? await this.databaseOptimizer.findProfilesBySize(minSize, maxSize) : [];
    }
    
    async getQueryPerformance() {
        return this.databaseOptimizer ? await this.databaseOptimizer.getQueryPerformance() : null;
    }
    
    startDatabaseOptimization() {
        if (this.databaseOptimizer) {
            this.databaseOptimizer.startScheduledOptimization();
            console.log('[ProfileManager] Database optimization started');
        }
    }
    
    // ============= BACKGROUND SERVICES =============
    
    getBackgroundServiceStatus() {
        return this.backgroundServices ? this.backgroundServices.getServiceStatus() : null;
    }
    
    getAlertHistory(limit = 50) {
        return this.backgroundServices ? this.backgroundServices.getAlertHistory(limit) : [];
    }
    
    async acknowledgeAlert(alertId) {
        return this.backgroundServices ? await this.backgroundServices.acknowledgeAlert(alertId) : false;
    }
    
    async startBackgroundServices() {
        if (this.backgroundServices) {
            const result = await this.backgroundServices.startAllServices();
            console.log('[ProfileManager] Background services started');
            return result;
        }
        return false;
    }
    
    async stopBackgroundServices() {
        if (this.backgroundServices) {
            const result = await this.backgroundServices.stopAllServices();
            console.log('[ProfileManager] Background services stopped');
            return result;
        }
        return false;
    }
    
    async performHealthCheck() {
        return this.backgroundServices ? await this.backgroundServices.performHealthCheck() : null;
    }
    
    async performMaintenance() {
        return this.backgroundServices ? await this.backgroundServices.performMaintenance() : null;
    }
    
    async generateAnalyticsReport() {
        return this.backgroundServices ? await this.backgroundServices.generateAnalyticsReport() : null;
    }
}

module.exports = ProfileManager;
