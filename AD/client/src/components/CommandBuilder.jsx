import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  Save, 
  FileText, 
  Folder, 
  Settings as SettingsIcon,
  Zap,
  ChevronDown,
  Plus,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import { useProjects } from '../contexts/ProjectContext';
import { useNotifications } from '../contexts/NotificationContext';

const CommandTemplates = {
  chat: {
    name: 'Chat with Claude',
    icon: Terminal,
    description: 'Start a conversation with Claude Code',
    color: 'bg-primary-500',
    params: [
      { 
        name: 'message', 
        type: 'textarea', 
        required: true, 
        placeholder: 'What would you like to ask Claude?',
        label: 'Message'
      },
      { 
        name: 'files', 
        type: 'file-selector', 
        required: false, 
        placeholder: 'Select files to include in context',
        label: 'Context Files',
        multiple: true
      }
    ]
  },
  review: {
    name: 'Code Review',
    icon: FileText,
    description: 'Get detailed code review and suggestions',
    color: 'bg-secondary-500',
    params: [
      { 
        name: 'files', 
        type: 'file-selector', 
        required: true, 
        placeholder: 'Select files to review',
        label: 'Files to Review',
        multiple: true
      },
      {
        name: 'focus',
        type: 'select',
        required: false,
        label: 'Review Focus',
        options: ['general', 'performance', 'security', 'maintainability', 'testing'],
        placeholder: 'What should Claude focus on?'
      }
    ]
  },
  edit: {
    name: 'Edit Code',
    icon: Zap,
    description: 'Make specific changes to code files',
    color: 'bg-warning-500',
    params: [
      { 
        name: 'file', 
        type: 'file-selector', 
        required: true, 
        placeholder: 'Select file to edit',
        label: 'Target File'
      },
      { 
        name: 'instruction', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Describe what changes you want...',
        label: 'Instructions'
      }
    ]
  },
  create: {
    name: 'Create File',
    icon: Plus,
    description: 'Create new files or components',
    color: 'bg-success-500',
    params: [
      {
        name: 'type',
        type: 'select',
        required: true,
        label: 'File Type',
        options: ['component', 'function', 'class', 'test', 'config', 'documentation'],
        placeholder: 'What type of file?'
      },
      { 
        name: 'name', 
        type: 'text', 
        required: true, 
        placeholder: 'MyComponent.jsx',
        label: 'File Name'
      },
      { 
        name: 'directory', 
        type: 'directory-selector', 
        required: false, 
        placeholder: 'Choose destination folder',
        label: 'Destination'
      },
      { 
        name: 'description', 
        type: 'textarea', 
        required: false, 
        placeholder: 'Describe what this file should do...',
        label: 'Description'
      }
    ]
  },
  debug: {
    name: 'Debug Issue',
    icon: AlertCircle,
    description: 'Get help debugging code problems',
    color: 'bg-error-500',
    params: [
      { 
        name: 'file', 
        type: 'file-selector', 
        required: false, 
        placeholder: 'File with the issue',
        label: 'Problem File'
      },
      { 
        name: 'error', 
        type: 'textarea', 
        required: false, 
        placeholder: 'Paste error message or describe the problem...',
        label: 'Error/Issue Description'
      },
      {
        name: 'reproduce',
        type: 'textarea',
        required: false,
        placeholder: 'Steps to reproduce the issue...',
        label: 'How to Reproduce'
      }
    ]
  },
  test: {
    name: 'Generate Tests',
    icon: CheckCircle,
    description: 'Create comprehensive tests for your code',
    color: 'bg-indigo-500',
    params: [
      { 
        name: 'file', 
        type: 'file-selector', 
        required: true, 
        placeholder: 'File to test',
        label: 'Source File'
      },
      {
        name: 'framework',
        type: 'select',
        required: false,
        label: 'Test Framework',
        options: ['jest', 'mocha', 'pytest', 'unittest', 'vitest', 'cypress'],
        placeholder: 'Choose testing framework'
      },
      {
        name: 'type',
        type: 'select',
        required: false,
        label: 'Test Type',
        options: ['unit', 'integration', 'e2e'],
        placeholder: 'What type of tests?'
      }
    ]
  }
};

const FileSelector = ({ value, onChange, multiple = false, placeholder }) => {
  const { currentProject, getProjectFiles } = useProjects();
  const [files, setFiles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProject && isOpen) {
      loadFiles();
    }
  }, [currentProject, isOpen]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const projectFiles = await getProjectFiles(currentProject.path);
      setFiles(projectFiles.filter(f => f.type === 'file'));
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (multiple) {
      const currentFiles = Array.isArray(value) ? value : [];
      const isSelected = currentFiles.some(f => f.path === file.path);
      
      if (isSelected) {
        onChange(currentFiles.filter(f => f.path !== file.path));
      } else {
        onChange([...currentFiles, file]);
      }
    } else {
      onChange(file);
      setIsOpen(false);
    }
  };

  const displayValue = () => {
    if (multiple && Array.isArray(value)) {
      return value.length > 0 ? `${value.length} files selected` : placeholder;
    }
    return value ? value.name : placeholder;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {displayValue()}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="spinner"></div>
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No files found
            </div>
          ) : (
            files.map((file) => {
              const isSelected = multiple 
                ? Array.isArray(value) && value.some(f => f.path === file.path)
                : value && value.path === file.path;

              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => handleFileSelect(file)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center ${
                    isSelected ? 'bg-primary-50 text-primary-700' : ''
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-sm text-gray-500 truncate">{file.relativePath}</div>
                  </div>
                  {isSelected && multiple && (
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const ParameterInput = ({ param, value, onChange }) => {
  const renderInput = () => {
    switch (param.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder}
            className="input"
            required={param.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder}
            rows={4}
            className="input resize-none"
            required={param.required}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="input"
            required={param.required}
          >
            <option value="">{param.placeholder}</option>
            {param.options.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );

      case 'file-selector':
        return (
          <FileSelector
            value={value}
            onChange={onChange}
            multiple={param.multiple}
            placeholder={param.placeholder}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder}
            className="input"
            required={param.required}
          />
        );
    }
  };

  return (
    <div>
      <label className="label">
        {param.label}
        {param.required && <span className="text-error-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
};

const CommandBuilder = ({ onExecute, className = '' }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('chat');
  const [parameters, setParameters] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { executeClaudeCommand } = useTasks();
  const { currentProject } = useProjects();
  const { success, error } = useNotifications();

  const template = CommandTemplates[selectedTemplate];

  const handleParameterChange = (paramName, value) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));

    // Clear validation error for this field
    if (validationErrors[paramName]) {
      setValidationErrors(prev => ({
        ...prev,
        [paramName]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    template.params.forEach(param => {
      if (param.required && !parameters[param.name]) {
        errors[param.name] = `${param.label} is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExecute = async () => {
    if (!validateForm()) {
      error('Please fill in all required fields');
      return;
    }

    if (!currentProject) {
      error('Please select a project first');
      return;
    }

    try {
      setIsExecuting(true);
      
      const result = await executeClaudeCommand(selectedTemplate, parameters, {
        projectId: currentProject.id,
        cwd: currentProject.path
      });

      success(`Successfully executed ${template.name}`);
      
      if (onExecute) {
        onExecute(result);
      }

      // Reset form
      setParameters({});
      
    } catch (err) {
      error(`Failed to execute command: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveTemplate = () => {
    // TODO: Implement saving custom templates
    success('Template saved to favorites');
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Command Builder</h3>
        <p className="text-gray-600">Build and execute Claude Code commands visually</p>
      </div>

      <div className="p-6">
        {/* Template Selection */}
        <div className="mb-6">
          <label className="label">Command Template</label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(CommandTemplates).map(([key, tmpl]) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTemplate(key);
                    setParameters({});
                    setValidationErrors({});
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate === key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${tmpl.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{tmpl.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{tmpl.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-4 mb-6">
          {template.params.map((param) => (
            <div key={param.name}>
              <ParameterInput
                param={param}
                value={parameters[param.name]}
                onChange={(value) => handleParameterChange(param.name, value)}
              />
              {validationErrors[param.name] && (
                <p className="text-error-500 text-sm mt-1">{validationErrors[param.name]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSaveTemplate}
            className="btn-secondary"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </button>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setParameters({});
                setValidationErrors({});
              }}
              className="btn-ghost"
            >
              Clear
            </button>
            
            <button
              onClick={handleExecute}
              disabled={isExecuting || !currentProject}
              className="btn-primary"
            >
              {isExecuting ? (
                <>
                  <div className="spinner mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Command
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Command Preview</h4>
          <code className="text-sm text-gray-600 font-mono">
            claude {selectedTemplate}
            {Object.entries(parameters).map(([key, value]) => {
              if (!value) return '';
              if (Array.isArray(value)) {
                return value.map(v => ` --${key} "${v.path || v}"`).join('');
              }
              if (typeof value === 'object' && value.path) {
                return ` --${key} "${value.path}"`;
              }
              return ` --${key} "${value}"`;
            }).join('')}
          </code>
        </div>
      </div>
    </div>
  );
};

export default CommandBuilder;