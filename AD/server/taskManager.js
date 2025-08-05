const { EventEmitter } = require('events');

class TaskManager extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.activeTasks = new Map();
    this.taskQueue = [];
  }

  async createTask(taskData) {
    try {
      // Validate required fields
      if (!taskData.title) {
        throw new Error('Task title is required');
      }

      // Create task in database
      const task = await this.db.createTask({
        ...taskData,
        status: 'pending'
      });

      // Add to active tasks
      this.activeTasks.set(task.id, {
        ...task,
        progress: 0,
        startTime: null,
        endTime: null,
        logs: []
      });

      this.emit('taskCreated', task);
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async startTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending state`);
    }

    // Update task status
    task.status = 'running';
    task.startTime = new Date();
    task.progress = 0;

    await this.db.updateTask(taskId, {
      status: 'running',
      updated_at: new Date().toISOString()
    });

    this.emit('taskStarted', task);
    return task;
  }

  async updateTaskProgress(taskId, progress, message = '') {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.progress = Math.min(100, Math.max(0, progress));
    
    if (message) {
      task.logs.push({
        timestamp: new Date(),
        message,
        type: 'progress'
      });
    }

    this.emit('taskProgress', {
      taskId,
      progress: task.progress,
      message,
      logs: task.logs
    });

    return task;
  }

  async completeTask(taskId, output = '', error = null) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const status = error ? 'failed' : 'completed';
    const endTime = new Date();

    // Update task
    task.status = status;
    task.endTime = endTime;
    task.progress = error ? task.progress : 100;
    task.output = output;
    task.error = error;

    // Update in database
    await this.db.updateTask(taskId, {
      status,
      completed_at: endTime.toISOString(),
      output,
      error: error ? error.message || error : null
    });

    this.emit('taskCompleted', task);
    return task;
  }

  async cancelTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error(`Cannot cancel ${task.status} task`);
    }

    task.status = 'cancelled';
    task.endTime = new Date();

    await this.db.updateTask(taskId, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });

    this.emit('taskCancelled', task);
    return task;
  }

  async getTask(taskId) {
    return this.activeTasks.get(taskId) || await this.db.getTask(taskId);
  }

  getAllTasks() {
    return Array.from(this.activeTasks.values());
  }

  async getTasksByProject(projectId) {
    const dbTasks = await this.db.getTasks(projectId);
    const activeTasks = Array.from(this.activeTasks.values())
      .filter(task => task.project_id === projectId);

    // Merge active tasks with database tasks
    const taskMap = new Map();
    
    // Add database tasks first
    dbTasks.forEach(task => taskMap.set(task.id, task));
    
    // Override with active task data
    activeTasks.forEach(task => taskMap.set(task.id, task));

    return Array.from(taskMap.values());
  }

  getTaskStats() {
    const tasks = Array.from(this.activeTasks.values());
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    };
  }

  getRunningTasks() {
    return Array.from(this.activeTasks.values())
      .filter(task => task.status === 'running');
  }

  // Task templates for common Claude Code operations
  getTaskTemplates() {
    return {
      'code-review': {
        title: 'Code Review',
        description: 'Review code changes and provide feedback',
        command: 'claude-code review',
        priority: 'medium',
        estimatedDuration: '5-10 minutes'
      },
      'refactor': {
        title: 'Refactor Code',
        description: 'Refactor code for better structure and readability',
        command: 'claude-code refactor',
        priority: 'medium',
        estimatedDuration: '10-20 minutes'
      },
      'debug': {
        title: 'Debug Issue',
        description: 'Identify and fix bugs in the code',
        command: 'claude-code debug',
        priority: 'high',
        estimatedDuration: '15-30 minutes'
      },
      'documentation': {
        title: 'Generate Documentation',
        description: 'Create or update code documentation',
        command: 'claude-code document',
        priority: 'low',
        estimatedDuration: '5-15 minutes'
      },
      'test': {
        title: 'Write Tests',
        description: 'Generate unit tests for the code',
        command: 'claude-code test',
        priority: 'medium',
        estimatedDuration: '10-20 minutes'
      },
      'optimize': {
        title: 'Optimize Performance',
        description: 'Analyze and improve code performance',
        command: 'claude-code optimize',
        priority: 'medium',
        estimatedDuration: '15-25 minutes'
      }
    };
  }

  // Priority-based task ordering
  prioritizeTask(taskId, newPriority) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.priority = newPriority;
    this.db.updateTask(taskId, { priority: newPriority });
    
    this.emit('taskPrioritized', { taskId, priority: newPriority });
    return task;
  }

  // Get tasks sorted by priority and creation time
  getTaskQueue() {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    return Array.from(this.activeTasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // If same priority, sort by creation time
        return new Date(a.created_at) - new Date(b.created_at);
      });
  }

  // Clean up completed tasks older than specified days
  async cleanupOldTasks(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const tasksToRemove = [];
    
    for (const [taskId, task] of this.activeTasks.entries()) {
      if ((task.status === 'completed' || task.status === 'failed') &&
          task.endTime && task.endTime < cutoffDate) {
        tasksToRemove.push(taskId);
      }
    }

    tasksToRemove.forEach(taskId => {
      this.activeTasks.delete(taskId);
    });

    this.emit('tasksCleanedUp', { removedCount: tasksToRemove.length });
    
    return tasksToRemove.length;
  }
}

module.exports = TaskManager;