const db = require('../utils/database');

class Objective {
  static async create(objectiveData) {
    const {
      title,
      description,
      quarter,
      year,
      owner_id,
      team_id,
      status = 'draft',
      progress = 0
    } = objectiveData;

    // Convert quarter and year to goal_period_id
    let goal_period_id = null;
    if (quarter && year) {
      const quarterNumber = quarter.replace('Q', '');
      const [periodRows] = await db.execute(
        'SELECT id FROM goal_periods WHERE year = ? AND quarter = ?',
        [year, quarterNumber]
      );
      if (periodRows.length > 0) {
        goal_period_id = periodRows[0].id;
      } else {
        throw new Error(`Goal period not found for ${year} ${quarter}`);
      }
    }

    const query = `
      INSERT INTO objectives (
        title, description, goal_period_id, owner_id,
        team_id, status, progress
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        title, description, goal_period_id, owner_id,
        team_id || null, status, progress
      ]);
      return { id: result.insertId, ...objectiveData, goal_period_id };
    } catch (error) {
      throw new Error(`Error creating objective: ${error.message}`);
    }
  }

  static async findById(id) {
    const query = `
      SELECT o.*, 
             u.full_name as owner_name, u.email as owner_email,
             t.name as team_name,
             COUNT(DISTINCT kr.id) as key_results_count,
             AVG(kr.progress) as avg_key_result_progress
      FROM objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN teams t ON o.team_id = t.id
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE o.id = ?
      GROUP BY o.id
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows[0]) {
        // Get all key results for this objective
        rows[0].keyResults = await this.getKeyResults(id);
      }
      return rows[0];
    } catch (error) {
      throw new Error(`Error finding objective: ${error.message}`);
    }
  }

  static async findByOwner(ownerId, filters = {}) {
    let query = `
      SELECT o.*, 
             t.name as team_name,
             COUNT(DISTINCT kr.id) as key_results_count,
             AVG(kr.progress) as avg_key_result_progress
      FROM objectives o
      LEFT JOIN teams t ON o.team_id = t.id
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE o.owner_id = ?
    `;

    const params = [ownerId];

    if (filters.quarter) {
      query += ` AND o.quarter = ?`;
      params.push(filters.quarter);
    }

    if (filters.year) {
      query += ` AND o.year = ?`;
      params.push(filters.year);
    }

    if (filters.type) {
      query += ` AND o.type = ?`;
      params.push(filters.type);
    }

    if (filters.status) {
      query += ` AND o.status = ?`;
      params.push(filters.status);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding objectives by owner: ${error.message}`);
    }
  }

  static async findByTeam(teamId, filters = {}) {
    let query = `
      SELECT o.*, 
             u.full_name as owner_name,
             COUNT(DISTINCT kr.id) as key_results_count,
             AVG(kr.progress) as avg_key_result_progress
      FROM objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE o.team_id = ?
    `;

    const params = [teamId];

    if (filters.quarter) {
      query += ` AND o.quarter = ?`;
      params.push(filters.quarter);
    }

    if (filters.year) {
      query += ` AND o.year = ?`;
      params.push(filters.year);
    }

    if (filters.status) {
      query += ` AND o.status = ?`;
      params.push(filters.status);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding objectives by team: ${error.message}`);
    }
  }

  static async getKeyResults(objectiveId) {
    const query = `
      SELECT kr.*, 
             u.full_name as owner_name,
             COUNT(DISTINCT kru.id) as update_count,
             MAX(kru.created_at) as last_update
      FROM key_results kr
      LEFT JOIN users u ON kr.owner_id = u.id
      LEFT JOIN key_result_updates kru ON kru.key_result_id = kr.id
      WHERE kr.objective_id = ?
      GROUP BY kr.id
      ORDER BY kr.created_at ASC
    `;

    try {
      const [rows] = await db.execute(query, [objectiveId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting key results: ${error.message}`);
    }
  }

  static async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'quarter', 'year', 'type',
      'owner_id', 'team_id', 'status', 'progress'
    ];
    
    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `UPDATE objectives SET ${updateFields.join(', ')} WHERE id = ?`;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating objective: ${error.message}`);
    }
  }

  static async delete(id) {
    const query = `DELETE FROM objectives WHERE id = ?`;

    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting objective: ${error.message}`);
    }
  }

  static async calculateProgress(objectiveId) {
    const query = `
      SELECT AVG(progress) as avg_progress
      FROM key_results
      WHERE objective_id = ?
    `;

    try {
      const [rows] = await db.execute(query, [objectiveId]);
      const avgProgress = rows[0].avg_progress || 0;
      
      // Update the objective's progress
      await db.execute(
        'UPDATE objectives SET progress = ? WHERE id = ?',
        [avgProgress, objectiveId]
      );
      
      return avgProgress;
    } catch (error) {
      throw new Error(`Error calculating objective progress: ${error.message}`);
    }
  }

  static async getHierarchy(userId, teamId = null) {
    // Get company objectives
    const companyQuery = `
      SELECT o.*, 
             u.full_name as owner_name,
             COUNT(DISTINCT kr.id) as key_results_count,
             AVG(kr.progress) as avg_key_result_progress
      FROM objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE o.type = 'company' AND o.status = 'active'
      GROUP BY o.id
    `;

    // Get team objectives
    const teamQuery = `
      SELECT o.*, 
             u.full_name as owner_name,
             t.name as team_name,
             COUNT(DISTINCT kr.id) as key_results_count,
             AVG(kr.progress) as avg_key_result_progress
      FROM objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN teams t ON o.team_id = t.id
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE o.type = 'team' AND o.status = 'active'
      ${teamId ? 'AND o.team_id = ?' : ''}
      GROUP BY o.id
    `;

    // Get individual objectives
    const individualQuery = `
      SELECT o.*, 
             COUNT(DISTINCT kr.id) as key_results_count,
             AVG(kr.progress) as avg_key_result_progress
      FROM objectives o
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE o.type = 'individual' AND o.status = 'active' AND o.owner_id = ?
      GROUP BY o.id
    `;

    try {
      const [companyObjectives] = await db.execute(companyQuery);
      const [teamObjectives] = teamId 
        ? await db.execute(teamQuery, [teamId])
        : await db.execute(teamQuery);
      const [individualObjectives] = await db.execute(individualQuery, [userId]);

      return {
        company: companyObjectives,
        team: teamObjectives,
        individual: individualObjectives
      };
    } catch (error) {
      throw new Error(`Error getting objective hierarchy: ${error.message}`);
    }
  }

  static async getDashboardData(filters = {}) {
    const { quarter, year, type, teamId } = filters;
    
    let query = `
      SELECT 
        o.type,
        o.status,
        COUNT(DISTINCT o.id) as objective_count,
        AVG(o.progress) as avg_progress,
        COUNT(DISTINCT kr.id) as key_result_count,
        COUNT(DISTINCT CASE WHEN kr.status = 'completed' THEN kr.id END) as completed_key_results
      FROM objectives o
      LEFT JOIN key_results kr ON kr.objective_id = o.id
      WHERE 1=1
    `;

    const params = [];

    if (quarter) {
      query += ` AND o.quarter = ?`;
      params.push(quarter);
    }

    if (year) {
      query += ` AND o.year = ?`;
      params.push(year);
    }

    if (type) {
      query += ` AND o.type = ?`;
      params.push(type);
    }

    if (teamId) {
      query += ` AND o.team_id = ?`;
      params.push(teamId);
    }

    query += ` GROUP BY o.type, o.status`;

    try {
      const [rows] = await db.execute(query, params);
      
      // Get top objectives
      let topObjectivesQuery = `
        SELECT o.*, 
               u.full_name as owner_name,
               t.name as team_name,
               COUNT(DISTINCT kr.id) as key_results_count
        FROM objectives o
        LEFT JOIN users u ON o.owner_id = u.id
        LEFT JOIN teams t ON o.team_id = t.id
        LEFT JOIN key_results kr ON kr.objective_id = o.id
        WHERE o.status = 'active'
      `;

      const topParams = [...params];

      if (quarter) {
        topObjectivesQuery += ` AND o.quarter = ?`;
      }

      if (year) {
        topObjectivesQuery += ` AND o.year = ?`;
      }

      if (type) {
        topObjectivesQuery += ` AND o.type = ?`;
      }

      if (teamId) {
        topObjectivesQuery += ` AND o.team_id = ?`;
      }

      topObjectivesQuery += ` GROUP BY o.id ORDER BY o.progress DESC LIMIT 10`;

      const [topObjectives] = await db.execute(topObjectivesQuery, topParams);

      return {
        summary: rows,
        topObjectives
      };
    } catch (error) {
      throw new Error(`Error getting dashboard data: ${error.message}`);
    }
  }
}

module.exports = Objective;