import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Folder, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Play,
  Pause,
  Settings,
  Plus,
  Eye,
  BarChart3,
  Zap
} from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import { useProjects } from '../contexts/ProjectContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommandBuilder from '../components/CommandBuilder';
import FileExplorer from '../components/FileExplorer';
import ChatInterface from '../components/ChatInterface';

const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    secondary: 'bg-secondary-500'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
          <span className="text-success-600 font-medium">{trend}</span>
          <span className="text-gray-500 ml-1">vs last week</span>
        </div>
      )}
    </div>
  );
};

const TaskCard = ({ task, onStart, onCancel, onView }) => {
  const statusColors = {
    pending: 'bg-warning-100 text-warning-800',
    running: 'bg-primary-100 text-primary-800',
    completed: 'bg-success-100 text-success-800',
    failed: 'bg-error-100 text-error-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const statusIcons = {
    pending: Clock,
    running: Play,
    completed: CheckCircle,
    failed: AlertCircle,
    cancelled: Pause
  };

  const StatusIcon = statusIcons[task.status] || Clock;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span>Project: {task.project_name || 'Unknown'}</span>
            <span>Priority: {task.priority}</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${statusColors[task.status]}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {task.status}
        </div>
      </div>

      {task.status === 'running' && task.progress !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {new Date(task.created_at).toLocaleDateString()}
        </span>
        
        <div className="flex space-x-2">
          {task.status === 'pending' && (
            <button 
              onClick={() => onStart(task)}
              className="text-xs bg-success-500 text-white px-3 py-1 rounded-full hover:bg-success-600 transition-colors"
            >
              Start
            </button>
          )}
          
          {task.status === 'running' && (
            <button 
              onClick={() => onCancel(task)}
              className="text-xs bg-error-500 text-white px-3 py-1 rounded-full hover:bg-error-600 transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button 
            onClick={() => onView(task)}
            className="text-xs bg-gray-500 text-white px-3 py-1 rounded-full hover:bg-gray-600 transition-colors"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

const QuickActions = ({ onNewTask, onNewProject }) => {
  const actions = [
    {
      title: 'New Chat',
      description: 'Start conversation with Claude',
      icon: Terminal,
      color: 'bg-primary-500',
      action: () => {/* Navigate to chat */}
    },
    {
      title: 'Review Code',
      description: 'Get code review and suggestions',
      icon: Eye,
      color: 'bg-secondary-500',
      action: () => onNewTask('review')
    },
    {
      title: 'Debug Issue',
      description: 'Help debug code problems',
      icon: AlertCircle,
      color: 'bg-error-500',
      action: () => onNewTask('debug')
    },
    {
      title: 'Generate Tests',
      description: 'Create comprehensive tests',
      icon: CheckCircle,
      color: 'bg-success-500',
      action: () => onNewTask('test')
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2" />
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{action.title}</h4>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <button onClick={onNewProject} className="flex-1 btn-secondary">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </button>
          <button onClick={() => onNewTask('custom')} className="flex-1 btn-primary">
            <Terminal className="w-4 h-4 mr-2" />
            Custom Command
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeView, setActiveView] = useState('overview');
  const [showCommandBuilder, setShowCommandBuilder] = useState(false);
  
  const { 
    tasks, 
    taskStats, 
    loading: tasksLoading, 
    startTask, 
    cancelTask,
    getRecentTasks,
    getRunningTasks
  } = useTasks();
  
  const { 
    projects, 
    currentProject, 
    loading: projectsLoading,
    createProject 
  } = useProjects();
  
  const { success, error } = useNotifications();

  const recentTasks = getRecentTasks(5);
  const runningTasks = getRunningTasks();

  const handleStartTask = async (task) => {
    try {
      await startTask(task.id);
      success(`Started task: ${task.title}`);
    } catch (err) {
      error(`Failed to start task: ${err.message}`);
    }
  };

  const handleCancelTask = async (task) => {
    try {
      await cancelTask(task.id);
      success(`Cancelled task: ${task.title}`);
    } catch (err) {
      error(`Failed to cancel task: ${err.message}`);
    }
  };

  const handleViewTask = (task) => {
    // Navigate to task detail view
    console.log('View task:', task);
  };

  const handleNewProject = async () => {
    try {
      const projectData = {
        name: `Project ${projects.length + 1}`,
        path: `/path/to/project-${Date.now()}`,
        description: 'New project created from dashboard'
      };
      
      await createProject(projectData);
      success('New project created');
    } catch (err) {
      error(`Failed to create project: ${err.message}`);
    }
  };

  const handleNewTask = (type) => {
    setShowCommandBuilder(true);
  };

  if (tasksLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Claude Code Dashboard</h1>
        <p className="text-gray-600">
          Manage your coding tasks and interact with Claude Code AI assistant
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Terminal}
          title="Active Tasks"
          value={taskStats.running}
          subtitle={`${taskStats.pending} pending`}
          color="primary"
        />
        <StatCard
          icon={CheckCircle}
          title="Completed"
          value={taskStats.completed}
          subtitle="This week"
          trend="+23%"
          color="success"
        />
        <StatCard
          icon={Folder}
          title="Projects"
          value={projects.length}
          subtitle={currentProject ? `Current: ${currentProject.name}` : 'No project selected'}
          color="secondary"
        />
        <StatCard
          icon={BarChart3}
          title="Success Rate"
          value="94%"
          subtitle="Task completion rate"
          trend="+5%"
          color="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <QuickActions 
            onNewTask={handleNewTask}
            onNewProject={handleNewProject}
          />

          {/* Running Tasks */}
          {runningTasks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Play className="w-5 h-5 mr-2 text-primary-500" />
                Running Tasks ({runningTasks.length})
              </h3>
              
              <div className="space-y-3">
                {runningTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStart={handleStartTask}
                    onCancel={handleCancelTask}
                    onView={handleViewTask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {showCommandBuilder ? (
            <CommandBuilder 
              onExecute={() => setShowCommandBuilder(false)}
              className="h-fit"
            />
          ) : (
            <FileExplorer className="h-96" />
          )}

          {/* Recent Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Tasks
              </h3>
              <button 
                onClick={() => setShowCommandBuilder(!showCommandBuilder)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {showCommandBuilder ? 'Hide Builder' : 'Show Builder'}
              </button>
            </div>
            
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Terminal className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No tasks yet</p>
                <p className="text-sm">Create your first task to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStart={handleStartTask}
                    onCancel={handleCancelTask}
                    onView={handleViewTask}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-3">
          <ChatInterface className="h-[600px]" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;