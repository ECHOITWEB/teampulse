import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  Users, 
  Tag, 
  Clock,
  MessageSquare,
  Paperclip,
  CheckSquare,
  AlertCircle,
  Circle,
  ArrowUpCircle,
  Filter,
  Search,
  LayoutGrid,
  List,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate?: Date;
  tags: string[];
  comments: number;
  attachments: number;
  subtasks?: { completed: number; total: number };
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

const ProjectBoard: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'backlog',
      title: 'Backlog',
      color: 'bg-gray-500',
      tasks: [
        {
          id: 'task-1',
          title: 'Research user requirements for new feature',
          description: 'Conduct user interviews and analyze feedback',
          status: 'backlog',
          priority: 'medium',
          assignees: ['JD', 'AS'],
          dueDate: new Date('2025-02-01'),
          tags: ['research', 'user-experience'],
          comments: 5,
          attachments: 2,
          subtasks: { completed: 2, total: 5 }
        }
      ]
    },
    {
      id: 'todo',
      title: 'To Do',
      color: 'bg-blue-500',
      tasks: [
        {
          id: 'task-2',
          title: 'Design system components update',
          status: 'todo',
          priority: 'high',
          assignees: ['MK'],
          dueDate: new Date('2025-01-28'),
          tags: ['design', 'frontend'],
          comments: 3,
          attachments: 1,
          subtasks: { completed: 0, total: 3 }
        }
      ]
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      color: 'bg-yellow-500',
      tasks: [
        {
          id: 'task-3',
          title: 'Implement authentication flow',
          status: 'in-progress',
          priority: 'urgent',
          assignees: ['JD', 'TW'],
          dueDate: new Date('2025-01-26'),
          tags: ['backend', 'security'],
          comments: 12,
          attachments: 4,
          subtasks: { completed: 4, total: 6 }
        }
      ]
    },
    {
      id: 'review',
      title: 'Review',
      color: 'bg-purple-500',
      tasks: []
    },
    {
      id: 'done',
      title: 'Done',
      color: 'bg-green-500',
      tasks: []
    }
  ]);

  const [viewMode, setViewMode] = useState<'board' | 'list' | 'timeline'>('board');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <ArrowUpCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Circle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500';
      case 'high':
        return 'border-l-4 border-orange-500';
      case 'medium':
        return 'border-l-4 border-yellow-500';
      case 'low':
        return 'border-l-4 border-gray-400';
      default:
        return '';
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const sourceTasks = Array.from(sourceColumn.tasks);
    const destTasks = source.droppableId === destination.droppableId 
      ? sourceTasks 
      : Array.from(destColumn.tasks);

    const [removed] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, removed);

    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        return { ...col, tasks: sourceTasks };
      }
      if (col.id === destination.droppableId) {
        return { ...col, tasks: destTasks };
      }
      return col;
    });

    setColumns(newColumns);
  };

  const TaskCard: React.FC<{ task: Task; index: number }> = ({ task, index }) => (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg shadow-sm p-4 mb-3 ${getPriorityColor(task.priority)} ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          } hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 flex-1 pr-2">
              {task.title}
            </h4>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {task.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Subtasks Progress */}
          {task.subtasks && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span className="flex items-center">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Subtasks
                </span>
                <span>{task.subtasks.completed}/{task.subtasks.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${(task.subtasks.completed / task.subtasks.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Priority */}
              <div className="flex items-center">
                {getPriorityIcon(task.priority)}
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(task.dueDate, 'MMM d')}
                </div>
              )}

              {/* Comments */}
              {task.comments > 0 && (
                <div className="flex items-center text-xs text-gray-500">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {task.comments}
                </div>
              )}

              {/* Attachments */}
              {task.attachments > 0 && (
                <div className="flex items-center text-xs text-gray-500">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {task.attachments}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="flex -space-x-2">
              {task.assignees.map((assignee, idx) => (
                <div
                  key={idx}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                >
                  {assignee}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Sprint Board</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
              Sprint 23 • 5 days left
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>

            {/* View Mode */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('board')}
                className={`p-2 ${viewMode === 'board' ? 'bg-gray-100' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 ${viewMode === 'timeline' ? 'bg-gray-100' : ''}`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>

            {/* Add Task */}
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="flex items-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">On Track</span>
            <span className="font-semibold text-gray-900">67%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Tasks</span>
            <span className="font-semibold text-gray-900">24/36</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Story Points</span>
            <span className="font-semibold text-gray-900">45/68</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Team</span>
            <span className="font-semibold text-gray-900">8</span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex space-x-4" style={{ minWidth: '1200px' }}>
            {columns.map((column) => (
              <div key={column.id} className="flex-1 min-w-[280px]">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                      <h3 className="font-semibold text-gray-900">{column.title}</h3>
                      <span className="text-sm text-gray-500">({column.tasks.length})</span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] ${
                          snapshot.isDraggingOver ? 'bg-gray-100 rounded-lg' : ''
                        }`}
                      >
                        {column.tasks.map((task, index) => (
                          <TaskCard key={task.id} task={task} index={index} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default ProjectBoard;