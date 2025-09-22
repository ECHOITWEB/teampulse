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
  addDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Company {
  id: string;
  name_ko: string;
  name_en: string;
  domain?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_type: 'company' | 'workspace';
  
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  
  settings: {
    allow_workspace_creation: boolean;
    require_admin_approval: boolean;
    default_workspace_plan: string;
    okr_visibility: 'public' | 'private' | 'workspace';
    features: {
      ai_enabled: boolean;
      analytics_enabled: boolean;
      custom_fields: boolean;
    };
  };
  
  stats: {
    total_workspaces: number;
    total_members: number;
    active_members_30d: number;
    total_objectives: number;
    completion_rate: number;
  };
}

class CompanyService {
  private companiesCollection = collection(db, 'companies');

  async createCompany(data: {
    name_ko: string;
    name_en?: string;
    domain?: string;
    industry?: string;
    size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Build company data without undefined fields
    const companyData: any = {
      name_ko: data.name_ko,
      name_en: data.name_en || data.name_ko.toUpperCase().replace(/\s+/g, ''),
      size: data.size || 'startup',
      plan: 'free',
      billing_type: 'company',
      created_at: serverTimestamp() as Timestamp,
      created_by: user.uid,
      updated_at: serverTimestamp() as Timestamp,
      settings: {
        allow_workspace_creation: true,
        require_admin_approval: false,
        default_workspace_plan: 'free',
        okr_visibility: 'workspace',
        features: {
          ai_enabled: true,
          analytics_enabled: true,
          custom_fields: false
        }
      },
      stats: {
        total_workspaces: 0,
        total_members: 0,
        active_members_30d: 0,
        total_objectives: 0,
        completion_rate: 0
      }
    };
    
    // Only add optional fields if they have values
    if (data.domain) {
      companyData.domain = data.domain;
    }
    if (data.industry) {
      companyData.industry = data.industry;
    }

    const docRef = await addDoc(this.companiesCollection, companyData);
    return docRef.id;
  }

  async getCompany(companyId: string): Promise<Company | null> {
    try {
      const docRef = doc(db, 'companies', companyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Company;
    } catch (error) {
      console.error('Error getting company:', error);
      return null;
    }
  }

  async getCompaniesByUser(userId: string): Promise<Company[]> {
    try {
      // Get all companies where user is a member
      const membersQuery = query(
        collection(db, 'members'),
        where('user_id', '==', userId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(membersQuery);
      const companyIds = Array.from(new Set(memberSnapshot.docs.map(doc => doc.data().company_id)));
      
      if (companyIds.length === 0) return [];
      
      const companies: Company[] = [];
      for (const companyId of companyIds) {
        const company = await this.getCompany(companyId);
        if (company) {
          companies.push(company);
        }
      }
      
      return companies;
    } catch (error) {
      console.error('Error getting companies by user:', error);
      return [];
    }
  }

  async updateCompany(companyId: string, updates: Partial<Company>): Promise<void> {
    const docRef = doc(db, 'companies', companyId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    });
  }

  async getOrCreateCompanyFromWorkspace(workspaceName: string): Promise<string> {
    try {
      // Check if a company with this name already exists
      const companiesQuery = query(
        this.companiesCollection,
        where('name_ko', '==', workspaceName)
      );
      
      const snapshot = await getDocs(companiesQuery);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
      
      // Create new company
      return await this.createCompany({
        name_ko: workspaceName,
        name_en: workspaceName.toUpperCase().replace(/\s+/g, '')
      });
    } catch (error) {
      console.error('Error in getOrCreateCompanyFromWorkspace:', error);
      throw error;
    }
  }

  async getCompanyByName(name: string): Promise<Company | null> {
    try {
      // Try to find by Korean name first
      let q = query(this.companiesCollection, where('name_ko', '==', name));
      let snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Try English name
        q = query(this.companiesCollection, where('name_en', '==', name.toUpperCase()));
        snapshot = await getDocs(q);
      }
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as Company;
    } catch (error) {
      console.error('Error getting company by name:', error);
      return null;
    }
  }

  async getCompanyByKoreanName(nameKo: string): Promise<Company | null> {
    try {
      const q = query(this.companiesCollection, where('name_ko', '==', nameKo));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as Company;
    } catch (error) {
      console.error('Error getting company by Korean name:', error);
      return null;
    }
  }

  async getCompanyByEnglishName(nameEn: string): Promise<Company | null> {
    try {
      const q = query(this.companiesCollection, where('name_en', '==', nameEn.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as Company;
    } catch (error) {
      console.error('Error getting company by English name:', error);
      return null;
    }
  }

  async updateCompanyStats(companyId: string): Promise<void> {
    try {
      // Get workspace count
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('company_id', '==', companyId)
      );
      const workspacesSnapshot = await getDocs(workspacesQuery);
      
      // Get member count
      const membersQuery = query(
        collection(db, 'members'),
        where('company_id', '==', companyId),
        where('status', '==', 'active')
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      // Get objectives count
      const objectivesQuery = query(
        collection(db, 'objectives'),
        where('company_id', '==', companyId),
        where('status', '==', 'active')
      );
      const objectivesSnapshot = await getDocs(objectivesQuery);
      
      // Calculate completion rate
      let completedCount = 0;
      objectivesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.progress >= 100) {
          completedCount++;
        }
      });
      
      const completionRate = objectivesSnapshot.size > 0 
        ? Math.round((completedCount / objectivesSnapshot.size) * 100)
        : 0;
      
      // Update stats
      await updateDoc(doc(db, 'companies', companyId), {
        'stats.total_workspaces': workspacesSnapshot.size,
        'stats.total_members': membersSnapshot.size,
        'stats.total_objectives': objectivesSnapshot.size,
        'stats.completion_rate': completionRate,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating company stats:', error);
    }
  }
}

const companyService = new CompanyService();
export default companyService;