const db = require('../utils/database');

class KeyResult {
  static async create(keyResultData) {
    const {
      objective_id,
      title,
      description,
      target_value,
      current_value = 0,
      unit,
      progress = 0,
      status = 'not_started',
      owner_id,
      due_date
    } = keyResultData;

    const query = `
      INSERT INTO key_results (
        objective_id, title, description, target_value, current_value,
        unit, progress, status, owner_id, due_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        objective_id, title, description, target_value, current_value,
        unit, progress, status, owner_id, due_date
      ]);
      
      // Recalculate objective progress
      await this.recalculateObjectiveProgress(objective_id);
      
      return { id: result.insertId, ...keyResultData };
    } catch (error) {
      throw new Error(`Error creating key result: ${error.message}`);
    }
  }

  static async findById(id) {
    const query = `
      SELECT kr.*, 
             u.full_name as owner_name, u.email as owner_email,
             o.title as objective_title,
             COUNT(DISTINCT kru.id) as update_count,
             MAX(kru.created_at) as last_update
      FROM key_results kr
      LEFT JOIN users u ON kr.owner_id = u.id
      LEFT JOIN objectives o ON kr.objective_id = o.id
      LEFT JOIN key_result_updates kru ON kru.key_result_id = kr.id
      WHERE kr.id = ?
      GROUP BY kr.id
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows[0]) {
        // Get update history
        rows[0].updates = await this.getUpdateHistory(id);
      }
      return rows[0];
    } catch (error) {
      throw new Error(`Error finding key result: ${error.message}`);
    }
  }

  static async findByObjective(objectiveId) {
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
      throw new Error(`Error finding key results by objective: ${error.message}`);
    }
  }

  static async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'target_value', 'current_value',
      'unit', 'progress', 'status', 'owner_id', 'due_date'
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
    const query = `UPDATE key_results SET ${updateFields.join(', ')} WHERE id = ?`;

    try {
      const [result] = await db.execute(query, values);
      
      if (result.affectedRows > 0) {
        // Get the objective_id and recalculate progress
        const [keyResult] = await db.execute('SELECT objective_id FROM key_results WHERE id = ?', [id]);
        if (keyResult[0]) {
          await this.recalculateObjectiveProgress(keyResult[0].objective_id);
        }
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating key result: ${error.message}`);
    }
  }

  static async updateProgress(id, currentValue, comment = null, userId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get the key result details
      const [keyResult] = await connection.execute(
        'SELECT target_value, objective_id FROM key_results WHERE id = ?',
        [id]
      );
      
      if (!keyResult[0]) {
        throw new Error('Key result not found');
      }
      
      // Calculate progress percentage
      const progress = (currentValue / keyResult[0].target_value) * 100;
      const status = progress >= 100 ? 'completed' : 
                    progress > 0 ? 'in_progress' : 'not_started';
      
      // Update key result
      await connection.execute(
        'UPDATE key_results SET current_value = ?, progress = ?, status = ? WHERE id = ?',
        [currentValue, progress, status, id]
      );
      
      // Log the update
      await connection.execute(
        'INSERT INTO key_result_updates (key_result_id, user_id, value, comment) VALUES (?, ?, ?, ?)',
        [id, userId, currentValue, comment]
      );
      
      await connection.commit();
      
      // Recalculate objective progress
      await this.recalculateObjectiveProgress(keyResult[0].objective_id);
      
      return { id, currentValue, progress, status };
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error updating key result progress: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get the objective_id before deletion
      const [keyResult] = await connection.execute(
        'SELECT objective_id FROM key_results WHERE id = ?',
        [id]
      );
      
      if (!keyResult[0]) {
        throw new Error('Key result not found');
      }
      
      // Delete the key result
      const [result] = await connection.execute('DELETE FROM key_results WHERE id = ?', [id]);
      
      await connection.commit();
      
      if (result.affectedRows > 0) {
        // Recalculate objective progress
        await this.recalculateObjectiveProgress(keyResult[0].objective_id);
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error deleting key result: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  static async getUpdateHistory(keyResultId, limit = 50) {
    const query = `
      SELECT kru.*, u.full_name as user_name
      FROM key_result_updates kru
      LEFT JOIN users u ON kru.user_id = u.id
      WHERE kru.key_result_id = ?
      ORDER BY kru.created_at DESC
      LIMIT ?
    `;

    try {
      const [rows] = await db.execute(query, [keyResultId, limit]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting update history: ${error.message}`);
    }
  }

  static async recalculateObjectiveProgress(objectiveId) {
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
      throw new Error(`Error recalculating objective progress: ${error.message}`);
    }
  }

  static async getByOwner(ownerId, filters = {}) {
    let query = `
      SELECT kr.*, 
             o.title as objective_title,
             o.quarter, o.year,
             COUNT(DISTINCT kru.id) as update_count,
             MAX(kru.created_at) as last_update
      FROM key_results kr
      LEFT JOIN objectives o ON kr.objective_id = o.id
      LEFT JOIN key_result_updates kru ON kru.key_result_id = kr.id
      WHERE kr.owner_id = ?
    `;

    const params = [ownerId];

    if (filters.status) {
      query += ` AND kr.status = ?`;
      params.push(filters.status);
    }

    if (filters.quarter) {
      query += ` AND o.quarter = ?`;
      params.push(filters.quarter);
    }

    if (filters.year) {
      query += ` AND o.year = ?`;
      params.push(filters.year);
    }

    query += ` GROUP BY kr.id ORDER BY kr.due_date ASC`;

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding key results by owner: ${error.message}`);
    }
  }

  static async bulkUpdateProgress(updates, userId) {
    const connection = await db.getConnection();
    const results = [];
    
    try {
      await connection.beginTransaction();
      
      for (const update of updates) {
        const { keyResultId, currentValue, comment } = update;
        
        // Get the key result details
        const [keyResult] = await connection.execute(
          'SELECT target_value, objective_id FROM key_results WHERE id = ?',
          [keyResultId]
        );
        
        if (!keyResult[0]) {
          continue;
        }
        
        // Calculate progress percentage
        const progress = (currentValue / keyResult[0].target_value) * 100;
        const status = progress >= 100 ? 'completed' : 
                      progress > 0 ? 'in_progress' : 'not_started';
        
        // Update key result
        await connection.execute(
          'UPDATE key_results SET current_value = ?, progress = ?, status = ? WHERE id = ?',
          [currentValue, progress, status, keyResultId]
        );
        
        // Log the update
        await connection.execute(
          'INSERT INTO key_result_updates (key_result_id, user_id, value, comment) VALUES (?, ?, ?, ?)',
          [keyResultId, userId, currentValue, comment]
        );
        
        results.push({ keyResultId, currentValue, progress, status });
      }
      
      await connection.commit();
      
      // Recalculate objective progress for all affected objectives
      const objectiveIds = [...new Set(results.map(r => r.objective_id))];
      for (const objectiveId of objectiveIds) {
        await this.recalculateObjectiveProgress(objectiveId);
      }
      
      return results;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error bulk updating key results: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = KeyResult;