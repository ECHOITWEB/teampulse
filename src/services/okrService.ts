import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  addDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Objective {
  id: string;
  
  // Hierarchy and ownership
  company_id: string;
  workspace_id?: string;
  user_id?: string;
  parent_objective_id?: string;
  
  // Type and level
  type: 'company' | 'team' | 'individual';
  level: number; // 0=company, 1=team, 2=individual
  
  // Content
  title: string;
  description?: string;
  category?: 'growth' | 'revenue' | 'customer' | 'product' | 'operations' | 'people';
  
  // Period
  period: {
    year: number;
    quarter?: number; // 1-4, optional for annual objectives
    month?: number; // For monthly objectives
    start_date: Timestamp;
    end_date: Timestamp;
  };
  
  // Status
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number; // 0-100, calculated from key results
  
  // Visibility
  visibility: 'public' | 'workspace' | 'private';
  
  // Metadata
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  updated_by: string;
  
  // Alignment
  aligned_with: string[];
  tags: string[];
}

export interface KeyResult {
  id: string;
  objective_id: string;
  company_id: string;
  workspace_id?: string;
  
  title: string;
  description?: string;
  
  metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
  start_value: number;
  target_value: number;
  current_value: number;
  unit?: string;
  
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed' | 'missed';
  progress: number;
  
  owner_id: string;
  contributor_ids: string[];
  
  updates: {
    value: number;
    note?: string;
    updated_by: string;
    updated_at: Timestamp;
  }[];
  
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  due_date?: Timestamp;
}

class OKRService {
  private objectivesCollection = collection(db, 'objectives');
  private keyResultsCollection = collection(db, 'keyResults');

  // ==================== OBJECTIVES ====================

  async createObjective(data: {
    company_id: string;
    workspace_id?: string;
    user_id?: string;
    title: string;
    description?: string;
    category?: 'growth' | 'revenue' | 'customer' | 'product' | 'operations' | 'people';
    year: number;
    quarter?: number;
    start_date?: string;
    end_date?: string;
    visibility?: 'public' | 'workspace' | 'private';
    parent_objective_id?: string;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Determine type and level based on visibility and provided IDs
    let type: 'company' | 'team' | 'individual';
    let level: number;
    
    // Check visibility first for company objectives
    if (data.visibility === 'public') {
      type = 'company';
      level = 0;
    } else if (data.user_id) {
      type = 'individual';
      level = 2;
    } else if (data.workspace_id) {
      type = 'team';
      level = 1;
    } else {
      // Default to team if workspace provided
      type = 'team';
      level = 1;
    }

    // Calculate period dates
    let startDate: Date;
    let endDate: Date;
    
    if (data.start_date && data.end_date) {
      // Use custom dates if provided
      startDate = new Date(data.start_date);
      endDate = new Date(data.end_date);
    } else {
      // Use quarter dates
      startDate = this.getQuarterStartDate(data.year, data.quarter || 1);
      endDate = this.getQuarterEndDate(data.year, data.quarter || 4);
    }

    const objectiveData: any = {
      company_id: data.company_id,
      type,
      level,
      title: data.title,
      description: data.description || '',
      category: data.category || 'growth',
      period: {
        year: data.year,
        quarter: data.quarter || 1,
        start_date: Timestamp.fromDate(startDate),
        end_date: Timestamp.fromDate(endDate)
      },
      status: 'active',
      progress: 0,
      visibility: data.visibility || (type === 'company' ? 'public' : 'workspace'),
      created_at: serverTimestamp() as Timestamp,
      created_by: user.uid,
      updated_at: serverTimestamp() as Timestamp,
      updated_by: user.uid,
      aligned_with: [],
      tags: []
    };
    
    // Only add optional fields if they have values
    if (data.workspace_id) {
      objectiveData.workspace_id = data.workspace_id;
    }
    if (data.user_id) {
      objectiveData.user_id = data.user_id;
    }
    if (data.parent_objective_id) {
      objectiveData.parent_objective_id = data.parent_objective_id;
    }

    const docRef = await addDoc(this.objectivesCollection, objectiveData);
    return docRef.id;
  }

  async getObjective(objectiveId: string): Promise<Objective | null> {
    try {
      const docRef = doc(db, 'objectives', objectiveId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Objective;
    } catch (error) {
      console.error('Error getting objective:', error);
      return null;
    }
  }

  async getCompanyObjectives(
    workspaceId: string,
    year: number,
    quarter?: number
  ): Promise<Objective[]> {
    try {
      // Get all active company objectives for the workspace
      const q = query(
        this.objectivesCollection,
        where('workspace_id', '==', workspaceId),
        where('type', '==', 'company'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      // Filter objectives that overlap with the requested period
      const objectives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Objective[];
      
      if (quarter) {
        // Get quarter date range
        const quarterStart = this.getQuarterStartDate(year, quarter);
        const quarterEnd = this.getQuarterEndDate(year, quarter);
        
        // Filter objectives that overlap with this quarter
        return objectives.filter(obj => {
          const objStart = obj.period.start_date.toDate();
          const objEnd = obj.period.end_date.toDate();
          
          // Check if objective period overlaps with quarter
          return objStart <= quarterEnd && objEnd >= quarterStart;
        });
      } else {
        // Filter by year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        return objectives.filter(obj => {
          const objStart = obj.period.start_date.toDate();
          const objEnd = obj.period.end_date.toDate();
          
          // Check if objective period overlaps with year
          return objStart <= yearEnd && objEnd >= yearStart;
        });
      }
    } catch (error) {
      console.error('Error getting company objectives:', error);
      return [];
    }
  }

  async getWorkspaceObjectives(
    workspaceId: string,
    year: number,
    quarter?: number
  ): Promise<Objective[]> {
    try {
      // Get all active objectives for the workspace
      const q = query(
        this.objectivesCollection,
        where('workspace_id', '==', workspaceId),
        where('type', '==', 'team'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      // Filter objectives that overlap with the requested period
      const objectives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Objective[];
      
      if (quarter) {
        // Get quarter date range
        const quarterStart = this.getQuarterStartDate(year, quarter);
        const quarterEnd = this.getQuarterEndDate(year, quarter);
        
        // Filter objectives that overlap with this quarter
        return objectives.filter(obj => {
          const objStart = obj.period.start_date.toDate();
          const objEnd = obj.period.end_date.toDate();
          
          // Check if objective period overlaps with quarter
          return objStart <= quarterEnd && objEnd >= quarterStart;
        });
      } else {
        // Filter by year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        return objectives.filter(obj => {
          const objStart = obj.period.start_date.toDate();
          const objEnd = obj.period.end_date.toDate();
          
          // Check if objective period overlaps with year
          return objStart <= yearEnd && objEnd >= yearStart;
        });
      }
    } catch (error) {
      console.error('Error getting workspace objectives:', error);
      return [];
    }
  }

  async getUserObjectives(
    userId: string,
    year: number,
    quarter?: number,
    workspaceId?: string
  ): Promise<Objective[]> {
    try {
      // Build query constraints
      const constraints = [
        where('user_id', '==', userId),
        where('type', '==', 'individual'),
        where('status', '==', 'active')
      ];
      
      // Add workspace filter if provided
      if (workspaceId) {
        constraints.push(where('workspace_id', '==', workspaceId));
      }
      
      // Get all active objectives for the user
      const q = query(this.objectivesCollection, ...constraints);
      
      const snapshot = await getDocs(q);
      
      // Filter objectives that overlap with the requested period
      const objectives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Objective[];
      
      if (quarter) {
        // Get quarter date range
        const quarterStart = this.getQuarterStartDate(year, quarter);
        const quarterEnd = this.getQuarterEndDate(year, quarter);
        
        // Filter objectives that overlap with this quarter
        return objectives.filter(obj => {
          const objStart = obj.period.start_date.toDate();
          const objEnd = obj.period.end_date.toDate();
          
          // Check if objective period overlaps with quarter
          return objStart <= quarterEnd && objEnd >= quarterStart;
        });
      } else {
        // Filter by year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        return objectives.filter(obj => {
          const objStart = obj.period.start_date.toDate();
          const objEnd = obj.period.end_date.toDate();
          
          // Check if objective period overlaps with year
          return objStart <= yearEnd && objEnd >= yearStart;
        });
      }
    } catch (error) {
      console.error('Error getting user objectives:', error);
      return [];
    }
  }

  async getAllObjectivesForWorkspace(
    companyId: string,
    workspaceId: string,
    year: number,
    quarter?: number
  ): Promise<{
    company: Objective[];
    team: Objective[];
    individual: Objective[];
  }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { company: [], team: [], individual: [] };
      }

      // Get company objectives (visible to all)
      const companyObjectives = await this.getCompanyObjectives(companyId, year, quarter);
      
      // Get team objectives for this workspace
      const teamObjectives = await this.getWorkspaceObjectives(workspaceId, year, quarter);
      
      // Get individual objectives for current user in this workspace
      const individualObjectives = await this.getUserObjectives(user.uid, year, quarter, workspaceId);
      
      return {
        company: companyObjectives,
        team: teamObjectives,
        individual: individualObjectives
      };
    } catch (error) {
      console.error('Error getting all objectives:', error);
      return { company: [], team: [], individual: [] };
    }
  }

  async updateObjective(
    objectiveId: string,
    updates: Partial<Objective>
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const docRef = doc(db, 'objectives', objectiveId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
        updated_by: user.uid
      });
      
      // Update progress if key results exist
      await this.updateObjectiveProgress(objectiveId);
    } catch (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
  }

  async deleteObjective(objectiveId: string): Promise<void> {
    try {
      // Delete all key results first
      const keyResults = await this.getKeyResultsForObjective(objectiveId);
      const batch = writeBatch(db);
      
      keyResults.forEach(kr => {
        batch.delete(doc(db, 'keyResults', kr.id));
      });
      
      // Delete the objective
      batch.delete(doc(db, 'objectives', objectiveId));
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting objective:', error);
      throw error;
    }
  }

  // ==================== KEY RESULTS ====================

  async createKeyResult(data: {
    objective_id: string;
    title: string;
    description?: string;
    metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
    start_value: number;
    target_value: number;
    unit?: string;
    due_date?: Date;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get objective to inherit company and workspace IDs
    const objective = await this.getObjective(data.objective_id);
    if (!objective) throw new Error('Objective not found');

    const keyResultData: any = {
      objective_id: data.objective_id,
      company_id: objective.company_id,
      title: data.title,
      description: data.description || '',
      metric_type: data.metric_type,
      start_value: data.start_value,
      target_value: data.target_value,
      current_value: data.start_value,
      unit: data.unit || '',
      status: 'not_started',
      progress: 0,
      owner_id: user.uid,
      contributor_ids: [],
      updates: [],
      created_at: serverTimestamp() as Timestamp,
      created_by: user.uid,
      updated_at: serverTimestamp() as Timestamp
    };
    
    // Only add optional fields if they exist
    if (objective.workspace_id) {
      keyResultData.workspace_id = objective.workspace_id;
    }
    if (data.due_date) {
      keyResultData.due_date = Timestamp.fromDate(data.due_date);
    }

    const docRef = await addDoc(this.keyResultsCollection, keyResultData);
    
    // Update objective progress
    await this.updateObjectiveProgress(data.objective_id);
    
    return docRef.id;
  }

  async getKeyResultsForObjective(objectiveId: string): Promise<KeyResult[]> {
    try {
      const q = query(
        this.keyResultsCollection,
        where('objective_id', '==', objectiveId)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as KeyResult[];
    } catch (error) {
      console.error('Error getting key results:', error);
      return [];
    }
  }

  async updateKeyResult(
    keyResultId: string,
    newValue: number,
    note?: string
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const docRef = doc(db, 'keyResults', keyResultId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) throw new Error('Key result not found');
      
      const keyResult = docSnap.data() as KeyResult;
      
      // Calculate progress
      const progress = this.calculateProgress(
        keyResult.start_value,
        newValue,
        keyResult.target_value
      );
      
      // Determine status
      const status = this.determineStatus(progress);
      
      // Add update to history
      const update = {
        value: newValue,
        note,
        updated_by: user.uid,
        updated_at: serverTimestamp() as Timestamp
      };
      
      await updateDoc(docRef, {
        current_value: newValue,
        progress,
        status,
        updates: [...(keyResult.updates || []), update],
        updated_at: serverTimestamp()
      });
      
      // Update objective progress
      await this.updateObjectiveProgress(keyResult.objective_id);
    } catch (error) {
      console.error('Error updating key result:', error);
      throw error;
    }
  }

  async deleteKeyResult(keyResultId: string): Promise<void> {
    try {
      const docRef = doc(db, 'keyResults', keyResultId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) throw new Error('Key result not found');
      
      const keyResult = docSnap.data() as KeyResult;
      
      await deleteDoc(docRef);
      
      // Update objective progress
      await this.updateObjectiveProgress(keyResult.objective_id);
    } catch (error) {
      console.error('Error deleting key result:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private async updateObjectiveProgress(objectiveId: string): Promise<void> {
    try {
      const keyResults = await this.getKeyResultsForObjective(objectiveId);
      
      if (keyResults.length === 0) {
        // No key results, set progress to 0
        await updateDoc(doc(db, 'objectives', objectiveId), {
          progress: 0,
          updated_at: serverTimestamp()
        });
        return;
      }
      
      // Calculate average progress
      const totalProgress = keyResults.reduce((sum, kr) => sum + kr.progress, 0);
      const averageProgress = Math.round(totalProgress / keyResults.length);
      
      await updateDoc(doc(db, 'objectives', objectiveId), {
        progress: averageProgress,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating objective progress:', error);
    }
  }

  private calculateProgress(start: number, current: number, target: number): number {
    if (target === start) return 100;
    const progress = ((current - start) / (target - start)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  private determineStatus(progress: number): KeyResult['status'] {
    if (progress === 0) return 'not_started';
    if (progress >= 100) return 'completed';
    if (progress >= 70) return 'on_track';
    if (progress >= 40) return 'at_risk';
    return 'missed';
  }

  private getQuarterStartDate(year: number, quarter: number): Date {
    const monthMap: { [key: number]: number } = {
      1: 0, // Q1: January
      2: 3, // Q2: April
      3: 6, // Q3: July
      4: 9  // Q4: October
    };
    return new Date(year, monthMap[quarter] || 0, 1);
  }

  private getQuarterEndDate(year: number, quarter: number): Date {
    const monthMap: { [key: number]: number } = {
      1: 2,  // Q1: March
      2: 5,  // Q2: June
      3: 8,  // Q3: September
      4: 11  // Q4: December
    };
    const month = monthMap[quarter] || 11;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, lastDay);
  }

  getCurrentQuarter(): number {
    const month = new Date().getMonth();
    return Math.floor(month / 3) + 1;
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}

const okrService = new OKRService();
export default okrService;