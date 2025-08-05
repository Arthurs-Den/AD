const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const Database = require('./database');
const TaskManager = require('./taskManager');
const ClaudeCodeIntegration = require('./claudeCodeIntegration');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize services
const db = new Database();
const taskManager = new TaskManager(db);
const claudeCode = new ClaudeCodeIntegration();

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  // Send initial state
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: {
      tasks: taskManager.getAllTasks(),
      projects: db.getProjects(),
      status: 'connected'
    }
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        data: { message: error.message }
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Handle WebSocket messages
async function handleWebSocketMessage(ws, data) {
  const { type, payload } = data;

  switch (type) {
    case 'CREATE_TASK':
      const task = await taskManager.createTask(payload);
      broadcast({
        type: 'TASK_CREATED',
        data: task
      });
      break;

    case 'EXECUTE_CLAUDE_COMMAND':
      const result = await claudeCode.executeCommand(payload.command, payload.args);
      ws.send(JSON.stringify({
        type: 'COMMAND_RESULT',
        data: result
      }));
      break;

    case 'GET_FILE_CONTENT':
      const content = await fs.readFile(payload.path, 'utf8');
      ws.send(JSON.stringify({
        type: 'FILE_CONTENT',
        data: { path: payload.path, content }
      }));
      break;

    case 'WATCH_DIRECTORY':
      watchDirectory(payload.path);
      break;

    case 'GET_PROJECT_FILES':
      const files = await getProjectFiles(payload.projectPath);
      ws.send(JSON.stringify({
        type: 'PROJECT_FILES',
        data: files
      }));
      break;

    default:
      console.warn('Unknown message type:', type);
  }
}

// File system watching
const watchers = new Map();

function watchDirectory(dirPath) {
  if (watchers.has(dirPath)) {
    return;
  }

  const watcher = chokidar.watch(dirPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher
    .on('change', (path) => {
      broadcast({
        type: 'FILE_CHANGED',
        data: { path, type: 'modified' }
      });
    })
    .on('add', (path) => {
      broadcast({
        type: 'FILE_CHANGED',
        data: { path, type: 'added' }
      });
    })
    .on('unlink', (path) => {
      broadcast({
        type: 'FILE_CHANGED',
        data: { path, type: 'deleted' }
      });
    });

  watchers.set(dirPath, watcher);
}

// Get project files recursively
async function getProjectFiles(projectPath) {
  const files = [];
  
  async function scanDirectory(dir, relativePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // Skip hidden files
        
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
            type: 'directory',
            children: []
          });
          await scanDirectory(fullPath, relPath);
        } else {
          const stat = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
            type: 'file',
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
  }
  
  await scanDirectory(projectPath);
  return files;
}

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/tasks', (req, res) => {
  res.json(taskManager.getAllTasks());
});

app.post('/api/tasks', async (req, res) => {
  try {
    const task = await taskManager.createTask(req.body);
    broadcast({
      type: 'TASK_CREATED',
      data: task
    });
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/projects', (req, res) => {
  res.json(db.getProjects());
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = await db.createProject(req.body);
    broadcast({
      type: 'PROJECT_CREATED',
      data: project
    });
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Claude Code UI Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  watchers.forEach(watcher => watcher.close());
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});