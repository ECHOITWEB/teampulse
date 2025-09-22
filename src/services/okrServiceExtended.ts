import { 
  doc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp,
  collection, writeBatch, getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import okrService, { Objective, KeyResult } from './okrService';

class OKRServiceExtended {
  // Update objective details
  async updateObjective(objectiveId: string, updates: Partial<Objective>): Promise<void> {
    const objectiveRef = doc(db, 'objectives', objectiveId);
    
    // Check if document exists before updating
    const objDoc = await getDoc(objectiveRef);
    if (!objDoc.exists()) {
      throw new Error(`Objective with ID ${objectiveId} does not exist`);
    }
    
    await updateDoc(objectiveRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  // Delete objective and all related key results
  async deleteObjective(objectiveId: string): Promise<void> {
    // Check if objective exists
    const objectiveRef = doc(db, 'objectives', objectiveId);
    const objDoc = await getDoc(objectiveRef);
    
    if (!objDoc.exists()) {
      throw new Error(`Objective with ID ${objectiveId} does not exist`);
    }
    
    // First delete all key results
    const keyResultsQuery = query(
      collection(db, 'keyResults'),
      where('objective_id', '==', objectiveId)
    );
    const keyResultsSnapshot = await getDocs(keyResultsQuery);
    
    const batch = writeBatch(db);
    keyResultsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the objective
    batch.delete(objectiveRef);
    
    await batch.commit();
  }

  // Update key result details
  async updateKeyResult(keyResultId: string, updates: Partial<KeyResult>): Promise<void> {
    const keyResultRef = doc(db, 'keyResults', keyResultId);
    
    // Check if key result exists
    const krDoc = await getDoc(keyResultRef);
    if (!krDoc.exists()) {
      throw new Error(`Key Result with ID ${keyResultId} does not exist`);
    }
    
    const krData = krDoc.data() as KeyResult;
    
    // If updating values, recalculate progress
    if (updates.current_value !== undefined || updates.target_value !== undefined) {
      const currentValue = updates.current_value ?? krData.current_value;
      const targetValue = updates.target_value ?? krData.target_value;
      updates.progress = this.calculateProgress(currentValue, targetValue);
      updates.status = this.determineStatus(updates.progress);
    }
    
    await updateDoc(keyResultRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Update objective progress if needed
    if (updates.progress !== undefined && krData.objective_id) {
      // Check if objective exists before updating
      const objRef = doc(db, 'objectives', krData.objective_id);
      const objDoc = await getDoc(objRef);
      if (objDoc.exists()) {
        await this.recalculateObjectiveProgress(krData.objective_id);
      }
    }
  }

  // Delete key result
  async deleteKeyResult(keyResultId: string): Promise<void> {
    const keyResultRef = doc(db, 'keyResults', keyResultId);
    const krDoc = await getDoc(keyResultRef);
    
    if (!krDoc.exists()) {
      throw new Error(`Key Result with ID ${keyResultId} does not exist`);
    }
    
    const krData = krDoc.data() as KeyResult;
    await deleteDoc(keyResultRef);
    
    // Update objective progress after deletion if objective exists
    if (krData.objective_id) {
      const objRef = doc(db, 'objectives', krData.objective_id);
      const objDoc = await getDoc(objRef);
      if (objDoc.exists()) {
        await this.recalculateObjectiveProgress(krData.objective_id);
      }
    }
  }

  // Get objectives for all periods (year or all)
  async getObjectivesByPeriod(
    workspaceId: string,
    period: 'quarter' | 'year' | 'all',
    quarter?: string,
    year?: string,
    view?: 'all' | 'company' | 'team' | 'individual',
    userId?: string
  ): Promise<Objective[]> {
    let objectives: Objective[] = [];
    
    if (period === 'quarter' && quarter && year) {
      // Get single quarter
      // Get objectives based on view
      if (view === 'all') {
        // Get all types of objectives for this quarter
        const companyObjs = await okrService.getCompanyObjectives(workspaceId, parseInt(year), parseInt(quarter.replace('Q', '')));
        const teamObjs = await okrService.getWorkspaceObjectives(workspaceId, parseInt(year), parseInt(quarter.replace('Q', '')));
        const userObjs = userId ? await okrService.getUserObjectives(userId, parseInt(year), parseInt(quarter.replace('Q', '')), workspaceId) : [];
        objectives = [...companyObjs, ...teamObjs, ...userObjs];
      } else if (view === 'company') {
        objectives = await okrService.getCompanyObjectives(workspaceId, parseInt(year), parseInt(quarter.replace('Q', '')));
      } else if (view === 'team') {
        objectives = await okrService.getWorkspaceObjectives(workspaceId, parseInt(year), parseInt(quarter.replace('Q', '')));
      } else if (view === 'individual' && userId) {
        objectives = await okrService.getUserObjectives(userId, parseInt(year), parseInt(quarter.replace('Q', '')), workspaceId);
      }
    } else if (period === 'year' && year) {
      // Get all objectives for the year, avoiding ALL duplicates
      const seenObjectiveIds = new Set<string>();
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      for (const q of quarters) {
        let quarterObjectives: Objective[] = [];
        if (view === 'all') {
          const companyObjs = await okrService.getCompanyObjectives(workspaceId, parseInt(year), parseInt(q.replace('Q', '')));
          const teamObjs = await okrService.getWorkspaceObjectives(workspaceId, parseInt(year), parseInt(q.replace('Q', '')));
          const userObjs = userId ? await okrService.getUserObjectives(userId, parseInt(year), parseInt(q.replace('Q', '')), workspaceId) : [];
          quarterObjectives = [...companyObjs, ...teamObjs, ...userObjs];
        } else if (view === 'company') {
          quarterObjectives = await okrService.getCompanyObjectives(workspaceId, parseInt(year), parseInt(q.replace('Q', '')));
        } else if (view === 'team') {
          quarterObjectives = await okrService.getWorkspaceObjectives(workspaceId, parseInt(year), parseInt(q.replace('Q', '')));
        } else if (view === 'individual' && userId) {
          quarterObjectives = await okrService.getUserObjectives(userId, parseInt(year), parseInt(q.replace('Q', '')), workspaceId);
        }
        
        // Filter out ALL duplicates using ID
        for (const obj of quarterObjectives) {
          if (!seenObjectiveIds.has(obj.id)) {
            seenObjectiveIds.add(obj.id);
            objectives.push(obj);
          }
        }
      }
    } else if (period === 'all') {
      // Get all objectives across all years, avoiding ALL duplicates
      const seenObjectiveIds = new Set<string>();
      const years = ['2024', '2025', '2026'];
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      for (const y of years) {
        for (const q of quarters) {
          let quarterObjectives: Objective[] = [];
          if (view === 'all') {
            const companyObjs = await okrService.getCompanyObjectives(workspaceId, parseInt(y), parseInt(q.replace('Q', '')));
            const teamObjs = await okrService.getWorkspaceObjectives(workspaceId, parseInt(y), parseInt(q.replace('Q', '')));
            const userObjs = userId ? await okrService.getUserObjectives(userId, parseInt(y), parseInt(q.replace('Q', '')), workspaceId) : [];
            quarterObjectives = [...companyObjs, ...teamObjs, ...userObjs];
          } else if (view === 'company') {
            quarterObjectives = await okrService.getCompanyObjectives(workspaceId, parseInt(y), parseInt(q.replace('Q', '')));
          } else if (view === 'team') {
            quarterObjectives = await okrService.getWorkspaceObjectives(workspaceId, parseInt(y), parseInt(q.replace('Q', '')));
          } else if (view === 'individual' && userId) {
            quarterObjectives = await okrService.getUserObjectives(userId, parseInt(y), parseInt(q.replace('Q', '')), workspaceId);
          }
          
          // Filter out ALL duplicates using ID
          for (const obj of quarterObjectives) {
            if (!seenObjectiveIds.has(obj.id)) {
              seenObjectiveIds.add(obj.id);
              objectives.push(obj);
            }
          }
        }
      }
    }
    
    return objectives;
  }

  // Recalculate objective progress based on key results
  private async recalculateObjectiveProgress(objectiveId: string): Promise<void> {
    // Check if objective exists before recalculating
    const objectiveRef = doc(db, 'objectives', objectiveId);
    const objDoc = await getDoc(objectiveRef);
    
    if (!objDoc.exists()) {
      console.warn(`Cannot recalculate progress for non-existent objective: ${objectiveId}`);
      return;
    }
    
    const keyResultsQuery = query(
      collection(db, 'keyResults'),
      where('objective_id', '==', objectiveId)
    );
    const keyResultsSnapshot = await getDocs(keyResultsQuery);
    
    if (keyResultsSnapshot.empty) {
      // No key results, set progress to 0
      await updateDoc(objectiveRef, {
        progress: 0,
        status: 'not_started',
        updatedAt: serverTimestamp()
      });
      return;
    }
    
    let totalProgress = 0;
    keyResultsSnapshot.docs.forEach(doc => {
      const kr = doc.data() as KeyResult;
      totalProgress += kr.progress || 0;
    });
    
    const avgProgress = Math.round(totalProgress / keyResultsSnapshot.size);
    
    await updateDoc(objectiveRef, {
      progress: avgProgress,
      updatedAt: serverTimestamp()
    });
  }

  // Helper methods
  private calculateProgress(currentValue: number, targetValue: number): number {
    if (targetValue === 0) return 0;
    return Math.min(Math.round((currentValue / targetValue) * 100), 100);
  }

  private determineStatus(progress: number): KeyResult['status'] {
    if (progress >= 100) return 'completed';
    if (progress >= 70) return 'on_track';
    if (progress >= 40) return 'at_risk';
    return 'missed';
  }
}

export default new OKRServiceExtended();