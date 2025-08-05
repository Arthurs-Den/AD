const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Simple API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'Sample Task', status: 'pending', created_at: new Date().toISOString() }
  ]);
});

app.get('/api/projects', (req, res) => {
  res.json([
    { id: 1, name: 'Sample Project', path: '/sample', created_at: new Date().toISOString() }
  ]);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AD Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});