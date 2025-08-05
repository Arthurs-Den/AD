import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import TaskView from './pages/TaskView';
import Settings from './pages/Settings';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { TaskProvider } from './contexts/TaskContext';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <div className="App">
      <NotificationProvider>
        <WebSocketProvider>
          <ProjectProvider>
            <TaskProvider>
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/project/:projectId" element={<ProjectView />} />
                    <Route path="/task/:taskId" element={<TaskView />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </Router>
            </TaskProvider>
          </ProjectProvider>
        </WebSocketProvider>
      </NotificationProvider>
    </div>
  );
}

export default App;