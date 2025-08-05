const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'claude-code-ui.db'));
    this.init();
  }

  init() {
    // Create tables
    this.db.serialize(() => {
      // Projects table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          settings TEXT DEFAULT '{}'
        )
      `);

      // Tasks table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          command TEXT,
          status TEXT DEFAULT 'pending',
          priority TEXT DEFAULT 'medium',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          output TEXT,
          error TEXT,
          FOREIGN KEY (project_id) REFERENCES projects (id)
        )
      `);

      // Conversations table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id)
        )
      `);

      // Messages table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT DEFAULT '{}',
          FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
      `);

      // File changes table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS file_changes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER,
          task_id INTEGER,
          file_path TEXT NOT NULL,
          change_type TEXT NOT NULL,
          before_content TEXT,
          after_content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id),
          FOREIGN KEY (task_id) REFERENCES tasks (id)
        )
      `);
    });
  }

  // Projects
  async createProject(projectData) {
    return new Promise((resolve, reject) => {
      const { name, path, description, settings = {} } = projectData;
      
      this.db.run(
        'INSERT INTO projects (name, path, description, settings) VALUES (?, ?, ?, ?)',
        [name, path, description, JSON.stringify(settings)],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              name,
              path,
              description,
              settings,
              created_at: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  getProjects() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM projects ORDER BY updated_at DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const projects = rows.map(row => ({
            ...row,
            settings: JSON.parse(row.settings || '{}')
          }));
          resolve(projects);
        }
      });
    });
  }

  async getProject(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            ...row,
            settings: JSON.parse(row.settings || '{}')
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  // Tasks
  async createTask(taskData) {
    return new Promise((resolve, reject) => {
      const { project_id, title, description, command, priority = 'medium' } = taskData;
      
      this.db.run(
        'INSERT INTO tasks (project_id, title, description, command, priority) VALUES (?, ?, ?, ?, ?)',
        [project_id, title, description, command, priority],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              project_id,
              title,
              description,
              command,
              priority,
              status: 'pending',
              created_at: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  async getTasks(projectId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM tasks';
      let params = [];
      
      if (projectId) {
        query += ' WHERE project_id = ?';
        params.push(projectId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async updateTask(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      values.push(new Date().toISOString()); // updated_at
      values.push(id);
      
      this.db.run(
        `UPDATE tasks SET ${setClause}, updated_at = ? WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...updates, updated_at: new Date().toISOString() });
          }
        }
      );
    });
  }

  // Conversations
  async createConversation(projectId, title) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO conversations (project_id, title) VALUES (?, ?)',
        [projectId, title],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              project_id: projectId,
              title,
              created_at: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  async addMessage(conversationId, role, content, metadata = {}) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)',
        [conversationId, role, content, JSON.stringify(metadata)],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              conversation_id: conversationId,
              role,
              content,
              metadata,
              timestamp: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  async getConversation(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT c.*, p.name as project_name 
         FROM conversations c 
         LEFT JOIN projects p ON c.project_id = p.id 
         WHERE c.id = ?`,
        [id],
        (err, conversation) => {
          if (err) {
            reject(err);
            return;
          }

          if (!conversation) {
            resolve(null);
            return;
          }

          // Get messages for this conversation
          this.db.all(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
            [id],
            (err, messages) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  ...conversation,
                  messages: messages.map(msg => ({
                    ...msg,
                    metadata: JSON.parse(msg.metadata || '{}')
                  }))
                });
              }
            }
          );
        }
      );
    });
  }

  // File changes
  async recordFileChange(projectId, taskId, filePath, changeType, beforeContent, afterContent) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO file_changes (project_id, task_id, file_path, change_type, before_content, after_content) VALUES (?, ?, ?, ?, ?, ?)',
        [projectId, taskId, filePath, changeType, beforeContent, afterContent],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              project_id: projectId,
              task_id: taskId,
              file_path: filePath,
              change_type: changeType,
              timestamp: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  async getFileChanges(projectId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM file_changes WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?',
        [projectId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }
}

module.exports = Database;