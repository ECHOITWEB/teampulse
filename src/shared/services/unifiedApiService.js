import { 
  FirebaseCollection,
  COLLECTIONS,
  queryHelpers,
  where,
  orderBy,
  limit
} from '../firebase-utils';

// Configuration for different entity types
const entityConfigs = {
  users: {
    collection: COLLECTIONS.USERS,
    searchFields: ['name', 'email'],
    defaultSort: 'name',
    validationRules: {
      email: { required: true, type: 'email' },
      name: { required: true, minLength: 2 }
    }
  },
  teams: {
    collection: COLLECTIONS.TEAMS,
    searchFields: ['name', 'description'],
    defaultSort: 'createdAt',
    validationRules: {
      name: { required: true, minLength: 3 },
      workspaceId: { required: true }
    }
  },
  objectives: {
    collection: COLLECTIONS.OBJECTIVES,
    searchFields: ['title', 'description'],
    defaultSort: 'createdAt',
    validationRules: {
      title: { required: true, minLength: 5 },
      period: { required: true },
      ownerId: { required: true }
    },
    relationships: {
      keyResults: {
        type: 'subcollection',
        collection: COLLECTIONS.KEY_RESULTS
      }
    }
  },
  workspaces: {
    collection: COLLECTIONS.WORKSPACES,
    searchFields: ['name', 'description'],
    defaultSort: 'name',
    validationRules: {
      name: { required: true, minLength: 3 },
      ownerId: { required: true }
    }
  }
};

class UnifiedApiService {
  constructor() {
    this.collections = {};
    
    // Initialize collections based on config
    Object.keys(entityConfigs).forEach(entityType => {
      const config = entityConfigs[entityType];
      this.collections[entityType] = new FirebaseCollection(config.collection);
    });
  }

  // Generic create method
  async create(entityType, data, userId) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    // Validate data
    this.validateData(data, config.validationRules);

    // Add common fields
    const entityData = {
      ...data,
      createdBy: userId,
      workspaceId: data.workspaceId || null
    };

    return this.collections[entityType].create(entityData);
  }

  // Generic update method
  async update(entityType, id, updates, userId) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    // Add audit trail
    const updateData = {
      ...updates,
      lastModifiedBy: userId
    };

    return this.collections[entityType].update(id, updateData);
  }

  // Generic delete method
  async delete(entityType, id) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    return this.collections[entityType].delete(id);
  }

  // Generic get by ID
  async getById(entityType, id, includeRelationships = false) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const entity = await this.collections[entityType].getById(id);
    
    if (entity && includeRelationships && config.relationships) {
      // Load relationships
      for (const [relName, relConfig] of Object.entries(config.relationships)) {
        if (relConfig.type === 'subcollection') {
          const subCollection = new SubCollection(
            config.collection,
            id,
            relConfig.collection
          );
          entity[relName] = await subCollection.getAll();
        }
      }
    }

    return entity;
  }

  // Generic list method with filtering
  async list(entityType, filters = {}) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const constraints = [];

    // Apply filters
    if (filters.workspaceId) {
      constraints.push(queryHelpers.byWorkspace(filters.workspaceId));
    }

    if (filters.userId) {
      constraints.push(queryHelpers.byUser(filters.userId));
    }

    if (filters.teamId) {
      constraints.push(queryHelpers.byTeam(filters.teamId));
    }

    if (filters.status) {
      constraints.push(queryHelpers.byStatus(filters.status));
    }

    if (filters.dateRange) {
      constraints.push(...queryHelpers.byDateRange(
        filters.dateRange.field || 'createdAt',
        filters.dateRange.start,
        filters.dateRange.end
      ));
    }

    // Apply sorting
    const sortField = filters.sortBy || config.defaultSort || 'createdAt';
    const sortDirection = filters.sortDirection || 'desc';
    constraints.push(orderBy(sortField, sortDirection));

    // Apply limit
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    return this.collections[entityType].query(constraints);
  }

  // Generic search method
  async search(entityType, searchTerm, filters = {}) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    // Note: This is a simple client-side search
    // For production, use Algolia or Firebase Extensions
    const allItems = await this.list(entityType, filters);
    
    const searchLower = searchTerm.toLowerCase();
    return allItems.filter(item => {
      return config.searchFields.some(field => 
        item[field] && item[field].toLowerCase().includes(searchLower)
      );
    });
  }

  // Generic subscription
  subscribe(entityType, id, callback) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    return this.collections[entityType].subscribe(id, callback);
  }

  // Generic query subscription
  subscribeToQuery(entityType, filters, callback) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const constraints = this.buildConstraints(config, filters);
    return this.collections[entityType].subscribeToQuery(constraints, callback);
  }

  // Validation helper
  validateData(data, rules) {
    if (!rules) return;

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      if (rule.required && !value) {
        throw new Error(`${field} is required`);
      }

      if (value) {
        if (rule.type === 'email' && !this.isValidEmail(value)) {
          throw new Error(`${field} must be a valid email`);
        }

        if (rule.minLength && value.length < rule.minLength) {
          throw new Error(`${field} must be at least ${rule.minLength} characters`);
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          throw new Error(`${field} must be at most ${rule.maxLength} characters`);
        }
      }
    }
  }

  // Email validation helper
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Build query constraints
  buildConstraints(config, filters) {
    const constraints = [];

    if (filters.workspaceId) {
      constraints.push(where('workspaceId', '==', filters.workspaceId));
    }

    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    if (filters.custom) {
      Object.entries(filters.custom).forEach(([field, value]) => {
        constraints.push(where(field, '==', value));
      });
    }

    const sortField = filters.sortBy || config.defaultSort || 'createdAt';
    const sortDirection = filters.sortDirection || 'desc';
    constraints.push(orderBy(sortField, sortDirection));

    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    return constraints;
  }

  // Batch operations
  async batchCreate(entityType, items, userId) {
    const config = entityConfigs[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const promises = items.map(item => this.create(entityType, item, userId));
    return Promise.all(promises);
  }

  // Get statistics
  async getStats(entityType, filters = {}) {
    const items = await this.list(entityType, filters);
    
    const stats = {
      total: items.length,
      byStatus: {},
      byPriority: {},
      recent: items.slice(0, 5)
    };

    items.forEach(item => {
      if (item.status) {
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
      }
      if (item.priority) {
        stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
      }
    });

    return stats;
  }
}

// Export singleton instance
export default new UnifiedApiService();

// Also export for use in other services
export { entityConfigs };