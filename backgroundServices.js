/**
 * Background Services - Phase 6.5: Comprehensive Background Maintenance System
 * 
 * Services:
 * - System Health Monitoring
 * - Automated Maintenance
 * - Performance Analytics
 * - Resource Management
 * - Alert System
 * - Scheduled Tasks
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class BackgroundServices {
    constructor(profileManager, options = {}) {
        this.profileManager = profileManager;
        
        // Configuration
        this.config = {
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            maintenanceInterval: options.maintenanceInterval || 300000, // 5 minutes
            analyticsInterval: options.analyticsInterval || 900000, // 15 minutes
            resourceCheckInterval: options.resourceCheckInterval || 30000, // 30 seconds
            alertThresholds: {
                memoryUsage: options.memoryThreshold || 80, // 80%
                cpuUsage: options.cpuThreshold || 70, // 70%
                diskUsage: options.diskThreshold || 85, // 85%
                responseTime: options.responseThreshold || 1000, // 1 second
                errorRate: options.errorThreshold || 5 // 5%
            },
            ...options
        };
        
        // Service state
        this.services = {
            healthMonitor: null,
            maintenance: null,
            analytics: null,
            resourceMonitor: null,
            alertSystem: null
        };
        
        // Statistics and metrics
        this.metrics = {
            systemHealth: {
                status: 'unknown',
                lastCheck: null,
                uptime: 0,
                checksPerformed: 0,
                issuesDetected: 0
            },
            maintenance: {
                lastRun: null,
                runsCompleted: 0,
                tasksExecuted: 0,
                errorsEncountered: 0,
                averageDuration: 0
            },
            analytics: {
                lastReport: null,
                reportsGenerated: 0,
                dataPointsCollected: 0,
                trendsIdentified: 0
            },
            resources: {
                memory: { current: 0, peak: 0, average: 0 },
                cpu: { current: 0, peak: 0, average: 0 },
                disk: { current: 0, peak: 0, average: 0 },
                network: { requests: 0, errors: 0, averageResponse: 0 }
            },
            alerts: {
                total: 0,
                critical: 0,
                warning: 0,
                info: 0,
                lastAlert: null
            }
        };
        
        // Alert history
        this.alertHistory = [];
        
        console.log('[BackgroundServices] Initialized with comprehensive monitoring');
    }
    
    // ============= SERVICE INITIALIZATION =============
    
    async startAllServices() {
        try {
            console.log('[BackgroundServices] Starting all background services...');
            
            // Start services without initial execution to avoid loops
            this.startHealthMonitor(false); // Don't run initial health check
            this.startMaintenanceService(false); // Don't run initial maintenance
            this.startAnalyticsService(false); // Don't run initial analytics
            this.startResourceMonitor(false); // Don't run initial resource check
            this.startAlertSystem(false); // Alert system is event-driven
            
            console.log('[BackgroundServices] All services started successfully');
            return true;
            
        } catch (error) {
            console.error('[BackgroundServices] Error starting services:', error.message);
            return false;
        }
    }
    
    async stopAllServices() {
        try {
            console.log('[BackgroundServices] Stopping all background services...');
            
            Object.values(this.services).forEach(service => {
                if (service) {
                    clearInterval(service);
                }
            });
            
            // Clear all services
            this.services = {
                healthMonitor: null,
                maintenance: null,
                analytics: null,
                resourceMonitor: null,
                alertSystem: null
            };
            
            console.log('[BackgroundServices] All services stopped');
            return true;
            
        } catch (error) {
            console.error('[BackgroundServices] Error stopping services:', error.message);
            return false;
        }
    }
    
    // ============= HEALTH MONITORING SERVICE =============
    
    async startHealthMonitor(runInitial = true) {
        console.log('[BackgroundServices] Starting health monitoring service...');
        
        this.services.healthMonitor = setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.healthCheckInterval);
        
        // Perform initial health check only if requested
        if (runInitial) {
            await this.performHealthCheck();
        }
    }
    
    async performHealthCheck() {
        try {
            const startTime = Date.now();
            
            // Check system components
            const healthStatus = {
                timestamp: new Date().toISOString(),
                overall: 'healthy',
                components: {},
                issues: [],
                recommendations: []
            };
            
            // Check ProfileManager
            const profileManagerHealth = await this.checkProfileManagerHealth();
            healthStatus.components.profileManager = profileManagerHealth;
            
            // Check Memory Manager
            const memoryHealth = await this.checkMemoryHealth();
            healthStatus.components.memory = memoryHealth;
            
            // Check Database Optimizer
            const databaseHealth = await this.checkDatabaseHealth();
            healthStatus.components.database = databaseHealth;
            
            // Check Cache Manager
            const cacheHealth = await this.checkCacheHealth();
            healthStatus.components.cache = cacheHealth;
            
            // Check file system
            const filesystemHealth = await this.checkFilesystemHealth();
            healthStatus.components.filesystem = filesystemHealth;
            
            // Determine overall health
            const componentStatuses = Object.values(healthStatus.components);
            const criticalIssues = componentStatuses.filter(c => c.status === 'critical').length;
            const warnings = componentStatuses.filter(c => c.status === 'warning').length;
            
            if (criticalIssues > 0) {
                healthStatus.overall = 'critical';
            } else if (warnings > 0) {
                healthStatus.overall = 'warning';
            } else {
                healthStatus.overall = 'healthy';
            }
            
            // Update metrics
            this.metrics.systemHealth.status = healthStatus.overall;
            this.metrics.systemHealth.lastCheck = new Date().toISOString();
            this.metrics.systemHealth.checksPerformed++;
            this.metrics.systemHealth.uptime = Date.now() - this.startTime;
            
            if (healthStatus.issues.length > 0) {
                this.metrics.systemHealth.issuesDetected += healthStatus.issues.length;
            }
            
            // Generate alerts if needed
            if (healthStatus.overall === 'critical') {
                await this.generateAlert('critical', 'System Health Critical', 
                    `Critical issues detected: ${healthStatus.issues.join(', ')}`);
            } else if (healthStatus.overall === 'warning') {
                await this.generateAlert('warning', 'System Health Warning', 
                    `Warning issues detected: ${healthStatus.issues.join(', ')}`);
            }
            
            const duration = Date.now() - startTime;
            console.log(`[BackgroundServices] Health check completed in ${duration}ms - Status: ${healthStatus.overall}`);
            
            return healthStatus;
            
        } catch (error) {
            console.error('[BackgroundServices] Error in health check:', error.message);
            await this.generateAlert('critical', 'Health Check Failed', error.message);
            return null;
        }
    }
    
    async checkProfileManagerHealth() {
        try {
            const stats = this.profileManager.getPerformanceMetrics();
            const issues = [];
            let status = 'healthy';
            
            // Check profile counts
            if (stats.profiles?.foreign > 50) {
                issues.push('High foreign echo count');
                status = 'warning';
            }
            
            // Check memory usage
            if (stats.memory?.heapUsed > 100 * 1024 * 1024) { // 100MB
                issues.push('High memory usage');
                status = 'warning';
            }
            
            return {
                status,
                issues,
                metrics: {
                    totalProfiles: stats.profiles?.total || 0,
                    foreignProfiles: stats.profiles?.foreign || 0,
                    memoryUsage: stats.memory?.heapUsed || 0
                }
            };
        } catch (error) {
            return {
                status: 'critical',
                issues: ['ProfileManager check failed'],
                error: error.message
            };
        }
    }
    
    async checkMemoryHealth() {
        try {
            const memoryStats = this.profileManager.getMemoryStatistics();
            if (!memoryStats) {
                return { status: 'unknown', issues: ['Memory manager not available'] };
            }
            
            const issues = [];
            let status = 'healthy';
            
            // Check memory usage
            if (memoryStats.currentMemory?.heapUsed > 50 * 1024 * 1024) { // 50MB
                issues.push('High heap memory usage');
                status = 'warning';
            }
            
            // Check foreign echo count
            if (memoryStats.health?.foreignEchoCount > 20) {
                issues.push('High foreign echo count');
                status = 'warning';
            }
            
            return {
                status,
                issues,
                metrics: memoryStats
            };
        } catch (error) {
            return {
                status: 'critical',
                issues: ['Memory health check failed'],
                error: error.message
            };
        }
    }
    
    async checkDatabaseHealth() {
        try {
            const dbStats = this.profileManager.getDatabaseStatistics();
            if (!dbStats) {
                return { status: 'unknown', issues: ['Database optimizer not available'] };
            }
            
            const issues = [];
            let status = 'healthy';
            
            // Check if indexes are built
            if (dbStats.indexes?.profiles === 0) {
                issues.push('No database indexes built');
                status = 'warning';
            }
            
            return {
                status,
                issues,
                metrics: dbStats
            };
        } catch (error) {
            return {
                status: 'critical',
                issues: ['Database health check failed'],
                error: error.message
            };
        }
    }
    
    async checkCacheHealth() {
        try {
            const cacheStats = this.profileManager.getCacheMetrics();
            if (!cacheStats) {
                return { status: 'unknown', issues: ['Cache manager not available'] };
            }
            
            const issues = [];
            let status = 'healthy';
            
            // Check cache hit rate
            const hitRate = cacheStats.hitRate || 0;
            if (hitRate < 50) {
                issues.push('Low cache hit rate');
                status = 'warning';
            }
            
            return {
                status,
                issues,
                metrics: cacheStats
            };
        } catch (error) {
            return {
                status: 'critical',
                issues: ['Cache health check failed'],
                error: error.message
            };
        }
    }
    
    async checkFilesystemHealth() {
        try {
            const storagePath = this.profileManager.storagePath;
            const stats = await fs.stat(storagePath);
            
            const issues = [];
            let status = 'healthy';
            
            // Check if storage directory exists and is accessible
            if (!stats.isDirectory()) {
                issues.push('Storage path is not a directory');
                status = 'critical';
            }
            
            return {
                status,
                issues,
                metrics: {
                    path: storagePath,
                    accessible: true,
                    lastModified: stats.mtime
                }
            };
        } catch (error) {
            return {
                status: 'critical',
                issues: ['Filesystem check failed'],
                error: error.message
            };
        }
    }
    
    // ============= MAINTENANCE SERVICE =============
    
    async startMaintenanceService(runInitial = true) {
        console.log('[BackgroundServices] Starting maintenance service...');
        
        this.services.maintenance = setInterval(async () => {
            await this.performMaintenance();
        }, this.config.maintenanceInterval);
        
        // Perform initial maintenance only if requested
        if (runInitial) {
            await this.performMaintenance();
        }
    }
    
    async performMaintenance() {
        try {
            const startTime = Date.now();
            console.log('[BackgroundServices] Starting maintenance cycle...');
            
            const tasks = [
                { name: 'Memory Cleanup', fn: () => this.profileManager.performMemoryMaintenance() },
                { name: 'Cache Optimization', fn: () => this.profileManager.clearCache() },
                { name: 'Database Optimization', fn: () => this.profileManager.optimizeDatabaseStorage() },
                { name: 'Index Rebuild', fn: () => this.profileManager.buildDatabaseIndexes() },
                { name: 'Profile Compression', fn: () => this.compressOldProfiles() },
                { name: 'Log Cleanup', fn: () => this.cleanupOldLogs() }
            ];
            
            let tasksExecuted = 0;
            let errorsEncountered = 0;
            
            for (const task of tasks) {
                try {
                    console.log(`[BackgroundServices] Executing: ${task.name}`);
                    await task.fn();
                    tasksExecuted++;
                } catch (error) {
                    console.error(`[BackgroundServices] Error in ${task.name}:`, error.message);
                    errorsEncountered++;
                    await this.generateAlert('warning', `Maintenance Error: ${task.name}`, error.message);
                }
            }
            
            const duration = Date.now() - startTime;
            
            // Update metrics
            this.metrics.maintenance.lastRun = new Date().toISOString();
            this.metrics.maintenance.runsCompleted++;
            this.metrics.maintenance.tasksExecuted += tasksExecuted;
            this.metrics.maintenance.errorsEncountered += errorsEncountered;
            this.metrics.maintenance.averageDuration = 
                (this.metrics.maintenance.averageDuration + duration) / 2;
            
            console.log(`[BackgroundServices] Maintenance completed in ${duration}ms - ${tasksExecuted} tasks, ${errorsEncountered} errors`);
            
            return {
                duration,
                tasksExecuted,
                errorsEncountered,
                success: errorsEncountered === 0
            };
            
        } catch (error) {
            console.error('[BackgroundServices] Error in maintenance cycle:', error.message);
            await this.generateAlert('critical', 'Maintenance Cycle Failed', error.message);
            return null;
        }
    }
    
    async compressOldProfiles() {
        try {
            // Find profiles older than 7 days and compress them
            const profiles = await this.profileManager.getAllProfiles();
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            let compressed = 0;
            for (const profile of profiles) {
                if (new Date(profile.lastSeen) < weekAgo && profile.id !== 'chris') {
                    // Compress old patterns and reduce data
                    const compressedProfile = {
                        ...profile,
                        patterns: profile.patterns?.slice(-10) || [], // Keep only last 10 patterns
                        toneBaseline: this.compressToneBaseline(profile.toneBaseline)
                    };
                    
                    await this.profileManager.saveProfile(profile.id, compressedProfile);
                    compressed++;
                }
            }
            
            console.log(`[BackgroundServices] Compressed ${compressed} old profiles`);
            return compressed;
        } catch (error) {
            console.error('[BackgroundServices] Error compressing profiles:', error.message);
            throw error;
        }
    }
    
    compressToneBaseline(baseline) {
        if (!baseline || typeof baseline !== 'object') return {};
        
        // Keep only the most significant words
        const entries = Object.entries(baseline)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 50); // Keep top 50 words
        
        return Object.fromEntries(entries);
    }
    
    async cleanupOldLogs() {
        try {
            const logsPath = path.join(this.profileManager.storagePath, '..', 'logs');
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            let cleaned = 0;
            try {
                const files = await fs.readdir(logsPath);
                for (const file of files) {
                    const filePath = path.join(logsPath, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < weekAgo && file.endsWith('.log')) {
                        await fs.unlink(filePath);
                        cleaned++;
                    }
                }
            } catch (error) {
                // Logs directory might not exist
            }
            
            console.log(`[BackgroundServices] Cleaned ${cleaned} old log files`);
            return cleaned;
        } catch (error) {
            console.error('[BackgroundServices] Error cleaning logs:', error.message);
            throw error;
        }
    }
    
    // ============= ANALYTICS SERVICE =============
    
    async startAnalyticsService(runInitial = true) {
        console.log('[BackgroundServices] Starting analytics service...');
        
        this.services.analytics = setInterval(async () => {
            await this.generateAnalyticsReport();
        }, this.config.analyticsInterval);
        
        // Generate initial report only if requested
        if (runInitial) {
            await this.generateAnalyticsReport();
        }
    }
    
    async generateAnalyticsReport() {
        try {
            console.log('[BackgroundServices] Generating analytics report...');
            
            const report = {
                timestamp: new Date().toISOString(),
                systemMetrics: await this.collectSystemMetrics(),
                performanceMetrics: await this.collectPerformanceMetrics(),
                usageMetrics: await this.collectUsageMetrics(),
                trends: await this.identifyTrends(),
                recommendations: await this.generateRecommendations()
            };
            
            // Update metrics
            this.metrics.analytics.lastReport = new Date().toISOString();
            this.metrics.analytics.reportsGenerated++;
            this.metrics.analytics.dataPointsCollected += Object.keys(report).length;
            this.metrics.analytics.trendsIdentified += report.trends.length;
            
            // Save report
            await this.saveAnalyticsReport(report);
            
            console.log(`[BackgroundServices] Analytics report generated with ${report.trends.length} trends`);
            return report;
            
        } catch (error) {
            console.error('[BackgroundServices] Error generating analytics report:', error.message);
            return null;
        }
    }
    
    async collectSystemMetrics() {
        return {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime(),
            platform: os.platform(),
            arch: os.arch(),
            loadAverage: os.loadavg()
        };
    }
    
    async collectPerformanceMetrics() {
        const profileStats = this.profileManager.getPerformanceMetrics();
        const cacheStats = this.profileManager.getCacheMetrics();
        const memoryStats = this.profileManager.getMemoryStatistics();
        const dbStats = this.profileManager.getDatabaseStatistics();
        
        return {
            profiles: profileStats,
            cache: cacheStats,
            memory: memoryStats,
            database: dbStats
        };
    }
    
    async collectUsageMetrics() {
        // This would typically collect usage patterns, but for now return basic metrics
        return {
            activeProfiles: this.profileManager.getActiveProfiles?.() || 0,
            totalInteractions: this.metrics.systemHealth.checksPerformed,
            averageResponseTime: this.metrics.resources.network.averageResponse
        };
    }
    
    async identifyTrends() {
        const trends = [];
        
        // Memory trend
        if (this.metrics.resources.memory.current > this.metrics.resources.memory.average * 1.2) {
            trends.push({
                type: 'memory',
                trend: 'increasing',
                severity: 'warning',
                message: 'Memory usage is trending upward'
            });
        }
        
        // Error trend
        if (this.metrics.maintenance.errorsEncountered > this.metrics.maintenance.runsCompleted * 0.1) {
            trends.push({
                type: 'errors',
                trend: 'increasing',
                severity: 'critical',
                message: 'Error rate is higher than expected'
            });
        }
        
        return trends;
    }
    
    async generateRecommendations() {
        const recommendations = [];
        
        // Memory recommendations
        if (this.metrics.resources.memory.current > 50 * 1024 * 1024) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                action: 'Consider increasing memory limits or optimizing data structures'
            });
        }
        
        // Performance recommendations
        const cacheHitRate = this.profileManager.getCacheMetrics()?.hitRate || 0;
        if (cacheHitRate < 70) {
            recommendations.push({
                type: 'performance',
                priority: 'low',
                action: 'Cache hit rate is low, consider adjusting cache strategy'
            });
        }
        
        return recommendations;
    }
    
    async saveAnalyticsReport(report) {
        try {
            const reportsPath = path.join(this.profileManager.storagePath, 'analytics');
            await fs.mkdir(reportsPath, { recursive: true });
            
            const filename = `analytics_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(reportsPath, filename);
            
            await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');
        } catch (error) {
            console.error('[BackgroundServices] Error saving analytics report:', error.message);
        }
    }
    
    // ============= RESOURCE MONITORING SERVICE =============
    
    async startResourceMonitor(runInitial = true) {
        console.log('[BackgroundServices] Starting resource monitoring service...');
        
        this.services.resourceMonitor = setInterval(async () => {
            await this.monitorResources();
        }, this.config.resourceCheckInterval);
        
        // Perform initial resource check only if requested
        if (runInitial) {
            await this.monitorResources();
        }
    }
    
    async monitorResources() {
        try {
            const resources = {
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                disk: await this.getDiskUsage(),
                timestamp: new Date().toISOString()
            };
            
            // Update metrics
            this.metrics.resources.memory.current = resources.memory.heapUsed;
            this.metrics.resources.memory.peak = Math.max(
                this.metrics.resources.memory.peak, 
                resources.memory.heapUsed
            );
            this.metrics.resources.memory.average = 
                (this.metrics.resources.memory.average + resources.memory.heapUsed) / 2;
            
            // Check thresholds
            const memoryPercent = (resources.memory.heapUsed / (100 * 1024 * 1024)) * 100;
            if (memoryPercent > this.config.alertThresholds.memoryUsage) {
                await this.generateAlert('warning', 'High Memory Usage', 
                    `Memory usage: ${memoryPercent.toFixed(1)}%`);
            }
            
            return resources;
        } catch (error) {
            console.error('[BackgroundServices] Error monitoring resources:', error.message);
            return null;
        }
    }
    
    async getDiskUsage() {
        try {
            const storagePath = this.profileManager.storagePath;
            const stats = await fs.stat(storagePath);
            return {
                path: storagePath,
                accessible: true,
                lastModified: stats.mtime
            };
        } catch (error) {
            return {
                path: this.profileManager.storagePath,
                accessible: false,
                error: error.message
            };
        }
    }
    
    // ============= ALERT SYSTEM =============
    
    async startAlertSystem(runInitial = true) {
        console.log('[BackgroundServices] Starting alert system...');
        
        // Alert system doesn't need a timer - it's event-driven
        this.services.alertSystem = true;
    }
    
    async generateAlert(severity, title, message, metadata = {}) {
        try {
            const alert = {
                id: Date.now().toString(),
                severity,
                title,
                message,
                metadata,
                timestamp: new Date().toISOString(),
                acknowledged: false
            };
            
            // Add to alert history
            this.alertHistory.push(alert);
            
            // Keep only last 100 alerts
            if (this.alertHistory.length > 100) {
                this.alertHistory = this.alertHistory.slice(-100);
            }
            
            // Update metrics
            this.metrics.alerts.total++;
            this.metrics.alerts[severity]++;
            this.metrics.alerts.lastAlert = new Date().toISOString();
            
            // Log alert
            console.log(`[BackgroundServices] ALERT [${severity.toUpperCase()}] ${title}: ${message}`);
            
            // Save alert to file
            await this.saveAlert(alert);
            
            return alert;
        } catch (error) {
            console.error('[BackgroundServices] Error generating alert:', error.message);
            return null;
        }
    }
    
    async saveAlert(alert) {
        try {
            const alertsPath = path.join(this.profileManager.storagePath, 'alerts');
            await fs.mkdir(alertsPath, { recursive: true });
            
            const filename = `alert_${alert.id}.json`;
            const filepath = path.join(alertsPath, filename);
            
            await fs.writeFile(filepath, JSON.stringify(alert, null, 2), 'utf8');
        } catch (error) {
            console.error('[BackgroundServices] Error saving alert:', error.message);
        }
    }
    
    // ============= UTILITIES =============
    
    getServiceStatus() {
        return {
            services: Object.keys(this.services).reduce((acc, key) => {
                acc[key] = this.services[key] !== null;
                return acc;
            }, {}),
            metrics: this.metrics,
            config: this.config,
            uptime: this.startTime ? Date.now() - this.startTime : 0
        };
    }
    
    getAlertHistory(limit = 50) {
        return this.alertHistory.slice(-limit);
    }
    
    async acknowledgeAlert(alertId) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }
    
    // ============= INITIALIZATION =============
    
    async initialize() {
        this.startTime = Date.now();
        console.log('[BackgroundServices] Background services initialized');
    }
}

module.exports = BackgroundServices;
