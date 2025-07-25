const CalendarIntegration = require('../models/CalendarIntegration');
const Meeting = require('../models/Meeting');
const { validationResult } = require('express-validator');

// Connect calendar
exports.connectCalendar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider, access_token, refresh_token, calendar_id } = req.body;

    await CalendarIntegration.save({
      user_id: req.user.id,
      provider,
      access_token,
      refresh_token,
      calendar_id
    });

    res.json({
      success: true,
      message: 'Calendar connected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get calendar integrations
exports.getIntegrations = async (req, res, next) => {
  try {
    const integrations = await CalendarIntegration.findByUserId(req.user.id);
    
    // Don't send tokens to client
    const safeIntegrations = integrations.map(integration => ({
      provider: integration.provider,
      calendar_id: integration.calendar_id,
      sync_enabled: integration.sync_enabled,
      last_synced_at: integration.last_synced_at,
      created_at: integration.created_at
    }));

    res.json({
      success: true,
      data: safeIntegrations
    });
  } catch (error) {
    next(error);
  }
};

// Toggle sync
exports.toggleSync = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { enabled } = req.body;

    const updated = await CalendarIntegration.updateSyncStatus(
      req.user.id, 
      provider, 
      enabled
    );

    if (!updated) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({
      success: true,
      message: `Sync ${enabled ? 'enabled' : 'disabled'} for ${provider}`
    });
  } catch (error) {
    next(error);
  }
};

// Disconnect calendar
exports.disconnectCalendar = async (req, res, next) => {
  try {
    const { provider } = req.params;

    await CalendarIntegration.delete(req.user.id, provider);

    res.json({
      success: true,
      message: 'Calendar disconnected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Manual sync trigger
exports.syncCalendar = async (req, res, next) => {
  try {
    const { provider } = req.params;

    const integration = await CalendarIntegration.findByUserId(req.user.id, provider);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Here you would implement the actual calendar sync logic
    // For now, we'll just update the last synced timestamp
    await CalendarIntegration.updateLastSynced(req.user.id, provider);

    res.json({
      success: true,
      message: 'Calendar sync initiated',
      provider
    });
  } catch (error) {
    next(error);
  }
};

// OAuth callback handlers
exports.googleCallback = async (req, res, next) => {
  try {
    // Handle Google OAuth callback
    // Extract tokens from the OAuth response
    const { code } = req.query;
    
    // Exchange code for tokens (implementation depends on OAuth library)
    // const { access_token, refresh_token } = await exchangeCodeForTokens(code);
    
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Google calendar connection in progress',
      provider: 'google'
    });
  } catch (error) {
    next(error);
  }
};

exports.outlookCallback = async (req, res, next) => {
  try {
    // Handle Outlook OAuth callback
    const { code } = req.query;
    
    res.json({
      success: true,
      message: 'Outlook calendar connection in progress',
      provider: 'outlook'
    });
  } catch (error) {
    next(error);
  }
};

// Get calendar events (for importing into meetings)
exports.getCalendarEvents = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { startDate, endDate } = req.query;

    const integration = await CalendarIntegration.findByUserId(req.user.id, provider);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Here you would fetch events from the external calendar
    // For now, return empty array
    const events = [];

    res.json({
      success: true,
      data: events,
      provider
    });
  } catch (error) {
    next(error);
  }
};