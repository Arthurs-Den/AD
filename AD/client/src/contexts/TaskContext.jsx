import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe, sendMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      loadTasks();
    }
  }, [isConnected]);

  useEffect(() => {
    // Subscribe to task-related WebSocket messages
    const unsubscribeTaskCreated = subscribe('TASK_CREATED', (task) => {
      setTasks(prev => [task, ...prev]);
      updateTaskStats([task, ...tasks]);
    });

    const unsubscribeTaskStarted = subscribe('TASK_STARTED', (task) => {
      updateTask(task.id, task);
    });

    const unsubscribeTaskProgress = subscribe('TASK_PROGRESS', (progressData) => {
      const { taskId, progress, message, logs } = progressData;
      updateTask(taskId, { progress, logs });
    });

    const unsubscribeTaskCompleted = subscribe('TASK_COMPLETED', (task) => {
      updateTask(task.id, task);
    });

    const unsubscribeTaskCancelled = subscribe('TASK_CANCELLED', (task) => {
      updateTask(task.id, task);
    });

    return () => {
      unsubscribeTaskCreated();
      unsubscribeTaskStarted();
      unsubscribeTaskProgress();
      unsubscribeTaskCompleted();
      unsubscribeTaskCancelled();
    };
  }, [subscribe, tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      
      if (!response.ok) {
        throw new Error('Failed to load tasks');
      }
      
      const tasksData = await response.json();
      setTasks(tasksData);
      updateTaskStats(tasksData);
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = (taskId, updatedData) => {
    setTasks(prev => {
      const updated = prev.map(task => 
        task.id === taskId ? { ...task, ...updatedData } : task
      );
      updateTaskStats(updated);
      return updated;
    });
  };

  const updateTaskStats = (taskList) => {
    const stats = {
      total: taskList.length,
      pending: taskList.filter(t => t.status === 'pending').length,
      running: taskList.filter(t => t.status === 'running').length,
      completed: taskList.filter(t => t.status === 'completed').length,
      failed: taskList.filter(t => t.status === 'failed').length,
      cancelled: taskList.filter(t => t.status === 'cancelled').length
    };
    setTaskStats(stats);
  };

  const createTask = async (taskData) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const startTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start task');
      }

      const startedTask = await response.json();
      return startedTask;
    } catch (err) {
      console.error('Error starting task:', err);
      throw err;
    }
  };

  const cancelTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel task');
      }

      const cancelledTask = await response.json();
      return cancelledTask;
    } catch (err) {
      console.error('Error cancelling task:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(prev => {
        const filtered = prev.filter(t => t.id !== taskId);
        updateTaskStats(filtered);
        return filtered;
      });
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const executeClaudeCommand = async (command, args, options = {}) => {
    try {
      if (!sendMessage('EXECUTE_CLAUDE_COMMAND', { command, args, ...options })) {
        throw new Error('Unable to send command - WebSocket not connected');
      }

      // Return a promise that resolves when we get the command result
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Command execution timeout'));
        }, 300000); // 5 minutes timeout

        const unsubscribe = subscribe('COMMAND_RESULT', (result) => {
          clearTimeout(timeout);
          unsubscribe();
          
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Command execution failed'));
          }
        });
      });
    } catch (err) {
      console.error('Error executing Claude command:', err);
      throw err;
    }
  };

  const getTasksByProject = (projectId) => {
    return tasks.filter(task => task.project_id === projectId);
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getRunningTasks = () => {
    return tasks.filter(task => task.status === 'running');
  };

  const getPendingTasks = () => {
    return tasks.filter(task => task.status === 'pending');
  };

  const getRecentTasks = (limit = 10) => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  };

  const value = {
    tasks,
    taskStats,
    loading,
    error,
    createTask,
    startTask,
    cancelTask,
    deleteTask,
    executeClaudeCommand,
    getTasksByProject,
    getTasksByStatus,
    getRunningTasks,
    getPendingTasks,
    getRecentTasks,
    refreshTasks: loadTasks
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};