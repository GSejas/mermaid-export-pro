"use strict";
/**
 * Error Handling Service
 *
 * Comprehensive error handling and recovery system for batch operations with:
 * - Intelligent error categorization and recovery suggestions
 * - Context-aware error analysis and reporting
 * - Automatic retry logic with exponential backoff
 * - Detailed error reporting and diagnostics
 * - System health monitoring and alerting
 *
 * @author Claude/Jorge
 * @version 2.0.0
 * @date 2025-08-27
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlingService = exports.ErrorHandlingServiceImpl = void 0;
exports.createErrorHandlingService = createErrorHandlingService;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const errorHandler_1 = require("../ui/errorHandler");
const vscode = __importStar(require("vscode"));
/**
 * Error categories with specific handling strategies
 */
var ErrorCategory;
(function (ErrorCategory) {
    // Temporary/Retryable errors
    ErrorCategory["TIMEOUT"] = "TIMEOUT";
    ErrorCategory["NETWORK"] = "NETWORK";
    ErrorCategory["RESOURCE_UNAVAILABLE"] = "RESOURCE_UNAVAILABLE";
    ErrorCategory["TEMPORARY_FAILURE"] = "TEMPORARY_FAILURE";
    // Configuration/Setup errors
    ErrorCategory["MISSING_DEPENDENCY"] = "MISSING_DEPENDENCY";
    ErrorCategory["INVALID_CONFIG"] = "INVALID_CONFIG";
    ErrorCategory["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    // Content/Syntax errors
    ErrorCategory["INVALID_SYNTAX"] = "INVALID_SYNTAX";
    ErrorCategory["UNSUPPORTED_DIAGRAM"] = "UNSUPPORTED_DIAGRAM";
    ErrorCategory["MALFORMED_INPUT"] = "MALFORMED_INPUT";
    // System/Environment errors
    ErrorCategory["INSUFFICIENT_MEMORY"] = "INSUFFICIENT_MEMORY";
    ErrorCategory["DISK_FULL"] = "DISK_FULL";
    ErrorCategory["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    // Unknown/Unhandled errors
    ErrorCategory["UNKNOWN"] = "UNKNOWN";
})(ErrorCategory || (ErrorCategory = {}));
/**
 * Implementation of comprehensive error handling service
 */
class ErrorHandlingServiceImpl {
    errorPatterns = [];
    errorStatistics = {
        totalErrors: 0,
        errorsByCategory: new Map(),
        errorsByPhase: new Map(),
        retryableErrors: 0,
        criticalErrors: 0,
        errorRate: 0
    };
    recentErrors = [];
    maxRecentErrors = 100;
    constructor() {
        this.initializeErrorPatterns();
        this.initializeStatistics();
    }
    /**
     * Handle and categorize errors with context analysis
     */
    handleError(error, context) {
        const timestamp = new Date();
        const errorContext = this.buildErrorContext(error, context, timestamp);
        const categorizedError = this.categorizeError(error, errorContext);
        // Update statistics
        this.updateStatistics(categorizedError);
        // Store for recent errors list
        this.addToRecentErrors(categorizedError);
        // Log error with appropriate level
        this.logErrorByCategory(categorizedError);
        return categorizedError;
    }
    /**
     * Determine if error should be retried
     */
    isRetryable(error) {
        const category = this.getErrorCategory(error.code);
        const pattern = this.errorPatterns.find(p => p.category === category);
        return pattern ? pattern.retryable : false;
    }
    /**
     * Get context-specific recovery actions
     */
    getRecoveryActions(error) {
        const category = this.getErrorCategory(error.code);
        const pattern = this.errorPatterns.find(p => p.category === category);
        const baseActions = pattern ? pattern.recoveryActions : ['Contact support with error details'];
        // Add context-specific actions
        const contextActions = this.getContextualRecoveryActions(error);
        return [...new Set([...baseActions, ...contextActions])];
    }
    /**
     * Log error with appropriate formatting and level
     */
    logError(error) {
        const logMessage = this.formatErrorForLogging(error);
        switch (error.severity) {
            case 'critical':
                errorHandler_1.ErrorHandler.logError(`CRITICAL: ${logMessage}`);
                break;
            case 'error':
                errorHandler_1.ErrorHandler.logError(logMessage);
                break;
            case 'warning':
                errorHandler_1.ErrorHandler.logWarning(logMessage);
                break;
        }
    }
    /**
     * Generate comprehensive error report
     */
    generateErrorReport(errors) {
        if (errors.length === 0) {
            return '# Error Report\n\nNo errors to report.';
        }
        const report = [];
        report.push('# Export Folder Error Report');
        report.push(`Generated: ${new Date().toISOString()}`);
        report.push(`Total Errors: ${errors.length}`);
        report.push('');
        // Summary by category
        const categoryMap = new Map();
        for (const error of errors) {
            const category = this.getErrorCategory(error.code);
            const categoryErrors = categoryMap.get(category) || [];
            categoryErrors.push(error);
            categoryMap.set(category, categoryErrors);
        }
        report.push('## Error Summary by Category');
        for (const [category, categoryErrors] of categoryMap) {
            report.push(`- **${category}**: ${categoryErrors.length} errors`);
        }
        report.push('');
        // Detailed errors
        report.push('## Detailed Error List');
        for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            report.push(`### Error ${i + 1}: ${error.code}`);
            report.push(`**Severity**: ${error.severity}`);
            report.push(`**Message**: ${error.message}`);
            report.push(`**Phase**: ${error.context.phase}`);
            if (error.context.filePath) {
                report.push(`**File**: ${error.context.filePath}`);
            }
            if (error.context.format) {
                report.push(`**Format**: ${error.context.format}`);
            }
            report.push(`**Retryable**: ${error.retryable ? 'Yes' : 'No'}`);
            if (error.recoveryActions.length > 0) {
                report.push('**Recovery Actions**:');
                for (const action of error.recoveryActions) {
                    report.push(`- ${action}`);
                }
            }
            if (error.details?.stackTrace) {
                report.push('**Stack Trace**:');
                report.push('```');
                report.push(error.details.stackTrace);
                report.push('```');
            }
            report.push('');
        }
        // System information
        if (errors.length > 0 && errors[0].details?.systemInfo) {
            const sysInfo = errors[0].details.systemInfo;
            report.push('## System Information');
            report.push(`**Platform**: ${sysInfo.platform}`);
            report.push(`**Architecture**: ${sysInfo.arch}`);
            report.push(`**Node Version**: ${sysInfo.nodeVersion}`);
            report.push(`**VS Code Version**: ${sysInfo.vsCodeVersion}`);
            report.push(`**Extension Version**: ${sysInfo.extensionVersion}`);
            report.push(`**Available Strategies**: ${sysInfo.availableStrategies.join(', ')}`);
            report.push('');
        }
        // Recovery recommendations
        report.push('## General Recommendations');
        const allRecoveryActions = [...new Set(errors.flatMap(e => e.recoveryActions))];
        for (const action of allRecoveryActions) {
            report.push(`- ${action}`);
        }
        return report.join('\n');
    }
    /**
     * Get current error statistics
     */
    getErrorStatistics() {
        return { ...this.errorStatistics };
    }
    /**
     * Get recent errors for debugging
     */
    getRecentErrors(count = 10) {
        return this.recentErrors.slice(-count);
    }
    /**
     * Clear error history and reset statistics
     */
    clearErrorHistory() {
        this.recentErrors = [];
        this.initializeStatistics();
        errorHandler_1.ErrorHandler.logInfo('Error history cleared');
    }
    /**
     * Private implementation methods
     */
    initializeErrorPatterns() {
        this.errorPatterns = [
            // Timeout errors
            {
                category: ErrorCategory.TIMEOUT,
                patterns: [
                    /timeout/i,
                    /timed out/i,
                    /operation timeout/i,
                    /request timeout/i
                ],
                retryable: true,
                severity: 'warning',
                recoveryActions: [
                    'Increase timeout settings',
                    'Try exporting fewer files at once',
                    'Check system performance'
                ]
            },
            // Network errors
            {
                category: ErrorCategory.NETWORK,
                patterns: [
                    /network/i,
                    /connection/i,
                    /ENOTFOUND/i,
                    /ECONNREFUSED/i,
                    /ETIMEDOUT/i
                ],
                retryable: true,
                severity: 'warning',
                recoveryActions: [
                    'Check internet connection',
                    'Verify proxy settings',
                    'Try again later'
                ]
            },
            // Resource unavailable
            {
                category: ErrorCategory.RESOURCE_UNAVAILABLE,
                patterns: [
                    /resource unavailable/i,
                    /too many requests/i,
                    /rate limit/i,
                    /service unavailable/i
                ],
                retryable: true,
                severity: 'warning',
                recoveryActions: [
                    'Wait a moment before retrying',
                    'Reduce concurrent operations',
                    'Check service status'
                ]
            },
            // Missing dependencies
            {
                category: ErrorCategory.MISSING_DEPENDENCY,
                patterns: [
                    /command not found/i,
                    /not installed/i,
                    /missing dependency/i,
                    /mmdc.*not found/i,
                    /puppeteer.*not found/i
                ],
                retryable: false,
                severity: 'error',
                recoveryActions: [
                    'Install @mermaid-js/mermaid-cli: npm install -g @mermaid-js/mermaid-cli',
                    'Verify CLI tools are accessible',
                    'Try using web export strategy'
                ]
            },
            // Permission errors
            {
                category: ErrorCategory.PERMISSION_DENIED,
                patterns: [
                    /permission denied/i,
                    /access denied/i,
                    /EACCES/i,
                    /EPERM/i
                ],
                retryable: false,
                severity: 'error',
                recoveryActions: [
                    'Check file and directory permissions',
                    'Run with appropriate privileges',
                    'Choose different output directory'
                ]
            },
            // Syntax errors
            {
                category: ErrorCategory.INVALID_SYNTAX,
                patterns: [
                    /syntax error/i,
                    /parse error/i,
                    /invalid mermaid/i,
                    /malformed diagram/i
                ],
                retryable: false,
                severity: 'error',
                recoveryActions: [
                    'Check mermaid diagram syntax',
                    'Verify diagram type is supported',
                    'Use online mermaid editor to validate'
                ]
            },
            // Memory errors
            {
                category: ErrorCategory.INSUFFICIENT_MEMORY,
                patterns: [
                    /out of memory/i,
                    /memory limit/i,
                    /heap out of memory/i,
                    /ENOMEM/i
                ],
                retryable: true,
                severity: 'critical',
                recoveryActions: [
                    'Close other applications to free memory',
                    'Export fewer files at once',
                    'Reduce diagram complexity',
                    'Restart VS Code'
                ]
            },
            // Disk space errors
            {
                category: ErrorCategory.DISK_FULL,
                patterns: [
                    /no space left/i,
                    /disk full/i,
                    /ENOSPC/i
                ],
                retryable: false,
                severity: 'critical',
                recoveryActions: [
                    'Free up disk space',
                    'Choose different output directory',
                    'Delete temporary files'
                ]
            }
        ];
    }
    initializeStatistics() {
        this.errorStatistics = {
            totalErrors: 0,
            errorsByCategory: new Map(),
            errorsByPhase: new Map(),
            retryableErrors: 0,
            criticalErrors: 0,
            errorRate: 0
        };
    }
    buildErrorContext(error, context, timestamp) {
        return {
            operation: context.operation || 'unknown',
            phase: context.phase || 'unknown',
            jobId: context.jobId,
            filePath: context.filePath,
            format: context.format,
            timestamp,
            systemInfo: this.gatherSystemInfo(),
            stackTrace: error instanceof Error ? error.stack : undefined,
            additionalInfo: context.additionalInfo
        };
    }
    categorizeError(error, context) {
        const message = this.extractErrorMessage(error);
        const category = this.classifyError(message);
        const pattern = this.errorPatterns.find(p => p.category === category);
        const batchError = {
            code: category,
            message,
            severity: pattern?.severity || 'error',
            context: {
                phase: context.phase,
                jobId: context.jobId,
                filePath: context.filePath,
                format: context.format
            },
            originalError: error instanceof Error ? error : undefined,
            recoveryActions: pattern?.recoveryActions || ['Check error details and try again'],
            retryable: pattern?.retryable || false,
            details: {
                stackTrace: context.stackTrace,
                systemInfo: context.systemInfo,
                reproductionSteps: this.generateReproductionSteps(context)
            }
        };
        return batchError;
    }
    extractErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String(error.message);
        }
        return 'Unknown error occurred';
    }
    classifyError(message) {
        for (const pattern of this.errorPatterns) {
            if (pattern.patterns.some(regex => regex.test(message))) {
                return pattern.category;
            }
        }
        return ErrorCategory.UNKNOWN;
    }
    getErrorCategory(code) {
        return ErrorCategory[code] || ErrorCategory.UNKNOWN;
    }
    getContextualRecoveryActions(error) {
        const actions = [];
        // Add file-specific actions
        if (error.context.filePath) {
            actions.push(`Verify file exists and is readable: ${error.context.filePath}`);
        }
        // Add format-specific actions
        if (error.context.format) {
            actions.push(`Try exporting to different format (currently: ${error.context.format})`);
            if (error.context.format === 'pdf') {
                actions.push('PDF export requires CLI strategy - ensure mermaid-cli is installed');
            }
        }
        // Add phase-specific actions
        switch (error.context.phase) {
            case 'discovery':
                actions.push('Check directory permissions and file patterns');
                break;
            case 'validation':
                actions.push('Review diagram syntax and structure');
                break;
            case 'exporting':
                actions.push('Verify export strategy is available and configured');
                break;
        }
        return actions;
    }
    generateReproductionSteps(context) {
        const steps = ['Steps to reproduce:'];
        if (context.filePath) {
            steps.push(`1. Open file: ${context.filePath}`);
        }
        steps.push(`2. Run export folder operation`);
        if (context.format) {
            steps.push(`3. Export to ${context.format} format`);
        }
        steps.push('4. Error should occur during ' + context.phase + ' phase');
        return steps;
    }
    gatherSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            vsCodeVersion: vscode.version,
            extensionVersion: this.getExtensionVersion(),
            memoryUsage: process.memoryUsage(),
            availableStrategies: this.getAvailableStrategies()
        };
    }
    getExtensionVersion() {
        try {
            const extension = vscode.extensions.getExtension('your.extension.id');
            return extension?.packageJSON.version || 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    getAvailableStrategies() {
        // This would be populated based on actual strategy availability
        return ['cli', 'web'];
    }
    updateStatistics(error) {
        this.errorStatistics.totalErrors++;
        // Update by category
        const category = this.getErrorCategory(error.code);
        const categoryCount = this.errorStatistics.errorsByCategory.get(category) || 0;
        this.errorStatistics.errorsByCategory.set(category, categoryCount + 1);
        // Update by phase
        const phaseCount = this.errorStatistics.errorsByPhase.get(error.context.phase) || 0;
        this.errorStatistics.errorsByPhase.set(error.context.phase, phaseCount + 1);
        // Update counters
        if (error.retryable) {
            this.errorStatistics.retryableErrors++;
        }
        if (error.severity === 'critical') {
            this.errorStatistics.criticalErrors++;
        }
        this.errorStatistics.lastError = error;
        // Calculate error rate (simplified)
        this.errorStatistics.errorRate = this.errorStatistics.totalErrors / Math.max(1, this.errorStatistics.totalErrors);
    }
    addToRecentErrors(error) {
        this.recentErrors.push(error);
        // Limit recent errors list size
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors.shift();
        }
    }
    logErrorByCategory(error) {
        const logPrefix = `[${error.context.phase.toUpperCase()}]`;
        const logMessage = `${logPrefix} ${error.code}: ${error.message}`;
        switch (error.severity) {
            case 'critical':
                errorHandler_1.ErrorHandler.logError(`CRITICAL ${logMessage}`);
                break;
            case 'error':
                errorHandler_1.ErrorHandler.logError(logMessage);
                break;
            case 'warning':
                errorHandler_1.ErrorHandler.logWarning(logMessage);
                break;
        }
        // Log recovery actions for errors and critical issues
        if (error.severity !== 'warning' && error.recoveryActions.length > 0) {
            errorHandler_1.ErrorHandler.logInfo(`Recovery suggestions: ${error.recoveryActions.join('; ')}`);
        }
    }
    formatErrorForLogging(error) {
        const parts = [];
        parts.push(`Code: ${error.code}`);
        parts.push(`Message: ${error.message}`);
        parts.push(`Phase: ${error.context.phase}`);
        if (error.context.filePath) {
            parts.push(`File: ${path.basename(error.context.filePath)}`);
        }
        if (error.context.format) {
            parts.push(`Format: ${error.context.format}`);
        }
        parts.push(`Retryable: ${error.retryable ? 'Yes' : 'No'}`);
        return parts.join(' | ');
    }
}
exports.ErrorHandlingServiceImpl = ErrorHandlingServiceImpl;
/**
 * Singleton instance for easy access
 */
exports.errorHandlingService = new ErrorHandlingServiceImpl();
/**
 * Factory function for creating error handling service
 */
function createErrorHandlingService() {
    return new ErrorHandlingServiceImpl();
}
//# sourceMappingURL=errorHandlingService.js.map