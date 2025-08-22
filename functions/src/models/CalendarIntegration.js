const db = require('../utils/database');

class CalendarIntegration {
  // Save calendar integration
  static async save(integrationData) {
    const {
      user_id,
      provider,
      access_token,
      refresh_token,
      calendar_id
    } = integrationData;

    // Upsert integration
    await db.query(
      `INSERT INTO calendar_integrations 
       (user_id, provider, access_token, refresh_token, calendar_id) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       access_token = VALUES(access_token),
       refresh_token = VALUES(refresh_token),
       calendar_id = VALUES(calendar_id),
       updated_at = CURRENT_TIMESTAMP`,
      [user_id, provider, access_token, refresh_token, calendar_id]
    );

    return true;
  }

  // Get integration for user
  static async findByUserId(userId, provider = null) {
    let query = 'SELECT * FROM calendar_integrations WHERE user_id = ?';
    const params = [userId];

    if (provider) {
      query += ' AND provider = ?';
      params.push(provider);
    }

    const integrations = await db.query(query, params);
    return provider ? integrations[0] : integrations;
  }

  // Update sync status
  static async updateSyncStatus(userId, provider, syncEnabled) {
    const result = await db.query(
      `UPDATE calendar_integrations 
       SET sync_enabled = ? 
       WHERE user_id = ? AND provider = ?`,
      [syncEnabled, userId, provider]
    );

    return result.affectedRows > 0;
  }

  // Update last synced time
  static async updateLastSynced(userId, provider) {
    const result = await db.query(
      `UPDATE calendar_integrations 
       SET last_synced_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND provider = ?`,
      [userId, provider]
    );

    return result.affectedRows > 0;
  }

  // Delete integration
  static async delete(userId, provider) {
    await db.query(
      'DELETE FROM calendar_integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );
    return true;
  }

  // Get users needing sync
  static async getUsersNeedingSync(provider, minutesSinceLastSync = 15) {
    return await db.query(
      `SELECT ci.*, u.email, u.name
       FROM calendar_integrations ci
       JOIN users u ON ci.user_id = u.id
       WHERE ci.provider = ? 
         AND ci.sync_enabled = TRUE
         AND (ci.last_synced_at IS NULL 
              OR ci.last_synced_at < DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
      [provider, minutesSinceLastSync]
    );
  }
}

module.exports = CalendarIntegration;