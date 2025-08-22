const db = require('../utils/database');

class CapacityService {
  // Calculate user capacity for a date range
  async calculateUserCapacity(userId, startDate, endDate) {
    try {
      // Get user's default capacity (8 hours per day)
      const defaultHoursPerDay = 8;

      // Get existing capacity records
      const query = `
        SELECT 
          date,
          available_hours,
          planned_hours,
          actual_hours,
          leave_type
        FROM user_capacity
        WHERE user_id = ? 
          AND date BETWEEN ? AND ?
        ORDER BY date
      `;

      const [capacityRecords] = await db.execute(query, [userId, startDate, endDate]);

      // Get tasks assigned to user in date range
      const taskQuery = `
        SELECT 
          t.id,
          t.title,
          t.estimated_hours,
          t.start_date,
          t.due_date,
          t.status,
          t.priority
        FROM tasks t
        WHERE t.assignee_id = ?
          AND t.status NOT IN ('completed', 'cancelled')
          AND (
            (t.start_date BETWEEN ? AND ?) OR
            (t.due_date BETWEEN ? AND ?) OR
            (t.start_date <= ? AND t.due_date >= ?)
          )
        ORDER BY t.priority DESC, t.due_date ASC
      `;

      const [tasks] = await db.execute(taskQuery, [
        userId, startDate, endDate, startDate, endDate, startDate, endDate
      ]);

      // Calculate daily capacity
      const capacityMap = new Map();
      
      // Initialize all dates in range
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingRecord = capacityRecords.find(r => r.date === dateStr);
        
        capacityMap.set(dateStr, {
          date: dateStr,
          available_hours: existingRecord?.available_hours || defaultHoursPerDay,
          planned_hours: 0,
          actual_hours: existingRecord?.actual_hours || 0,
          leave_type: existingRecord?.leave_type || 'none',
          tasks: []
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Distribute task hours across days
      tasks.forEach(task => {
        if (task.estimated_hours && task.start_date && task.due_date) {
          const taskStart = new Date(task.start_date);
          const taskEnd = new Date(task.due_date);
          const totalDays = Math.max(1, Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)));
          const hoursPerDay = task.estimated_hours / totalDays;

          const currentTaskDate = new Date(task.start_date);
          while (currentTaskDate <= taskEnd) {
            const dateStr = currentTaskDate.toISOString().split('T')[0];
            if (capacityMap.has(dateStr)) {
              const dayCapacity = capacityMap.get(dateStr);
              dayCapacity.planned_hours += hoursPerDay;
              dayCapacity.tasks.push({
                id: task.id,
                title: task.title,
                hours: hoursPerDay,
                priority: task.priority
              });
            }
            currentTaskDate.setDate(currentTaskDate.getDate() + 1);
          }
        }
      });

      return Array.from(capacityMap.values());
    } catch (error) {
      console.error('Calculate user capacity error:', error);
      throw error;
    }
  }

  // Get team capacity overview
  async getTeamCapacity(teamId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          uc.date,
          uc.available_hours,
          uc.planned_hours,
          uc.actual_hours,
          uc.leave_type,
          COUNT(t.id) as task_count,
          SUM(t.estimated_hours) as total_estimated_hours
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        LEFT JOIN user_capacity uc ON u.id = uc.user_id 
          AND uc.date BETWEEN ? AND ?
        LEFT JOIN tasks t ON u.id = t.assignee_id 
          AND t.status NOT IN ('completed', 'cancelled')
          AND t.due_date BETWEEN ? AND ?
        WHERE tm.team_id = ?
        GROUP BY u.id, u.name, uc.date, uc.available_hours, 
                 uc.planned_hours, uc.actual_hours, uc.leave_type
        ORDER BY u.name, uc.date
      `;

      const [teamCapacity] = await db.execute(query, [
        startDate, endDate, startDate, endDate, teamId
      ]);

      // Group by user
      const capacityByUser = {};
      teamCapacity.forEach(record => {
        if (!capacityByUser[record.user_id]) {
          capacityByUser[record.user_id] = {
            user_id: record.user_id,
            user_name: record.user_name,
            days: []
          };
        }
        
        capacityByUser[record.user_id].days.push({
          date: record.date,
          available_hours: record.available_hours || 8,
          planned_hours: record.planned_hours || 0,
          actual_hours: record.actual_hours || 0,
          leave_type: record.leave_type || 'none',
          task_count: record.task_count || 0
        });
      });

      return Object.values(capacityByUser);
    } catch (error) {
      console.error('Get team capacity error:', error);
      throw error;
    }
  }

  // Update user capacity
  async updateUserCapacity(userId, date, capacityData) {
    try {
      const { available_hours, leave_type } = capacityData;

      const query = `
        INSERT INTO user_capacity (user_id, date, available_hours, leave_type)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          available_hours = VALUES(available_hours),
          leave_type = VALUES(leave_type)
      `;

      await db.execute(query, [userId, date, available_hours, leave_type]);

      // Recalculate planned hours for this date
      await this.recalculatePlannedHours(userId, date);

      return true;
    } catch (error) {
      console.error('Update user capacity error:', error);
      throw error;
    }
  }

  // Recalculate planned hours for a specific date
  async recalculatePlannedHours(userId, date) {
    try {
      const query = `
        UPDATE user_capacity uc
        SET uc.planned_hours = (
          SELECT COALESCE(SUM(
            t.estimated_hours / GREATEST(1, DATEDIFF(t.due_date, t.start_date))
          ), 0)
          FROM tasks t
          WHERE t.assignee_id = uc.user_id
            AND t.status NOT IN ('completed', 'cancelled')
            AND ? BETWEEN t.start_date AND t.due_date
        )
        WHERE uc.user_id = ? AND uc.date = ?
      `;

      await db.execute(query, [date, userId, date]);
    } catch (error) {
      console.error('Recalculate planned hours error:', error);
      throw error;
    }
  }

  // Get workload balance suggestions
  async getWorkloadBalanceSuggestions(teamId, date) {
    try {
      // Get team members with their workload
      const query = `
        SELECT 
          u.id,
          u.name,
          COALESCE(uc.available_hours, 8) as available_hours,
          COALESCE(uc.planned_hours, 0) as planned_hours,
          (COALESCE(uc.planned_hours, 0) / COALESCE(uc.available_hours, 8)) as utilization_rate,
          COUNT(t.id) as task_count
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        LEFT JOIN user_capacity uc ON u.id = uc.user_id AND uc.date = ?
        LEFT JOIN tasks t ON u.id = t.assignee_id 
          AND t.status NOT IN ('completed', 'cancelled')
          AND ? BETWEEN t.start_date AND t.due_date
        WHERE tm.team_id = ?
        GROUP BY u.id, u.name, uc.available_hours, uc.planned_hours
        ORDER BY utilization_rate DESC
      `;

      const [teamWorkload] = await db.execute(query, [date, date, teamId]);

      // Identify overloaded and underutilized members
      const overloaded = teamWorkload.filter(m => m.utilization_rate > 1);
      const underutilized = teamWorkload.filter(m => m.utilization_rate < 0.7);

      // Get reassignable tasks from overloaded members
      const suggestions = [];
      
      for (const overloadedMember of overloaded) {
        const taskQuery = `
          SELECT 
            t.id,
            t.title,
            t.estimated_hours,
            t.priority,
            t.start_date,
            t.due_date
          FROM tasks t
          WHERE t.assignee_id = ?
            AND t.status = 'todo'
            AND ? BETWEEN t.start_date AND t.due_date
          ORDER BY t.priority ASC, t.estimated_hours DESC
          LIMIT 5
        `;

        const [reassignableTasks] = await db.execute(taskQuery, [overloadedMember.id, date]);

        reassignableTasks.forEach(task => {
          const bestCandidate = underutilized.reduce((best, candidate) => {
            const candidateNewUtilization = (candidate.planned_hours + task.estimated_hours) / candidate.available_hours;
            const bestNewUtilization = best ? (best.planned_hours + task.estimated_hours) / best.available_hours : 2;
            
            return candidateNewUtilization < 1 && candidateNewUtilization < bestNewUtilization ? candidate : best;
          }, null);

          if (bestCandidate) {
            suggestions.push({
              task_id: task.id,
              task_title: task.title,
              from_user: overloadedMember.name,
              to_user: bestCandidate.name,
              to_user_id: bestCandidate.id,
              hours_to_balance: task.estimated_hours,
              new_from_utilization: ((overloadedMember.planned_hours - task.estimated_hours) / overloadedMember.available_hours),
              new_to_utilization: ((bestCandidate.planned_hours + task.estimated_hours) / bestCandidate.available_hours)
            });
          }
        });
      }

      return {
        date,
        team_workload: teamWorkload,
        overloaded_count: overloaded.length,
        underutilized_count: underutilized.length,
        balance_suggestions: suggestions
      };
    } catch (error) {
      console.error('Get workload balance suggestions error:', error);
      throw error;
    }
  }

  // Forecast capacity needs
  async forecastCapacityNeeds(teamId, weeks = 4) {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (weeks * 7));

      const query = `
        SELECT 
          DATE(t.due_date) as due_date,
          SUM(t.estimated_hours) as total_hours,
          COUNT(DISTINCT t.id) as task_count,
          COUNT(DISTINCT t.assignee_id) as assigned_members
        FROM tasks t
        JOIN team_members tm ON t.assignee_id = tm.user_id
        WHERE tm.team_id = ?
          AND t.status NOT IN ('completed', 'cancelled')
          AND t.due_date BETWEEN CURDATE() AND ?
        GROUP BY DATE(t.due_date)
        ORDER BY due_date
      `;

      const [forecast] = await db.execute(query, [teamId, endDate]);

      // Get team size
      const [teamSize] = await db.execute(
        'SELECT COUNT(*) as size FROM team_members WHERE team_id = ?',
        [teamId]
      );

      // Calculate weekly aggregates
      const weeklyForecast = {};
      forecast.forEach(day => {
        const week = Math.floor((new Date(day.due_date) - new Date()) / (7 * 24 * 60 * 60 * 1000));
        if (!weeklyForecast[week]) {
          weeklyForecast[week] = {
            week_number: week,
            total_hours: 0,
            task_count: 0,
            team_capacity: teamSize[0].size * 40 // 40 hours per week
          };
        }
        weeklyForecast[week].total_hours += parseFloat(day.total_hours);
        weeklyForecast[week].task_count += day.task_count;
      });

      return Object.values(weeklyForecast).map(week => ({
        ...week,
        utilization_rate: week.total_hours / week.team_capacity,
        capacity_gap: week.total_hours - week.team_capacity
      }));
    } catch (error) {
      console.error('Forecast capacity needs error:', error);
      throw error;
    }
  }
}

module.exports = new CapacityService();