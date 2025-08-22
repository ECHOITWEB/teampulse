import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Calendar, Search, 
  MoreHorizontal, List, Grid3x3, AlertCircle,
  Paperclip, MessageSquare, Flag
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import CreateTaskModal from '../components/modals/CreateTaskModal';
import { useUserTasks } from '../hooks/useFirebaseRealtime';
import taskService from '../shared/services/taskService';
import { useAuth } from '../contexts/AuthContext';
import { CreateTaskDto } from '../services/taskService';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'high' | 'medium' | 'low';
  assigneeId: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  createdBy: string;
  dueDate?: any; // Firebase Timestamp
  createdAt?: any; // Firebase Timestamp
  updatedAt?: any; // Firebase Timestamp
  tags: string[];
  attachments: any[];
  teamId?: string;
  workspaceId?: string;
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: any; // Firebase Timestamp
}

interface Column {
  id: 'todo' | 'in_progress' | 'in_review' | 'done';
  title: string;
  color: string;
}

const TaskManagementFirebase: React.FC = () => {
  const { user } = useAuth();
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  
  const columns: Column[] = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-500' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
    { id: 'in_review', title: 'Review', color: 'bg-yellow-500' },
    { id: 'done', title: 'Done', color: 'bg-green-500' }
  ];

  // Use Firebase real-time hook for tasks
  const { data: firebaseTasks, loading, error } = useUserTasks({
    status: selectedPriority === 'all' ? undefined : selectedPriority,
    limit: 100
  });

  // Transform Firebase tasks to local format
  useEffect(() => {
    if (firebaseTasks) {
      const transformedTasks: Task[] = firebaseTasks.map((task: any) => ({
        ...task,
        assignee: task.assignee || { 
          id: task.assigneeId, 
          name: task.assigneeName || 'Unassigned' 
        },
        tags: task.tags || [],
        attachments: task.attachments || []
      }));
      setLocalTasks(transformedTasks);
    }
  }, [firebaseTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    const className = "w-3 h-3";
    switch (priority) {
      case 'high': return <Flag className={className} />;
      case 'medium': return <Flag className={className} />;
      case 'low': return <Flag className={className} />;
      default: return null;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return '';
    }
  };

  const isOverdue = (dueDate?: any) => {
    if (!dueDate) return false;
    const date = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    return date < new Date();
  };

  const formatDate = (timestamp?: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = source.droppableId as Task['status'];
    const destinationColumn = destination.droppableId as Task['status'];
    
    const sourceTasks = getTasksByStatus(sourceColumn);
    const destTasks = sourceColumn === destinationColumn 
      ? sourceTasks 
      : getTasksByStatus(destinationColumn);
    
    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    if (sourceColumn !== destinationColumn) {
      movedTask.status = destinationColumn;
    }
    
    destTasks.splice(destination.index, 0, movedTask);
    
    // Update local state immediately for responsive UI
    const newTasks = localTasks.map(task => {
      if (task.id === movedTask.id) {
        return { ...movedTask, status: destinationColumn };
      }
      return task;
    });
    
    setLocalTasks(newTasks);
    
    // Update task status in Firebase
    try {
      await taskService.updateTask(movedTask.id, { 
        status: destinationColumn,
        previousStatus: sourceColumn 
      }, user?.firebase_uid || '');
    } catch (err) {
      console.error('Error updating task status:', err);
      // Revert local state on error
      setLocalTasks(localTasks);
    }
  };
  
  // Create new task using Firebase
  const handleCreateTask = async (data: CreateTaskDto) => {
    if (!user?.firebase_uid) {
      alert('You must be logged in to create tasks');
      return;
    }

    try {
      const taskData = {
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        assigneeId: data.assignee_id?.toString() || user.firebase_uid,
        assigneeName: user.name || user.email,
        teamId: data.team_id?.toString(),
        workspaceId: '1', // TODO: Get from workspace context
        dueDate: data.due_date ? new Date(data.due_date) : null,
        estimatedHours: data.estimated_hours,
        tags: data.labels || []
      };

      await taskService.createTask(taskData, user.firebase_uid);
      setShowCreateModal(false);
      // Real-time update will automatically refresh the task list
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task. Please try again.');
    }
  };

  const filteredTasks = localTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    const matchesAssignee = selectedAssignee === 'all' || task.assignee?.name === selectedAssignee;
    
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const getTasksByStatus = (status: Task['status']) => {
    return filteredTasks.filter(task => task.status === status);
  };

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(new Set(localTasks.map(task => task.assignee?.name).filter(Boolean)));

  const TaskCard: React.FC<{ task: Task; index: number; isDragging: boolean }> = ({ task, index, isDragging }) => (
    <div
      className={`bg-white rounded-lg border p-3 sm:p-4 mb-2 sm:mb-3 cursor-pointer transition-all duration-200 ${
        isDragging 
          ? 'shadow-lg border-primary ring-2 ring-primary ring-opacity-20 rotate-2' 
          : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 flex-1 pr-2 line-clamp-2">{task.title}</h4>
        <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center gap-2 mb-3">
        <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
          {getPriorityIcon(task.priority)}
          <span>{getPriorityText(task.priority)}</span>
        </div>
        {task.dueDate && (
          <div className={`flex items-center text-xs ${
            isOverdue(task.dueDate) ? 'text-red-600 font-medium' : 'text-gray-500'
          }`}>
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {task.assignee?.avatar ? (
            <img 
              src={task.assignee.avatar} 
              alt={task.assignee.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
              {getInitials(task.assignee?.name || 'U')}
            </div>
          )}
          <span className="text-xs text-gray-600 hidden sm:inline">{task.assignee?.name}</span>
        </div>
        
        <div className="flex items-center space-x-3 text-gray-400">
          {task.attachments.length > 0 && (
            <div className="flex items-center text-xs">
              <Paperclip className="w-3 h-3 mr-1" />
              <span>{task.attachments.length}</span>
            </div>
          )}
          {task.tags.length > 0 && (
            <div className="flex items-center text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              <span>{task.tags.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="text-gray-600 mt-2">Real-time task management powered by Firebase</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 sm:mt-0 flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {/* Priority Filter */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              {/* Assignee Filter */}
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Assignees</option>
                {uniqueAssignees.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewType('kanban')}
                className={`p-2 rounded-lg transition-colors ${
                  viewType === 'kanban' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewType === 'list' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>Failed to load tasks. Please try again.</span>
          </div>
        )}
        
        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
        {/* Kanban Board View */}
        {viewType === 'kanban' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {columns.map((column) => {
                const columnTasks = getTasksByStatus(column.id);
                return (
                  <div key={column.id} className="flex flex-col">
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4 min-h-[400px] sm:min-h-[600px]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${column.color}`} />
                          <h3 className="font-semibold text-gray-900">{column.title}</h3>
                        </div>
                        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                          {columnTasks.length}
                        </span>
                      </div>
                      
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[300px] sm:min-h-[400px] transition-colors duration-200 ${
                              snapshot.isDraggingOver 
                                ? 'bg-primary bg-opacity-5 rounded-lg' 
                                : ''
                            }`}
                          >
                            {columnTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="group"
                                  >
                                    <TaskCard 
                                      task={task} 
                                      index={index}
                                      isDragging={snapshot.isDragging}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      
                      <button 
                        onClick={() => {
                          setShowCreateModal(true);
                        }}
                        className="w-full mt-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center space-x-2 border border-dashed border-gray-300 hover:border-gray-400"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* List View */}
        {viewType === 'list' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        {task.description && <div className="text-sm text-gray-500">{task.description}</div>}
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.tags.map((tag, index) => (
                              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.status === 'done' ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {columns.find(c => c.id === task.status)?.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                        <span>{getPriorityText(task.priority)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                          {getInitials(task.assignee?.name || 'U')}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{task.assignee?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.dueDate && (
                        <div className={`text-sm ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatDate(task.dueDate)}
                          {isOverdue(task.dueDate) && (
                            <AlertCircle className="w-4 h-4 inline ml-1" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.estimatedHours && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (task.actualHours || 0) / task.estimatedHours * 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}
      </div>
      
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
};

export default TaskManagementFirebase;