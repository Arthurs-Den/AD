const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class ClaudeCodeIntegration extends EventEmitter {
  constructor() {
    super();
    this.activeProcesses = new Map();
    this.commandHistory = [];
  }

  // Execute Claude Code command
  async executeCommand(command, args = {}, options = {}) {
    const {
      cwd = process.cwd(),
      timeout = 300000, // 5 minutes default
      projectId,
      taskId
    } = options;

    const commandId = Date.now().toString();
    const startTime = new Date();

    try {
      // Validate Claude Code installation
      await this.validateClaudeCodeInstallation();

      // Build command arguments
      const cmdArgs = this.buildCommandArgs(command, args);
      
      console.log(`Executing Claude Code command: claude ${cmdArgs.join(' ')}`);

      const result = await this.runClaudeCodeProcess(cmdArgs, {
        cwd,
        timeout,
        commandId
      });

      // Record command execution
      const execution = {
        commandId,
        command,
        args,
        cwd,
        startTime,
        endTime: new Date(),
        success: result.success,
        output: result.output,
        error: result.error,
        projectId,
        taskId
      };

      this.commandHistory.push(execution);
      this.emit('commandExecuted', execution);

      return execution;

    } catch (error) {
      const execution = {
        commandId,
        command,
        args,
        cwd,
        startTime,
        endTime: new Date(),
        success: false,
        error: error.message,
        projectId,
        taskId
      };

      this.commandHistory.push(execution);
      this.emit('commandFailed', execution);
      
      throw error;
    }
  }

  // Validate that Claude Code is installed and accessible
  async validateClaudeCodeInstallation() {
    return new Promise((resolve, reject) => {
      const process = spawn('claude', ['--version'], { shell: true });
      
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Claude Code not found or not working. Error: ${error}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to execute Claude Code: ${err.message}`));
      });
    });
  }

  // Build command arguments array
  buildCommandArgs(command, args) {
    const cmdArgs = [];

    // Handle different command types
    switch (command) {
      case 'chat':
        cmdArgs.push('chat');
        if (args.message) cmdArgs.push(args.message);
        if (args.files) {
          args.files.forEach(file => {
            cmdArgs.push('--file', file);
          });
        }
        break;

      case 'review':
        cmdArgs.push('review');
        if (args.files) {
          args.files.forEach(file => cmdArgs.push(file));
        }
        break;

      case 'edit':
        cmdArgs.push('edit');
        if (args.file) cmdArgs.push(args.file);
        if (args.instruction) cmdArgs.push('--instruction', args.instruction);
        break;

      case 'create':
        cmdArgs.push('create');
        if (args.type) cmdArgs.push('--type', args.type);
        if (args.name) cmdArgs.push('--name', args.name);
        if (args.description) cmdArgs.push('--description', args.description);
        break;

      case 'debug':
        cmdArgs.push('debug');
        if (args.file) cmdArgs.push(args.file);
        if (args.error) cmdArgs.push('--error', args.error);
        break;

      case 'test':
        cmdArgs.push('test');
        if (args.file) cmdArgs.push(args.file);
        if (args.framework) cmdArgs.push('--framework', args.framework);
        break;

      case 'refactor':
        cmdArgs.push('refactor');
        if (args.file) cmdArgs.push(args.file);
        if (args.pattern) cmdArgs.push('--pattern', args.pattern);
        break;

      case 'document':
        cmdArgs.push('document');
        if (args.file) cmdArgs.push(args.file);
        if (args.format) cmdArgs.push('--format', args.format);
        break;

      default:
        // Custom command
        cmdArgs.push(command);
        if (args.custom) {
          cmdArgs.push(...args.custom);
        }
    }

    // Add common flags
    if (args.verbose) cmdArgs.push('--verbose');
    if (args.json) cmdArgs.push('--json');
    if (args.force) cmdArgs.push('--force');

    return cmdArgs;
  }

  // Run Claude Code process
  async runClaudeCodeProcess(args, options = {}) {
    return new Promise((resolve, reject) => {
      const { cwd, timeout, commandId } = options;
      
      const process = spawn('claude', args, {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeProcesses.set(commandId, process);

      let stdout = '';
      let stderr = '';
      let hasTimedOut = false;

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        hasTimedOut = true;
        process.kill('SIGTERM');
        
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

      // Collect output
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        this.emit('commandOutput', {
          commandId,
          type: 'stdout',
          data: chunk
        });
      });

      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.emit('commandOutput', {
          commandId,
          type: 'stderr',
          data: chunk
        });
      });

      process.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(commandId);

        if (hasTimedOut) {
          reject(new Error(`Command timed out after ${timeout}ms`));
          return;
        }

        const result = {
          success: code === 0,
          exitCode: code,
          output: stdout,
          error: stderr
        };

        if (code === 0) {
          resolve(result);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(commandId);
        reject(error);
      });
    });
  }

  // Cancel running command
  cancelCommand(commandId) {
    const process = this.activeProcesses.get(commandId);
    if (process) {
      process.kill('SIGTERM');
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
      
      this.activeProcesses.delete(commandId);
      return true;
    }
    return false;
  }

  // Get command templates for UI
  getCommandTemplates() {
    return {
      chat: {
        name: 'Chat',
        description: 'Start a conversation with Claude Code',
        params: [
          { name: 'message', type: 'text', required: true, placeholder: 'Your message...' },
          { name: 'files', type: 'file-list', required: false, placeholder: 'Select files to include' }
        ]
      },
      review: {
        name: 'Code Review',
        description: 'Review code files for improvements',
        params: [
          { name: 'files', type: 'file-list', required: true, placeholder: 'Select files to review' }
        ]
      },
      edit: {
        name: 'Edit File',
        description: 'Edit a specific file with instructions',
        params: [
          { name: 'file', type: 'file', required: true, placeholder: 'Select file to edit' },
          { name: 'instruction', type: 'text', required: true, placeholder: 'What changes to make...' }
        ]
      },
      create: {
        name: 'Create File',
        description: 'Create a new file or component',
        params: [
          { name: 'type', type: 'select', required: true, options: ['component', 'function', 'class', 'test', 'config'] },
          { name: 'name', type: 'text', required: true, placeholder: 'File/component name' },
          { name: 'description', type: 'text', required: false, placeholder: 'Description of what to create' }
        ]
      },
      debug: {
        name: 'Debug',
        description: 'Help debug issues in code',
        params: [
          { name: 'file', type: 'file', required: false, placeholder: 'File with the issue' },
          { name: 'error', type: 'text', required: false, placeholder: 'Error message or description' }
        ]
      },
      test: {
        name: 'Generate Tests',
        description: 'Generate tests for code files',
        params: [
          { name: 'file', type: 'file', required: true, placeholder: 'File to test' },
          { name: 'framework', type: 'select', required: false, options: ['jest', 'mocha', 'pytest', 'unittest'] }
        ]
      },
      refactor: {
        name: 'Refactor',
        description: 'Refactor code for better structure',
        params: [
          { name: 'file', type: 'file', required: true, placeholder: 'File to refactor' },
          { name: 'pattern', type: 'text', required: false, placeholder: 'Specific refactoring pattern' }
        ]
      },
      document: {
        name: 'Generate Documentation',
        description: 'Generate documentation for code',
        params: [
          { name: 'file', type: 'file', required: true, placeholder: 'File to document' },
          { name: 'format', type: 'select', required: false, options: ['markdown', 'jsdoc', 'sphinx', 'readme'] }
        ]
      }
    };
  }

  // Get command history
  getCommandHistory(limit = 50) {
    return this.commandHistory
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Get active commands
  getActiveCommands() {
    return Array.from(this.activeProcesses.keys());
  }

  // Analyze project to suggest relevant commands
  async analyzeProjectForSuggestions(projectPath) {
    try {
      const suggestions = [];
      
      // Check for common files and suggest appropriate commands
      const files = await fs.readdir(projectPath);
      
      // Check for package.json (Node.js project)
      if (files.includes('package.json')) {
        suggestions.push({
          command: 'review',
          reason: 'Node.js project detected - review package.json and dependencies',
          priority: 'medium'
        });
      }

      // Check for Python files
      const pythonFiles = files.filter(f => f.endsWith('.py'));
      if (pythonFiles.length > 0) {
        suggestions.push({
          command: 'test',
          reason: `${pythonFiles.length} Python files found - consider adding tests`,
          priority: 'medium'
        });
      }

      // Check for JavaScript/TypeScript files
      const jsFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx'));
      if (jsFiles.length > 0) {
        suggestions.push({
          command: 'document',
          reason: `${jsFiles.length} JavaScript/TypeScript files found - documentation might be helpful`,
          priority: 'low'
        });
      }

      // Check for README
      if (!files.some(f => f.toLowerCase().includes('readme'))) {
        suggestions.push({
          command: 'create',
          reason: 'No README found - consider creating project documentation',
          priority: 'low'
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error analyzing project:', error);
      return [];
    }
  }
}

module.exports = ClaudeCodeIntegration;