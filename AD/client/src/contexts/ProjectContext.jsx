import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

const ProjectContext = createContext();

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe, sendMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      loadProjects();
    }
  }, [isConnected]);

  useEffect(() => {
    // Subscribe to project-related WebSocket messages
    const unsubscribeProjectCreated = subscribe('PROJECT_CREATED', (project) => {
      setProjects(prev => [project, ...prev]);
    });

    const unsubscribeProjectUpdated = subscribe('PROJECT_UPDATED', (updatedProject) => {
      setProjects(prev => 
        prev.map(p => p.id === updatedProject.id ? updatedProject : p)
      );
      
      if (currentProject && currentProject.id === updatedProject.id) {
        setCurrentProject(updatedProject);
      }
    });

    return () => {
      unsubscribeProjectCreated();
      unsubscribeProjectUpdated();
    };
  }, [subscribe, currentProject]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      
      const projectsData = await response.json();
      setProjects(projectsData);
      
      // Set the first project as current if none is selected
      if (!currentProject && projectsData.length > 0) {
        setCurrentProject(projectsData[0]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json();
      
      // The project will be added to the list via WebSocket message
      // but we'll also set it as current immediately
      setCurrentProject(newProject);
      
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const selectProject = (project) => {
    setCurrentProject(project);
    
    // Watch the project directory for file changes
    if (sendMessage('WATCH_DIRECTORY', { path: project.path })) {
      console.log(`Now watching directory: ${project.path}`);
    }
  };

  const updateProject = async (projectId, updates) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const updatedProject = await response.json();
      return updatedProject;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const deleteProject = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      if (currentProject && currentProject.id === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  const getProjectFiles = async (projectPath) => {
    try {
      if (!sendMessage('GET_PROJECT_FILES', { projectPath })) {
        throw new Error('Unable to send request - WebSocket not connected');
      }
      
      // The files will be received via WebSocket
      // Return a promise that resolves when we get the response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for project files'));
        }, 10000);

        const unsubscribe = subscribe('PROJECT_FILES', (files) => {
          clearTimeout(timeout);
          unsubscribe();
          resolve(files);
        });
      });
    } catch (err) {
      console.error('Error getting project files:', err);
      throw err;
    }
  };

  const value = {
    projects,
    currentProject,
    loading,
    error,
    createProject,
    selectProject,
    updateProject,
    deleteProject,
    getProjectFiles,
    refreshProjects: loadProjects
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};