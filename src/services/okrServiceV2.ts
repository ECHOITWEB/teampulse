import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  query, where, orderBy, onSnapshot, getDocs, writeBatch,
  serverTimestamp, Timestamp, limit, startAfter
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  Objective, CompanyObjective, TeamObjective, IndividualObjective,
  KeyResult, ObjectiveUpdate, OKRPermissions, OKRFilters,
  CreateObjectiveInput, UpdateObjectiveInput, ObjectiveType,
  ProgressStatus, ObjectiveStatus, OKRStats, ObjectivePeriod
} from '../types/okr';

class OKRServiceV2 {
  private readonly COLLECTIONS = {
    objectives: 'objectivesV2',
    keyResults: 'keyResultsV2',
    updates: 'objectiveUpdatesV2'
  };

  // ==================== CREATE OPERATIONS ====================

  async createObjective(input: CreateObjectiveInput): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Prepare base objective data
    const baseData = {
      title: input.title,
      description: input.description,
      type: input.type,
      status: 'active' as ObjectiveStatus,
      progress: 0,
      progressStatus: 'not_started' as ProgressStatus,
      period: input.period,
      useCustomDates: input.period === 'custom',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid
    };

    // Handle date settings based on period
    if (input.period === 'annual') {
      if (!input.year) {
        throw new Error('Year is required for annual objectives');
      }
      Object.assign(baseData, {
        year: input.year,
        startDate: `${input.year}-01-01`,
        endDate: `${input.year}-12-31`,
        isAnnual: true
      });
    } else if (input.period === 'quarterly') {
      if (!input.quarter || !input.year) {
        throw new Error('Quarter and year are required for quarterly objectives');
      }
      Object.assign(baseData, {
        quarter: input.quarter,
        year: input.year,
        startDate: this.getQuarterStartDate(input.quarter, input.year),
        endDate: this.getQuarterEndDate(input.quarter, input.year),
        isAnnual: false
      });
    } else if (input.period === 'custom') {
      if (!input.startDate || !input.endDate) {
        throw new Error('Custom dates require both start and end dates');
      }
      Object.assign(baseData, {
        startDate: input.startDate,
        endDate: input.endDate,
        isAnnual: false
      });
    }

    // Add type-specific fields
    let objectiveData: any = { ...baseData };

    switch (input.type) {
      case 'company':
        if (!input.companyId) throw new Error('Company ID is required for company objectives');
        objectiveData = {
          ...objectiveData,
          companyId: input.companyId,
          visibility: 'all',
          editableBy: [user.uid] // Start with creator, can be expanded
        } as CompanyObjective;
        break;

      case 'team':
        if (!input.workspaceId) throw new Error('Workspace ID is required for team objectives');
        objectiveData = {
          ...objectiveData,
          workspaceId: input.workspaceId,
          teamLeadId: user.uid,
          assignedTo: input.assignedTo || []
        } as TeamObjective;
        break;

      case 'individual':
        if (!input.workspaceId) throw new Error('Workspace ID is required for individual objectives');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        objectiveData = {
          ...objectiveData,
          workspaceId: input.workspaceId,
          userId: input.userId || user.uid,
          userName: userData?.displayName || userData?.name || user.email || 'Unknown',
          userEmail: userData?.email || user.email || '',
          userPhotoURL: userData?.photoURL || '',
          assignedBy: input.userId !== user.uid ? user.uid : undefined,
          isPrivate: input.isPrivate || false
        } as IndividualObjective;
        break;
    }

    // Create the objective
    const docRef = await addDoc(collection(db, this.COLLECTIONS.objectives), objectiveData);

    // Create initial key results if provided
    if (input.keyResults && input.keyResults.length > 0) {
      const batch = writeBatch(db);
      
      for (const kr of input.keyResults) {
        const krRef = doc(collection(db, this.COLLECTIONS.keyResults));
        batch.set(krRef, {
          ...kr,
          objectiveId: docRef.id,
          progress: 0,
          status: 'not_started' as ProgressStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid
        });
      }
      
      await batch.commit();
    }

    // Log the creation
    await this.addObjectiveUpdate(docRef.id, 'comment', `Objective created: ${input.title}`);

    return docRef.id;
  }

  async createKeyResult(objectiveId: string, keyResult: Omit<KeyResult, 'id' | 'objectiveId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if objective exists and user has permission
    const objective = await this.getObjective(objectiveId);
    if (!objective) throw new Error('Objective not found');
    
    const permissions = await this.getUserPermissions(objective);
    if (!permissions.canEdit) throw new Error('You do not have permission to add key results to this objective');

    const progress = this.calculateProgress(
      keyResult.currentValue,
      keyResult.targetValue,
      keyResult.startValue
    );

    const krData = {
      ...keyResult,
      objectiveId,
      progress,
      status: this.getProgressStatus(progress),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid
    };

    const docRef = await addDoc(collection(db, this.COLLECTIONS.keyResults), krData);

    // Update objective progress
    await this.recalculateObjectiveProgress(objectiveId);

    // Log the addition
    await this.addObjectiveUpdate(
      objectiveId,
      'comment',
      `Key result added: ${keyResult.title}`,
      docRef.id
    );

    return docRef.id;
  }

  // ==================== READ OPERATIONS ====================

  async getObjective(objectiveId: string): Promise<Objective | null> {
    const docSnap = await getDoc(doc(db, this.COLLECTIONS.objectives, objectiveId));
    if (!docSnap.exists()) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as Objective;
  }

  async getObjectives(filters: OKRFilters): Promise<Objective[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const allObjectives: Objective[] = [];
    
    // Get workspace/team/individual objectives
    if (filters.workspaceId) {
      let workspaceConstraints: any[] = [
        where('workspaceId', '==', filters.workspaceId)
      ];
      
      // Apply type filter for workspace objectives
      if (filters.type && filters.type.length > 0) {
        // Only include team and individual types for workspace queries
        const workspaceTypes = filters.type.filter(t => t === 'team' || t === 'individual');
        if (workspaceTypes.length > 0) {
          workspaceConstraints.push(where('type', 'in', workspaceTypes));
        }
      } else {
        // Default to team and individual for workspace queries
        workspaceConstraints.push(where('type', 'in', ['team', 'individual']));
      }
      
      if (filters.status && filters.status.length > 0) {
        workspaceConstraints.push(where('status', 'in', filters.status));
      }
      
      if (filters.userId) {
        workspaceConstraints.push(where('userId', '==', filters.userId));
      }
      
      // Date filtering for workspace objectives
      // For quarterly filter, include both quarterly AND annual objectives from that year
      if (!filters.startDate && !filters.endDate) {
        if (filters.quarter && filters.year) {
          // This will get quarterly objectives for the specific quarter
          // Annual objectives will be fetched separately below
          workspaceConstraints.push(where('quarter', '==', filters.quarter));
          workspaceConstraints.push(where('year', '==', filters.year));
        } else if (filters.year) {
          workspaceConstraints.push(where('year', '==', filters.year));
        }
      } else {
        if (filters.startDate) {
          workspaceConstraints.push(where('endDate', '>=', filters.startDate));
        }
        if (filters.endDate) {
          workspaceConstraints.push(where('startDate', '<=', filters.endDate));
        }
      }
      
      workspaceConstraints.push(orderBy('createdAt', 'desc'));
      
      const workspaceQuery = query(collection(db, this.COLLECTIONS.objectives), ...workspaceConstraints);
      const workspaceSnapshot = await getDocs(workspaceQuery);
      
      for (const doc of workspaceSnapshot.docs) {
        const obj = { id: doc.id, ...doc.data() } as Objective;
        allObjectives.push(obj);
      }
      
      // Also get annual objectives when filtering by quarter
      if (filters.quarter && filters.year && !filters.startDate && !filters.endDate) {
        let annualConstraints: any[] = [
          where('workspaceId', '==', filters.workspaceId),
          where('isAnnual', '==', true),
          where('year', '==', filters.year)
        ];
        
        if (filters.type && filters.type.length > 0) {
          const workspaceTypes = filters.type.filter(t => t === 'team' || t === 'individual');
          if (workspaceTypes.length > 0) {
            annualConstraints.push(where('type', 'in', workspaceTypes));
          }
        } else {
          annualConstraints.push(where('type', 'in', ['team', 'individual']));
        }
        
        if (filters.status && filters.status.length > 0) {
          annualConstraints.push(where('status', 'in', filters.status));
        }
        
        const annualQuery = query(collection(db, this.COLLECTIONS.objectives), ...annualConstraints);
        const annualSnapshot = await getDocs(annualQuery);
        
        for (const doc of annualSnapshot.docs) {
          const obj = { id: doc.id, ...doc.data() } as Objective;
          // Don't add duplicates
          if (!allObjectives.find(o => o.id === obj.id)) {
            allObjectives.push(obj);
          }
        }
      }
    }
    
    // Get company objectives separately
    if (filters.companyId) {
      let companyConstraints: any[] = [
        where('companyId', '==', filters.companyId),
        where('type', '==', 'company')
      ];
      
      if (filters.status && filters.status.length > 0) {
        companyConstraints.push(where('status', 'in', filters.status));
      }
      
      // Date filtering for company objectives
      // For quarterly filter, include both quarterly AND annual objectives from that year
      if (!filters.startDate && !filters.endDate) {
        if (filters.quarter && filters.year) {
          // Get quarterly objectives for the specific quarter
          companyConstraints.push(where('quarter', '==', filters.quarter));
          companyConstraints.push(where('year', '==', filters.year));
        } else if (filters.year) {
          companyConstraints.push(where('year', '==', filters.year));
        }
      } else {
        if (filters.startDate) {
          companyConstraints.push(where('endDate', '>=', filters.startDate));
        }
        if (filters.endDate) {
          companyConstraints.push(where('startDate', '<=', filters.endDate));
        }
      }
      
      companyConstraints.push(orderBy('createdAt', 'desc'));
      
      const companyQuery = query(collection(db, this.COLLECTIONS.objectives), ...companyConstraints);
      const companySnapshot = await getDocs(companyQuery);
      
      for (const doc of companySnapshot.docs) {
        const obj = { id: doc.id, ...doc.data() } as Objective;
        allObjectives.push(obj);
      }
      
      // Also get annual company objectives when filtering by quarter
      if (filters.quarter && filters.year && !filters.startDate && !filters.endDate) {
        let annualCompanyConstraints: any[] = [
          where('companyId', '==', filters.companyId),
          where('type', '==', 'company'),
          where('isAnnual', '==', true),
          where('year', '==', filters.year)
        ];
        
        if (filters.status && filters.status.length > 0) {
          annualCompanyConstraints.push(where('status', 'in', filters.status));
        }
        
        const annualCompanyQuery = query(collection(db, this.COLLECTIONS.objectives), ...annualCompanyConstraints);
        const annualCompanySnapshot = await getDocs(annualCompanyQuery);
        
        for (const doc of annualCompanySnapshot.docs) {
          const obj = { id: doc.id, ...doc.data() } as Objective;
          // Don't add duplicates
          if (!allObjectives.find(o => o.id === obj.id)) {
            allObjectives.push(obj);
          }
        }
      }
    }
    
    // Filter by permissions
    const filteredObjectives: Objective[] = [];
    for (const obj of allObjectives) {
      const permissions = await this.getUserPermissions(obj);
      if (permissions.canViewAll || this.canUserViewObjective(user.uid, obj)) {
        filteredObjectives.push(obj);
      }
    }

    // Apply search query if provided
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return filteredObjectives.filter(obj => 
        obj.title.toLowerCase().includes(query) ||
        obj.description.toLowerCase().includes(query)
      );
    }

    return filteredObjectives;
  }

  async getKeyResults(objectiveId: string): Promise<KeyResult[]> {
    const q = query(
      collection(db, this.COLLECTIONS.keyResults),
      where('objectiveId', '==', objectiveId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeyResult));
  }

  async getObjectiveUpdates(objectiveId: string, limitCount: number = 10): Promise<ObjectiveUpdate[]> {
    const q = query(
      collection(db, this.COLLECTIONS.updates),
      where('objectiveId', '==', objectiveId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObjectiveUpdate));
  }

  // ==================== UPDATE OPERATIONS ====================

  async updateObjective(objectiveId: string, updates: UpdateObjectiveInput): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const objective = await this.getObjective(objectiveId);
    if (!objective) throw new Error('Objective not found');

    const permissions = await this.getUserPermissions(objective);
    if (!permissions.canEdit) throw new Error('You do not have permission to edit this objective');

    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    };

    // Handle date changes
    if (updates.useCustomDates !== undefined) {
      if (updates.useCustomDates) {
        if (!updates.startDate || !updates.endDate) {
          throw new Error('Custom dates require both start and end dates');
        }
        updateData.quarter = null;
        updateData.year = null;
      } else {
        if (!updates.quarter || !updates.year) {
          throw new Error('Quarter and year are required when not using custom dates');
        }
        updateData.startDate = this.getQuarterStartDate(updates.quarter, updates.year);
        updateData.endDate = this.getQuarterEndDate(updates.quarter, updates.year);
      }
    }

    await updateDoc(doc(db, this.COLLECTIONS.objectives, objectiveId), updateData);

    // Log the update
    await this.addObjectiveUpdate(objectiveId, 'edit', 'Objective updated');
  }

  async updateKeyResult(keyResultId: string, updates: Partial<KeyResult>): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const krDoc = await getDoc(doc(db, this.COLLECTIONS.keyResults, keyResultId));
    if (!krDoc.exists()) throw new Error('Key result not found');
    
    const kr = krDoc.data() as KeyResult;
    const objective = await this.getObjective(kr.objectiveId);
    if (!objective) throw new Error('Associated objective not found');

    const permissions = await this.getUserPermissions(objective);
    if (!permissions.canEdit) throw new Error('You do not have permission to edit this key result');

    // Recalculate progress if values changed
    let progress = kr.progress;
    if (updates.currentValue !== undefined || updates.targetValue !== undefined || updates.startValue !== undefined) {
      progress = this.calculateProgress(
        updates.currentValue ?? kr.currentValue,
        updates.targetValue ?? kr.targetValue,
        updates.startValue ?? kr.startValue
      );
    }

    const updateData = {
      ...updates,
      progress,
      status: this.getProgressStatus(progress),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    };

    await updateDoc(doc(db, this.COLLECTIONS.keyResults, keyResultId), updateData);

    // Update objective progress
    await this.recalculateObjectiveProgress(kr.objectiveId);

    // Log the update
    if (updates.currentValue !== undefined && updates.currentValue !== kr.currentValue) {
      await this.addObjectiveUpdate(
        kr.objectiveId,
        'progress',
        `Progress updated from ${kr.currentValue} to ${updates.currentValue} ${kr.unit}`,
        keyResultId,
        kr.currentValue,
        updates.currentValue
      );
    }
  }

  // ==================== DELETE OPERATIONS ====================

  async deleteObjective(objectiveId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const objective = await this.getObjective(objectiveId);
    if (!objective) throw new Error('Objective not found');

    const permissions = await this.getUserPermissions(objective);
    if (!permissions.canDelete) throw new Error('You do not have permission to delete this objective');

    // Delete all key results
    const keyResults = await this.getKeyResults(objectiveId);
    const batch = writeBatch(db);
    
    for (const kr of keyResults) {
      if (kr.id) {
        batch.delete(doc(db, this.COLLECTIONS.keyResults, kr.id));
      }
    }
    
    // Delete the objective
    batch.delete(doc(db, this.COLLECTIONS.objectives, objectiveId));
    
    await batch.commit();
  }

  async deleteKeyResult(keyResultId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const krDoc = await getDoc(doc(db, this.COLLECTIONS.keyResults, keyResultId));
    if (!krDoc.exists()) throw new Error('Key result not found');
    
    const kr = krDoc.data() as KeyResult;
    const objective = await this.getObjective(kr.objectiveId);
    if (!objective) throw new Error('Associated objective not found');

    const permissions = await this.getUserPermissions(objective);
    if (!permissions.canEdit) throw new Error('You do not have permission to delete this key result');

    await deleteDoc(doc(db, this.COLLECTIONS.keyResults, keyResultId));

    // Update objective progress
    await this.recalculateObjectiveProgress(kr.objectiveId);

    // Log the deletion
    await this.addObjectiveUpdate(
      kr.objectiveId,
      'comment',
      `Key result deleted: ${kr.title}`
    );
  }

  // ==================== PERMISSION MANAGEMENT ====================

  async getUserPermissions(objective: Objective): Promise<OKRPermissions> {
    const user = auth.currentUser;
    if (!user) return {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canViewAll: false,
      canManageTeam: false,
      canManageCompany: false
    };

    // Check user role in workspace/company
    const isAdmin = await this.isUserAdmin(user.uid);
    const isManager = await this.isUserManager(user.uid, objective);

    let canEdit = false;
    let canDelete = false;

    switch (objective.type) {
      case 'company':
        const companyObj = objective as CompanyObjective;
        canEdit = isAdmin || companyObj.editableBy?.includes(user.uid) || false;
        canDelete = isAdmin;
        break;

      case 'team':
        const teamObj = objective as TeamObjective;
        canEdit = isAdmin || isManager || teamObj.teamLeadId === user.uid;
        canDelete = isAdmin || teamObj.teamLeadId === user.uid;
        break;

      case 'individual':
        const individualObj = objective as IndividualObjective;
        canEdit = individualObj.userId === user.uid || individualObj.assignedBy === user.uid || isManager;
        canDelete = individualObj.userId === user.uid || isAdmin;
        break;
    }

    return {
      canCreate: true, // Most users can create objectives
      canEdit,
      canDelete,
      canViewAll: isAdmin || isManager,
      canManageTeam: isManager,
      canManageCompany: isAdmin
    };
  }

  private canUserViewObjective(userId: string, objective: Objective): boolean {
    switch (objective.type) {
      case 'company':
        return true; // Company objectives are visible to all

      case 'team':
        return true; // Team objectives are visible to team members

      case 'individual':
        const individualObj = objective as IndividualObjective;
        // User can see their own objectives or public team objectives
        return individualObj.userId === userId || !individualObj.isPrivate;

      default:
        return false;
    }
  }

  // ==================== HELPER METHODS ====================

  private async recalculateObjectiveProgress(objectiveId: string): Promise<void> {
    const keyResults = await this.getKeyResults(objectiveId);
    
    if (keyResults.length === 0) {
      await updateDoc(doc(db, this.COLLECTIONS.objectives, objectiveId), {
        progress: 0,
        progressStatus: 'not_started' as ProgressStatus,
        updatedAt: serverTimestamp()
      });
      return;
    }

    const totalProgress = keyResults.reduce((sum, kr) => sum + kr.progress, 0);
    const avgProgress = Math.round(totalProgress / keyResults.length);

    await updateDoc(doc(db, this.COLLECTIONS.objectives, objectiveId), {
      progress: avgProgress,
      progressStatus: this.getProgressStatus(avgProgress),
      updatedAt: serverTimestamp()
    });
  }

  private calculateProgress(current: number, target: number, start: number = 0): number {
    if (target === start) return 0;
    const progress = ((current - start) / (target - start)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  private getProgressStatus(progress: number): ProgressStatus {
    if (progress === 0) return 'not_started';
    if (progress >= 100) return 'completed';
    if (progress >= 70) return 'on_track';
    if (progress >= 40) return 'at_risk';
    return 'behind';
  }

  private getQuarterStartDate(quarter: string, year: string): string {
    const yearNum = parseInt(year);
    switch (quarter) {
      case 'Q1': return `${yearNum}-01-01`;
      case 'Q2': return `${yearNum}-04-01`;
      case 'Q3': return `${yearNum}-07-01`;
      case 'Q4': return `${yearNum}-10-01`;
      default: return `${yearNum}-01-01`;
    }
  }

  private getQuarterEndDate(quarter: string, year: string): string {
    const yearNum = parseInt(year);
    switch (quarter) {
      case 'Q1': return `${yearNum}-03-31`;
      case 'Q2': return `${yearNum}-06-30`;
      case 'Q3': return `${yearNum}-09-30`;
      case 'Q4': return `${yearNum}-12-31`;
      default: return `${yearNum}-12-31`;
    }
  }

  private async addObjectiveUpdate(
    objectiveId: string,
    updateType: 'progress' | 'status' | 'comment' | 'edit',
    comment: string,
    keyResultId?: string,
    previousValue?: number,
    newValue?: number
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    await addDoc(collection(db, this.COLLECTIONS.updates), {
      objectiveId,
      keyResultId,
      updateType,
      previousValue,
      newValue,
      comment,
      userId: user.uid,
      userName: userData?.displayName || userData?.name || user.email || 'Unknown',
      userEmail: userData?.email || user.email || '',
      userPhotoURL: userData?.photoURL || '',
      createdAt: serverTimestamp()
    });
  }

  private async isUserAdmin(userId: string): Promise<boolean> {
    // Check if user is admin in any workspace
    const workspacesQuery = query(
      collection(db, 'workspaces'),
      where('members', 'array-contains', userId)
    );
    const workspacesSnapshot = await getDocs(workspacesQuery);
    
    for (const workspace of workspacesSnapshot.docs) {
      const data = workspace.data();
      if (data.createdBy === userId || data.admins?.includes(userId)) {
        return true;
      }
    }
    
    return false;
  }

  private async isUserManager(userId: string, objective: Objective): Promise<boolean> {
    // Check if user is a manager/team lead for this objective's context
    if (objective.type === 'team') {
      const teamObj = objective as TeamObjective;
      return teamObj.teamLeadId === userId;
    }
    
    if (objective.type === 'individual') {
      const individualObj = objective as IndividualObjective;
      // Check if user is team lead in the same workspace
      const teamObjectives = await this.getObjectives({
        type: ['team'],
        workspaceId: individualObj.workspaceId
      });
      
      return teamObjectives.some(obj => {
        const teamObj = obj as TeamObjective;
        return teamObj.teamLeadId === userId;
      });
    }
    
    return false;
  }

  // ==================== STATISTICS ====================

  async getOKRStats(filters: OKRFilters): Promise<OKRStats> {
    const objectives = await this.getObjectives(filters);
    
    const stats: OKRStats = {
      total: objectives.length,
      byType: {
        company: 0,
        team: 0,
        individual: 0
      },
      byStatus: {
        draft: 0,
        active: 0,
        completed: 0,
        archived: 0
      },
      byProgress: {
        notStarted: 0,
        onTrack: 0,
        atRisk: 0,
        behind: 0,
        completed: 0
      },
      averageProgress: 0,
      upcomingDeadlines: 0,
      recentUpdates: 0
    };

    let totalProgress = 0;
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const obj of objectives) {
      // Type stats
      stats.byType[obj.type]++;
      
      // Status stats
      stats.byStatus[obj.status]++;
      
      // Progress stats
      switch (obj.progressStatus) {
        case 'not_started': stats.byProgress.notStarted++; break;
        case 'on_track': stats.byProgress.onTrack++; break;
        case 'at_risk': stats.byProgress.atRisk++; break;
        case 'behind': stats.byProgress.behind++; break;
        case 'completed': stats.byProgress.completed++; break;
      }
      
      totalProgress += obj.progress;
      
      // Check upcoming deadlines
      const endDate = new Date(obj.endDate);
      if (endDate >= now && endDate <= oneWeekFromNow) {
        stats.upcomingDeadlines++;
      }
    }

    stats.averageProgress = objectives.length > 0 ? Math.round(totalProgress / objectives.length) : 0;

    return stats;
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  subscribeToObjectives(
    filters: OKRFilters,
    callback: (objectives: Objective[]) => void
  ): () => void {
    const unsubscribers: (() => void)[] = [];
    const allObjectives = new Map<string, Objective>();
    
    const handleUpdate = () => {
      callback(Array.from(allObjectives.values()));
    };
    
    // Subscribe to workspace objectives
    if (filters.workspaceId) {
      let workspaceConstraints: any[] = [
        where('workspaceId', '==', filters.workspaceId),
        where('type', 'in', ['team', 'individual'])
      ];
      
      if (filters.quarter) {
        workspaceConstraints.push(where('quarter', '==', filters.quarter));
      }
      if (filters.year) {
        workspaceConstraints.push(where('year', '==', filters.year));
      }
      
      workspaceConstraints.push(orderBy('createdAt', 'desc'));
      
      const workspaceQuery = query(collection(db, this.COLLECTIONS.objectives), ...workspaceConstraints);
      
      const workspaceUnsubscribe = onSnapshot(workspaceQuery, (snapshot) => {
        // Remove old workspace objectives
        Array.from(allObjectives.entries()).forEach(([id, obj]) => {
          if (obj.type === 'team' || obj.type === 'individual') {
            allObjectives.delete(id);
          }
        });
        
        // Add new workspace objectives
        const user = auth.currentUser;
        if (user) {
          for (const doc of snapshot.docs) {
            const obj = { id: doc.id, ...doc.data() } as Objective;
            if (this.canUserViewObjective(user.uid, obj)) {
              allObjectives.set(doc.id, obj);
            }
          }
        }
        
        handleUpdate();
      });
      
      unsubscribers.push(workspaceUnsubscribe);
    }
    
    // Subscribe to company objectives
    if (filters.companyId) {
      let companyConstraints: any[] = [
        where('companyId', '==', filters.companyId),
        where('type', '==', 'company')
      ];
      
      if (filters.quarter) {
        companyConstraints.push(where('quarter', '==', filters.quarter));
      }
      if (filters.year) {
        companyConstraints.push(where('year', '==', filters.year));
      }
      
      companyConstraints.push(orderBy('createdAt', 'desc'));
      
      const companyQuery = query(collection(db, this.COLLECTIONS.objectives), ...companyConstraints);
      
      const companyUnsubscribe = onSnapshot(companyQuery, (snapshot) => {
        // Remove old company objectives
        Array.from(allObjectives.entries()).forEach(([id, obj]) => {
          if (obj.type === 'company') {
            allObjectives.delete(id);
          }
        });
        
        // Add new company objectives
        const user = auth.currentUser;
        if (user) {
          for (const doc of snapshot.docs) {
            const obj = { id: doc.id, ...doc.data() } as Objective;
            if (this.canUserViewObjective(user.uid, obj)) {
              allObjectives.set(doc.id, obj);
            }
          }
        }
        
        handleUpdate();
      });
      
      unsubscribers.push(companyUnsubscribe);
    }
    
    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
}

export const okrServiceV2 = new OKRServiceV2();
export default okrServiceV2;