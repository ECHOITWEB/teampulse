const db = require('../utils/database');

class Task {
  static async create(taskData) {
    const {
      title,
      description,
      assignee_id,
      team_id,
      key_result_id,
      status,
      priority,
      estimated_hours,
      due_date,
      created_by
    } = taskData;

    const query = `
      INSERT INTO tasks (
        title, description, assignee_id, team_id, key_result_id,
        status, priority, estimated_hours, due_date, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        title, 
        description || null, 
        assignee_id || null, 
        team_id || null,
        key_result_id || null,
        status || 'todo', 
        priority || 'medium', 
        estimated_hours || null,
        due_date || null,
        created_by
      ]);
      return { id: result.insertId, ...taskData };
    } catch (error) {
      throw new Error(`Error creating task: ${error.message}`);
    }
  }

  static async findById(id) {
    const query = `
      SELECT t.*, 
             u1.name as owner_name, u1.email as owner_email,
             u2.name as assignee_name, u2.email as assignee_email,
             tm.name as team_name,
             kr.title as key_result_title,
             pt.title as parent_task_title,
             COUNT(DISTINCT st.id) as subtask_count,
             COUNT(DISTINCT tc.id) as comment_count,
             COUNT(DISTINCT td.id) as dependency_count
      FROM tasks t
      LEFT JOIN users u1 ON t.owner_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      LEFT JOIN key_results kr ON t.key_result_id = kr.id
      LEFT JOIN tasks pt ON t.parent_task_id = pt.id
      LEFT JOIN tasks st ON st.parent_task_id = t.id
      LEFT JOIN task_comments tc ON tc.task_id = t.id
      LEFT JOIN task_dependencies td ON td.task_id = t.id
      WHERE t.id = ?
      GROUP BY t.id
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows[0]) {
        // Parse JSON fields
        rows[0].tags = rows[0].tags ? JSON.parse(rows[0].tags) : [];
        rows[0].custom_fields = rows[0].custom_fields ? JSON.parse(rows[0].custom_fields) : {};
        rows[0].recurrence_pattern = rows[0].recurrence_pattern ? JSON.parse(rows[0].recurrence_pattern) : null;
        
        // Get dependencies
        rows[0].dependencies = await this.getDependencies(id);
        rows[0].dependents = await this.getDependents(id);
      }
      return rows[0];
    } catch (error) {
      throw new Error(`Error finding task: ${error.message}`);
    }
  }

  static async findByAssignee(assigneeId, filters = {}) {
    let query = `
      SELECT t.*, u.name as creator_name, tm.name as team_name,
             kr.title as key_result_title, o.title as objective_title
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      LEFT JOIN key_results kr ON t.key_result_id = kr.id
      LEFT JOIN objectives o ON kr.objective_id = o.id
      WHERE t.assignee_id = ?
    `;

    const params = [assigneeId];

    if (filters.status) {
      query += ` AND t.status = ?`;
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ` AND t.priority = ?`;
      params.push(filters.priority);
    }

    if (filters.due_date_start) {
      query += ` AND t.due_date >= ?`;
      params.push(filters.due_date_start);
    }

    if (filters.due_date_end) {
      query += ` AND t.due_date <= ?`;
      params.push(filters.due_date_end);
    }

    if (filters.search) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.due_date ASC`;

    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : {}
      }));
    } catch (error) {
      throw new Error(`Error finding tasks by assignee: ${error.message}`);
    }
  }

  static async findByTeam(teamId, filters = {}) {
    let query = `
      SELECT t.*, u1.name as creator_name, u2.name as assignee_name
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      WHERE t.team_id = ?
    `;

    const params = [teamId];

    if (filters.status) {
      query += ` AND t.status IN (?)`;
      params.push(filters.status);
    }

    query += ` ORDER BY t.created_at DESC`;

    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : []
      }));
    } catch (error) {
      throw new Error(`Error finding tasks by team: ${error.message}`);
    }
  }

  static async getDependencies(taskId) {
    const query = `
      SELECT td.*, t.title, t.status, t.assignee_id, u.name as assignee_name
      FROM task_dependencies td
      INNER JOIN tasks t ON td.depends_on_task_id = t.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE td.task_id = ?
    `;

    try {
      const [rows] = await db.execute(query, [taskId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting task dependencies: ${error.message}`);
    }
  }

  static async getDependents(taskId) {
    const query = `
      SELECT td.*, t.title, t.status, t.assignee_id, u.name as assignee_name
      FROM task_dependencies td
      INNER JOIN tasks t ON td.task_id = t.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE td.depends_on_task_id = ?
    `;

    try {
      const [rows] = await db.execute(query, [taskId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting task dependents: ${error.message}`);
    }
  }

  static async addDependency(taskId, dependsOnTaskId, dependencyType = 'finish_to_start', lagTime = 0) {
    const query = `
      INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type, lag_time)
      VALUES (?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [taskId, dependsOnTaskId, dependencyType, lagTime]);
      return { id: result.insertId, taskId, dependsOnTaskId, dependencyType, lagTime };
    } catch (error) {
      throw new Error(`Error adding task dependency: ${error.message}`);
    }
  }

  static async removeDependency(taskId, dependsOnTaskId) {
    const query = `DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?`;

    try {
      const [result] = await db.execute(query, [taskId, dependsOnTaskId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error removing task dependency: ${error.message}`);
    }
  }

  static async addComment(commentData) {
    const { task_id, user_id, comment, parent_comment_id, mentioned_users, attachments } = commentData;

    const query = `
      INSERT INTO task_comments (task_id, user_id, comment, parent_comment_id, mentioned_users, attachments)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        task_id, user_id, comment, parent_comment_id,
        JSON.stringify(mentioned_users), JSON.stringify(attachments)
      ]);

      // Create notifications for mentioned users
      if (mentioned_users && mentioned_users.length > 0) {
        const notificationPromises = mentioned_users.map(mentionedUserId =>
          this.createNotification(mentionedUserId, 'comment_mention', task_id, `You were mentioned in a comment`)
        );
        await Promise.all(notificationPromises);
      }

      return { id: result.insertId, ...commentData };
    } catch (error) {
      throw new Error(`Error adding comment: ${error.message}`);
    }
  }

  static async getComments(taskId) {
    const query = `
      SELECT tc.*, u.name as user_name, u.email as user_email
      FROM task_comments tc
      INNER JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `;

    try {
      const [rows] = await db.execute(query, [taskId]);
      return rows.map(row => ({
        ...row,
        mentioned_users: row.mentioned_users ? JSON.parse(row.mentioned_users) : [],
        attachments: row.attachments ? JSON.parse(row.attachments) : []
      }));
    } catch (error) {
      throw new Error(`Error getting comments: ${error.message}`);
    }
  }

  static async logTime(taskId, userId, hoursLogged, description, logDate) {
    const query = `
      INSERT INTO task_time_logs (task_id, user_id, hours_logged, description, log_date)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [taskId, userId, hoursLogged, description, logDate]);
      
      // Update actual hours on the task
      await db.execute(
        `UPDATE tasks SET actual_hours = COALESCE(actual_hours, 0) + ? WHERE id = ?`,
        [hoursLogged, taskId]
      );

      return { id: result.insertId, taskId, userId, hoursLogged, description, logDate };
    } catch (error) {
      throw new Error(`Error logging time: ${error.message}`);
    }
  }

  static async getTimeLogs(taskId) {
    const query = `
      SELECT tl.*, u.name as user_name
      FROM task_time_logs tl
      INNER JOIN users u ON tl.user_id = u.id
      WHERE tl.task_id = ?
      ORDER BY tl.log_date DESC
    `;

    try {
      const [rows] = await db.execute(query, [taskId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting time logs: ${error.message}`);
    }
  }

  static async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'assignee_id', 'status', 'priority',
      'estimated_hours', 'actual_hours', 'progress', 'start_date',
      'due_date', 'tags', 'custom_fields'
    ];
    
    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        if (key === 'tags' || key === 'custom_fields') {
          updateFields.push(`${key} = ?`);
          values.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (updates.status === 'completed') {
      updateFields.push('completed_at = NOW()');
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating task: ${error.message}`);
    }
  }

  static async delete(id) {
    const query = `DELETE FROM tasks WHERE id = ?`;

    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting task: ${error.message}`);
    }
  }

  static async createNotification(userId, type, entityId, message) {
    const query = `
      INSERT INTO notifications (user_id, type, entity_type, entity_id, title, message)
      VALUES (?, ?, 'task', ?, ?, ?)
    `;

    try {
      await db.execute(query, [userId, type, entityId, type.replace('_', ' ').toUpperCase(), message]);
    } catch (error) {
      console.error(`Error creating notification: ${error.message}`);
    }
  }

  static async searchTasks(searchTerm, userId, limit = 20) {
    const query = `
      SELECT t.*, u1.name as owner_name, u2.name as assignee_name, tm.name as team_name
      FROM tasks t
      LEFT JOIN users u1 ON t.owner_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE (t.assignee_id = ? OR t.owner_id = ?)
        AND (MATCH(t.title, t.description) AGAINST(? IN NATURAL LANGUAGE MODE)
             OR t.title LIKE ? OR t.description LIKE ?)
      ORDER BY 
        CASE 
          WHEN t.title LIKE ? THEN 1
          WHEN t.title LIKE ? THEN 2
          ELSE 3
        END,
        t.created_at DESC
      LIMIT ?
    `;

    const searchPattern = `%${searchTerm}%`;
    const searchPatternStart = `${searchTerm}%`;

    try {
      const [rows] = await db.execute(query, [
        userId, userId, searchTerm, searchPattern, searchPattern,
        searchTerm, searchPatternStart, limit
      ]);
      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : []
      }));
    } catch (error) {
      throw new Error(`Error searching tasks: ${error.message}`);
    }
  }
}

module.exports = Task;