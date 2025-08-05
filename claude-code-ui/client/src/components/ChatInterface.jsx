import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Bot, 
  User, 
  Clock, 
  FileText, 
  Code, 
  Trash2,
  MessageSquare,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreVertical
} from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useProjects } from '../contexts/ProjectContext';
import { useNotifications } from '../contexts/NotificationContext';

const MessageBubble = ({ message, onCopy, onFeedback, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const formatContent = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg my-2 overflow-auto"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  };

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-start space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary-500' : isSystem ? 'bg-gray-500' : 'bg-secondary-500'
          }`}>
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : isSystem ? (
              <MessageSquare className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>

          {/* Message Content */}
          <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-4 py-3 rounded-lg ${
              isUser 
                ? 'bg-primary-500 text-white' 
                : isSystem
                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                : 'bg-gray-100 text-gray-900 border border-gray-200'
            }`}>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
              />
              
              {/* Attachments */}
              {message.metadata?.files && (
                <div className="mt-2 space-y-1">
                  {message.metadata.files.map((file, index) => (
                    <div key={index} className="flex items-center text-xs opacity-80">
                      <FileText className="w-3 h-3 mr-1" />
                      {file.name || file}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>

            {/* Actions */}
            {showActions && !isSystem && (
              <div className={`flex items-center mt-2 space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                <button
                  onClick={() => onCopy(message.content)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Copy message"
                >
                  <Copy className="w-3 h-3" />
                </button>
                
                {!isUser && (
                  <>
                    <button
                      onClick={() => onFeedback(message.id, 'positive')}
                      className="p-1 text-gray-400 hover:text-green-600 rounded"
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onFeedback(message.id, 'negative')}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AttachmentButton = ({ onAttachFiles, attachedFiles, onRemoveFile }) => {
  const [showAttachments, setShowAttachments] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    onAttachFiles(files);
    event.target.value = ''; // Reset input
  };

  return (
    <div className="relative">
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`p-2 rounded-lg transition-colors ${
          attachedFiles.length > 0 
            ? 'text-primary-600 bg-primary-50' 
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        title="Attach files"
      >
        <Paperclip className="w-4 h-4" />
        {attachedFiles.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
            {attachedFiles.length}
          </span>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.yml,.yaml"
      />

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Attached Files</h4>
          <div className="space-y-2 max-h-32 overflow-auto">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center flex-1 min-w-0">
                  <FileText className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  onClick={() => onRemoveFile(index)}
                  className="ml-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatInterface = ({ conversationId, className = '' }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { sendMessage, subscribe } = useWebSocket();
  const { currentProject } = useProjects();
  const { success, error } = useNotifications();

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Subscribe to chat messages
    const unsubscribeChatMessage = subscribe('CHAT_MESSAGE', (message) => {
      setMessages(prev => [...prev, message]);
      setIsLoading(false);
    });

    const unsubscribeChatError = subscribe('CHAT_ERROR', (errorData) => {
      error(`Chat error: ${errorData.message}`);
      setIsLoading(false);
    });

    // Load conversation history if conversationId is provided
    if (conversationId) {
      loadConversationHistory();
    }

    return () => {
      unsubscribeChatMessage();
      unsubscribeChatError();
    };
  }, [conversationId, subscribe]);

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const conversation = await response.json();
        setMessages(conversation.messages || []);
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
      metadata: {
        files: attachedFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      }
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Send to Claude Code
      const success = sendMessage('CHAT_MESSAGE', {
        message: userMessage.content,
        files: attachedFiles,
        projectId: currentProject?.id,
        conversationId
      });

      if (!success) {
        throw new Error('Failed to send message - not connected');
      }

    } catch (err) {
      error(`Failed to send message: ${err.message}`);
      setIsLoading(false);
      
      // Remove the user message if sending failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachFiles = (files) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      success('Message copied to clipboard');
    }).catch(() => {
      error('Failed to copy message');
    });
  };

  const handleMessageFeedback = (messageId, feedback) => {
    // TODO: Implement feedback storage
    success(`Feedback recorded: ${feedback}`);
  };

  const handleDeleteMessage = (messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const clearChat = () => {
    setMessages([]);
    success('Chat cleared');
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Claude Code Chat</h3>
            {currentProject && (
              <p className="text-sm text-gray-500">Project: {currentProject.name}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a conversation with Claude</p>
            <p className="text-sm">
              Ask questions about your code, request help with debugging, or get suggestions for improvements.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={handleCopyMessage}
                onFeedback={handleMessageFeedback}
                onDelete={handleDeleteMessage}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <AttachmentButton
            onAttachFiles={handleAttachFiles}
            attachedFiles={attachedFiles}
            onRemoveFile={handleRemoveFile}
          />
          
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentProject ? "Ask Claude about your code..." : "Select a project to start chatting..."}
              disabled={!currentProject || isLoading}
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && attachedFiles.length === 0) || !currentProject || isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;