import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, AlertCircle, CheckCircle, Clock, Circle } from 'lucide-react';
import { Task } from '../../types/task';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  currentUserId?: string;
}

const priorityColors = {
  urgent: 'border-purple-200 bg-purple-50',
  high: 'border-red-200 bg-red-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-green-200 bg-green-50'
};

const statusIcons: Record<Task['status'], React.ReactElement> = {
  todo: <Circle className="w-4 h-4" />,
  pending: <Circle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  done: <CheckCircle className="w-4 h-4" />,
  cancelled: <AlertCircle className="w-4 h-4" />
};

const statusColors: Record<Task['status'], string> = {
  todo: 'text-gray-500',
  pending: 'text-gray-500',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  done: 'text-green-500',
  cancelled: 'text-red-500'
};

export const TaskList = memo(({ tasks, onTaskClick, onStatusChange, currentUserId }: TaskListProps) => {
  const getTimeRemaining = (dueDate: any) => {
    if (!dueDate) return null;
    
    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: '기한 초과', urgent: true };
    if (days === 0) return { text: '오늘 마감', urgent: true };
    if (days === 1) return { text: '내일 마감', urgent: false };
    return { text: `${days}일 남음`, urgent: false };
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        할 일이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => {
        const timeRemaining = getTimeRemaining(task.due_date);
        const isMyTask = task.assignee_id === currentUserId;
        
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
              priorityColors[task.priority]
            } ${isMyTask ? 'ring-2 ring-blue-300' : ''}`}
            onClick={() => onTaskClick(task)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus = task.status === 'todo' ? 'in_progress' : 
                                       task.status === 'in_progress' ? 'done' : 'todo';
                      onStatusChange(String(task.id), nextStatus);
                    }}
                    className={`${statusColors[task.status]} hover:opacity-75 transition-opacity`}
                  >
                    {statusIcons[task.status]}
                  </button>
                  <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h3>
                </div>
                
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  {task.assignee_name && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{task.assignee_name}</span>
                    </div>
                  )}
                  
                  {timeRemaining && (
                    <div className={`flex items-center gap-1 ${
                      timeRemaining.urgent ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      <span>{timeRemaining.text}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  task.priority === 'high' ? 'bg-red-200 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                  'bg-green-200 text-green-700'
                }`}>
                  {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '중간' : '낮음'}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

TaskList.displayName = 'TaskList';