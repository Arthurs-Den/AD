class TaskManager {
  constructor(database) {
    this.db = database;
  }

  getAllTasks() {
    return this.db.getTasks();
  }

  getTasksByProject(projectId) {
    return this.db.getTasks(projectId);
  }

  async createTask(taskData) {
    return this.db.createTask(taskData);
  }

  async updateTask(taskId, updates) {
    return this.db.updateTask(taskId, updates);
  }

  getRunningTasks() {
    return this.db.getTasks().filter(task => task.status === 'running');
  }

  getRecentTasks(limit = 10) {
    return this.db.getTasks()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  getTaskStats() {
    const tasks = this.db.getTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }

  async startTask(taskId) {
    return this.updateTask(taskId, { 
      status: 'running',
      started_at: new Date().toISOString()
    });
  }

  async completeTask(taskId, output = null) {
    return this.updateTask(taskId, { 
      status: 'completed',
      completed_at: new Date().toISOString(),
      output
    });
  }

  async failTask(taskId, error = null) {
    return this.updateTask(taskId, { 
      status: 'failed',
      completed_at: new Date().toISOString(),
      error
    });
  }

  async cancelTask(taskId) {
    return this.updateTask(taskId, { 
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });
  }
}

module.exports = TaskManager;