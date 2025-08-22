import React, { useState, useEffect, memo } from 'react';
import { X, Save, Calendar, User, AlertCircle } from 'lucide-react';
import { Task } from '../../types/task';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface TaskFormProps {
  task?: Task | null;
  workspaceId: string;
  currentUserId: string;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
}

export const TaskForm = memo(({ task, workspaceId, currentUserId, onSave, onCancel }: TaskFormProps) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'todo');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || currentUserId);
  const [dueDate, setDueDate] = useState(
    task?.due_date ? new Date(task.due_date.seconds * 1000).toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    loadWorkspaceMembers();
  }, [workspaceId]);

  const loadWorkspaceMembers = async () => {
    try {
      const membersQuery = query(collection(db, 'workspace_members'));
      const snapshot = await getDocs(membersQuery);
      
      const membersList: WorkspaceMember[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.workspace_id === workspaceId && data.status === 'active') {
          const userQuery = query(collection(db, 'users'));
          const userSnapshot = await getDocs(userQuery);
          const userData = userSnapshot.docs.find(u => u.id === data.user_id)?.data();
          
          if (userData) {
            membersList.push({
              id: data.user_id,
              name: userData.display_name || userData.email,
              email: userData.email
            });
          }
        }
      }
      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const assignee = members.find(m => m.id === assigneeId);
      
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assignee_id: assigneeId,
        assignee_name: assignee?.name || '',
        due_date: dueDate ? new Date(dueDate) : null,
      });
      
      onCancel();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('작업 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {task ? '작업 수정' : '새 작업 만들기'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="작업 제목을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="작업에 대한 설명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                마감일
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                우선순위
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">낮음</option>
                <option value="medium">중간</option>
                <option value="high">높음</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">할 일</option>
                <option value="in_progress">진행 중</option>
                <option value="done">완료</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

TaskForm.displayName = 'TaskForm';