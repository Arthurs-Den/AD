import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Folder, 
  Terminal, 
  Settings, 
  MessageSquare, 
  Play, 
  Pause, 
  RotateCcw,
  Wifi,
  WifiOff,
  Bell,
  Search
} from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTasks } from '../contexts/TaskContext';
import { useProjects } from '../contexts/ProjectContext';
import { useNotifications } from '../contexts/NotificationContext';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { connectionStatus } = useWebSocket();
  const { taskStats } = useTasks();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard', badge: null },
    { path: '/projects', icon: Folder, label: 'Projects', badge: null },
    { path: '/tasks', icon: Terminal, label: 'Tasks', badge: taskStats.running > 0 ? taskStats.running : null },
    { path: '/chat', icon: MessageSquare, label: 'Chat', badge: null },
    { path: '/settings', icon: Settings, label: 'Settings', badge: null },
  ];

  return (
    <div 
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="ml-3">
              <h1 className="font-bold text-lg text-gray-900">Claude Code UI</h1>
              <div className="flex items-center text-xs text-gray-500">
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1 text-success-500" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1 text-error-500" />
                    Disconnected
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-primary-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quick Stats */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-primary-600">{taskStats.running}</div>
                <div className="text-gray-500">Running</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-warning-600">{taskStats.pending}</div>
                <div className="text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-success-600">{taskStats.completed}</div>
                <div className="text-gray-500">Done</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-error-600">{taskStats.failed}</div>
                <div className="text-gray-500">Failed</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Header = ({ onSidebarToggle, sidebarCollapsed }) => {
  const { currentProject } = useProjects();
  const { getRunningTasks } = useTasks();
  const { notifications } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const runningTasks = getRunningTasks();
  const unreadNotifications = notifications.length;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => onSidebarToggle(!sidebarCollapsed)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-4 h-4 space-y-1">
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
            </div>
          </button>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentProject ? currentProject.name : 'Claude Code UI'}
            </h2>
            {currentProject && (
              <p className="text-sm text-gray-500 truncate max-w-md">
                {currentProject.path}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Running Tasks Indicator */}
          {runningTasks.length > 0 && (
            <div className="flex items-center text-sm text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse mr-2"></div>
              {runningTasks.length} task{runningTasks.length !== 1 ? 's' : ''} running
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, files..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadNotifications > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={setSidebarCollapsed}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onSidebarToggle={setSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;