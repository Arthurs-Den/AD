import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, 
  File, 
  FolderOpen, 
  Search, 
  RefreshCw, 
  Eye,
  GitBranch,
  Clock,
  Edit3,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const FileIcon = ({ fileName, isDirectory }) => {
  if (isDirectory) {
    return <Folder className="w-4 h-4 text-blue-500" />;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  const iconColors = {
    js: 'text-yellow-500',
    jsx: 'text-blue-400',
    ts: 'text-blue-600',
    tsx: 'text-blue-600',
    py: 'text-green-500',
    html: 'text-orange-500',
    css: 'text-blue-500',
    json: 'text-yellow-600',
    md: 'text-gray-600',
    txt: 'text-gray-500',
  };

  return <File className={`w-4 h-4 ${iconColors[extension] || 'text-gray-400'}`} />;
};

const FileTreeNode = ({ 
  node, 
  level = 0, 
  onFileSelect, 
  onFolderToggle, 
  expandedFolders,
  selectedFile,
  searchTerm 
}) => {
  const [isExpanded, setIsExpanded] = useState(expandedFolders.has(node.path));

  useEffect(() => {
    setIsExpanded(expandedFolders.has(node.path));
  }, [expandedFolders, node.path]);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onFolderToggle(node.path, newExpanded);
  };

  const handleClick = () => {
    if (node.type === 'directory') {
      handleToggle();
    } else {
      onFileSelect(node);
    }
  };

  const isSelected = selectedFile && selectedFile.path === node.path;
  const matchesSearch = !searchTerm || 
    node.name.toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch) {
    return null;
  }

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer rounded transition-colors ${
          isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <div className="mr-1">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </div>
        )}
        
        <FileIcon fileName={node.name} isDirectory={node.type === 'directory'} />
        
        <span className="ml-2 text-sm truncate flex-1">{node.name}</span>
        
        {node.type === 'file' && node.modified && (
          <span className="text-xs text-gray-400 ml-2">
            {new Date(node.modified).toLocaleDateString()}
          </span>
        )}
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onFolderToggle={onFolderToggle}
              expandedFolders={expandedFolders}
              selectedFile={selectedFile}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DiffViewer = ({ file, changes }) => {
  if (!changes || changes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No recent changes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change, index) => (
        <div key={index} className="border border-gray-200 rounded-lg">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{change.type} change</span>
              <span className="text-gray-500">
                {new Date(change.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Before</h4>
                <pre className="text-xs bg-red-50 border border-red-200 rounded p-2 overflow-auto max-h-40">
                  {change.before_content || 'File did not exist'}
                </pre>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">After</h4>
                <pre className="text-xs bg-green-50 border border-green-200 rounded p-2 overflow-auto max-h-40">
                  {change.after_content || 'File was deleted'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const FileExplorer = ({ onFileSelect, className = '' }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [fileChanges, setFileChanges] = useState({});
  const [showPreview, setShowPreview] = useState(true);

  const { currentProject, getProjectFiles } = useProjects();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    if (currentProject) {
      loadFiles();
    }
  }, [currentProject]);

  useEffect(() => {
    // Subscribe to file change notifications
    const unsubscribe = subscribe('FILE_CHANGED', (changeData) => {
      const { path, type } = changeData;
      
      // Add visual indicator for changed files
      setFileChanges(prev => ({
        ...prev,
        [path]: {
          type,
          timestamp: new Date(),
          ...prev[path]
        }
      }));

      // Refresh files if needed
      if (type === 'added' || type === 'deleted') {
        loadFiles();
      }
    });

    return unsubscribe;
  }, [subscribe]);

  const loadFiles = async () => {
    if (!currentProject) return;

    try {
      setLoading(true);
      setError(null);
      
      const projectFiles = await getProjectFiles(currentProject.path);
      
      // Build tree structure
      const tree = buildFileTree(projectFiles);
      setFiles(tree);
      
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (fileList) => {
    const tree = [];
    const pathMap = new Map();

    // Sort files by path
    const sortedFiles = fileList.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    sortedFiles.forEach(file => {
      const pathParts = file.relativePath.split('/').filter(Boolean);
      let currentLevel = tree;
      let currentPath = '';

      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLastPart = index === pathParts.length - 1;
        
        let existing = currentLevel.find(item => item.name === part);
        
        if (!existing) {
          existing = {
            name: part,
            path: `${currentProject.path}/${currentPath}`,
            relativePath: currentPath,
            type: isLastPart ? file.type : 'directory',
            children: isLastPart ? undefined : [],
            ...( isLastPart ? {
              size: file.size,
              modified: file.modified
            } : {})
          };
          
          currentLevel.push(existing);
          pathMap.set(currentPath, existing);
        }
        
        if (!isLastPart) {
          currentLevel = existing.children;
        }
      });
    });

    return tree;
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFolderToggle = (folderPath, isExpanded) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(folderPath);
      } else {
        newSet.delete(folderPath);
      }
      return newSet;
    });
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    
    const filterTree = (nodes) => {
      return nodes.reduce((acc, node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (node.type === 'directory' && node.children) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length > 0 || matchesSearch) {
            acc.push({
              ...node,
              children: filteredChildren
            });
          }
        } else if (matchesSearch) {
          acc.push(node);
        }
        
        return acc;
      }, []);
    };

    return filterTree(files);
  }, [files, searchTerm]);

  if (!currentProject) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
        <div className="p-6 text-center text-gray-500">
          <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No project selected</p>
          <p className="text-sm">Select a project to browse files</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">File Explorer</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1 rounded ${showPreview ? 'text-primary-600' : 'text-gray-400'}`}
              title="Toggle preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File Tree */}
        <div className="flex-1 p-2 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="spinner mx-auto mb-2"></div>
              Loading files...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-error-600">
              <p>Error loading files</p>
              <p className="text-sm">{error}</p>
              <button onClick={loadFiles} className="btn-primary mt-2">
                Retry
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <FileTreeNode
                  key={file.path}
                  node={file}
                  onFileSelect={handleFileSelect}
                  onFolderToggle={handleFolderToggle}
                  expandedFolders={expandedFolders}
                  selectedFile={selectedFile}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-80 border-l border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-700">
                {selectedFile ? 'File Details' : 'Preview'}
              </h4>
            </div>
            
            <div className="flex-1 overflow-auto p-3">
              {selectedFile ? (
                <div className="space-y-4">
                  {/* File Info */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">{selectedFile.name}</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Path:</strong> {selectedFile.relativePath}</p>
                      {selectedFile.size && (
                        <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
                      )}
                      {selectedFile.modified && (
                        <p><strong>Modified:</strong> {new Date(selectedFile.modified).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Changes */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Recent Changes
                    </h5>
                    <DiffViewer 
                      file={selectedFile} 
                      changes={fileChanges[selectedFile.path] ? [fileChanges[selectedFile.path]] : []} 
                    />
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button className="w-full btn-primary">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit with Claude
                    </button>
                    <button className="w-full btn-secondary">
                      <Eye className="w-4 h-4 mr-2" />
                      View Content
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Select a file to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;