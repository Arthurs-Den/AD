// Simple in-memory database for production deployment
class Database {
  constructor() {
    this.projects = [];
    this.tasks = [];
    this.conversations = [];
    this.messages = [];
    this.fileChanges = [];
    this.nextId = 1;
  }

  // Projects
  getProjects() {
    return this.projects;
  }

  createProject(projectData) {
    const project = {
      id: this.nextId++,
      ...projectData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.projects.push(project);
    return project;
  }

  getProjectById(id) {
    return this.projects.find(p => p.id === parseInt(id));
  }

  // Tasks
  getTasks(projectId = null) {
    return projectId 
      ? this.tasks.filter(t => t.project_id === projectId)
      : this.tasks;
  }

  createTask(taskData) {
    const task = {
      id: this.nextId++,
      ...taskData,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tasks.push(task);
    return task;
  }

  updateTask(id, updates) {
    const taskIndex = this.tasks.findIndex(t => t.id === parseInt(id));
    if (taskIndex >= 0) {
      this.tasks[taskIndex] = {
        ...this.tasks[taskIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      return this.tasks[taskIndex];
    }
    return null;
  }

  // Conversations
  getConversations(projectId = null) {
    return projectId 
      ? this.conversations.filter(c => c.project_id === projectId)
      : this.conversations;
  }

  createConversation(conversationData) {
    const conversation = {
      id: this.nextId++,
      ...conversationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.conversations.push(conversation);
    return conversation;
  }

  // Messages
  getMessages(conversationId) {
    return this.messages.filter(m => m.conversation_id === parseInt(conversationId));
  }

  createMessage(messageData) {
    const message = {
      id: this.nextId++,
      ...messageData,
      timestamp: new Date().toISOString()
    };
    this.messages.push(message);
    return message;
  }

  // File Changes
  getFileChanges(filePath) {
    return this.fileChanges.filter(fc => fc.file_path === filePath);
  }

  recordFileChange(changeData) {
    const change = {
      id: this.nextId++,
      ...changeData,
      timestamp: new Date().toISOString()
    };
    this.fileChanges.push(change);
    return change;
  }
}

module.exports = Database;