import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Building,
  Activity,
  TrendingUp,
  DollarSign,
  Bot,
  Database,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import { collection, query, getDocs, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PRICING, formatPrice, calculateTokenCost } from '../../config/pricing';

interface CompanyStats {
  companyName: string;
  workspaceCount: number;
  totalUsers: number;
  totalApiCalls: number;
  totalCost: number;
  plan: string;
  billingType: 'workspace' | 'company';
}

interface WorkspaceStats {
  id: string;
  name: string;
  companyName: string;
  fullName: string;
  userCount: number;
  apiCalls: number;
  cost: number;
  plan: string;
  createdAt: Date;
  lastActive: Date;
}

interface UserUsage {
  id: string;
  name: string;
  email: string;
  workspace: string;
  company: string;
  apiCalls: number;
  lastActive: Date;
  role: string;
}

interface ApiUsageData {
  date: string;
  calls: number;
  cost: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'workspaces' | 'users' | 'api'>('overview');
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceStats[]>([]);
  const [users, setUsers] = useState<UserUsage[]>([]);
  const [apiUsageData, setApiUsageData] = useState<ApiUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalWorkspaces: 0,
    totalUsers: 0,
    totalApiCalls: 0,
    totalRevenue: 0,
    activeUsers: 0
  });

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = () => {
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/admin/login');
      return;
    }
    
    const auth = JSON.parse(adminAuth);
    // Session expires after 2 hours
    if (Date.now() - auth.timestamp > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem('adminAuth');
      navigate('/admin/login');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load workspaces
      const workspacesSnapshot = await getDocs(collection(db, 'workspaces'));
      const workspacesList: WorkspaceStats[] = [];
      const companyMap = new Map<string, CompanyStats>();
      
      for (const doc of workspacesSnapshot.docs) {
        const data = doc.data();
        
        // Get member count for this workspace
        const membersQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', doc.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        // Get API usage for this workspace
        const apiUsageQuery = query(
          collection(db, 'api_usage'),
          where('workspace_id', '==', doc.id)
        );
        const apiUsageSnapshot = await getDocs(apiUsageQuery);
        
        let totalApiCalls = 0;
        apiUsageSnapshot.forEach(doc => {
          totalApiCalls += doc.data().count || 0;
        });
        
        const workspaceData: WorkspaceStats = {
          id: doc.id,
          name: data.name,
          companyName: data.company_name || data.name,
          fullName: data.full_name || data.name,
          userCount: membersSnapshot.size,
          apiCalls: totalApiCalls,
          cost: calculateCost(totalApiCalls, data.plan),
          plan: data.plan || 'free',
          createdAt: data.created_at?.toDate() || new Date(),
          lastActive: data.updated_at?.toDate() || new Date()
        };
        
        workspacesList.push(workspaceData);
        
        // Aggregate by company
        const companyName = data.company_name || data.name;
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            companyName,
            workspaceCount: 0,
            totalUsers: 0,
            totalApiCalls: 0,
            totalCost: 0,
            plan: data.plan || 'free',
            billingType: data.billing_type || 'workspace'
          });
        }
        
        const company = companyMap.get(companyName)!;
        company.workspaceCount++;
        company.totalUsers += membersSnapshot.size;
        company.totalApiCalls += totalApiCalls;
        company.totalCost += workspaceData.cost;
      }
      
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList: UserUsage[] = [];
      
      for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        
        // Get workspace info
        const workspace = workspacesList.find(w => w.id === data.workspace_id);
        
        // Get user's API usage
        const userApiQuery = query(
          collection(db, 'api_usage'),
          where('user_id', '==', data.uid)
        );
        const userApiSnapshot = await getDocs(userApiQuery);
        
        let userApiCalls = 0;
        userApiSnapshot.forEach(doc => {
          userApiCalls += doc.data().count || 0;
        });
        
        usersList.push({
          id: doc.id,
          name: data.display_name || data.name,
          email: data.email,
          workspace: workspace?.name || 'Unknown',
          company: workspace?.companyName || 'Unknown',
          apiCalls: userApiCalls,
          lastActive: data.last_active?.toDate() || new Date(),
          role: data.role || 'member'
        });
      }
      
      // Generate API usage trend data (last 30 days)
      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const mockCalls = Math.floor(Math.random() * 1000) + 100;
        // Calculate cost based on mock calls with average tokens
        const mockCost = calculateCost(mockCalls, 'starter');
        last30Days.push({
          date: date.toISOString().split('T')[0],
          calls: mockCalls,
          cost: mockCost
        });
      }
      
      setWorkspaces(workspacesList);
      setCompanies(Array.from(companyMap.values()));
      setUsers(usersList);
      setApiUsageData(last30Days);
      
      // Calculate stats
      setStats({
        totalCompanies: companyMap.size,
        totalWorkspaces: workspacesList.length,
        totalUsers: usersList.length,
        totalApiCalls: workspacesList.reduce((sum, w) => sum + w.apiCalls, 0),
        totalRevenue: workspacesList.reduce((sum, w) => sum + w.cost, 0),
        activeUsers: usersList.filter(u => {
          const daysSinceActive = (Date.now() - u.lastActive.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceActive < 7;
        }).length
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = (apiCalls: number, plan: string): number => {
    // 평균 토큰 사용량 기준 (입력 100 + 출력 100 = 200 토큰/호출)
    const avgInputTokens = 100;
    const avgOutputTokens = 100;
    const model = 'gpt-3.5-turbo'; // 기본 모델
    
    // 실제 pricing config 사용
    const costPerCall = calculateTokenCost(
      model,
      avgInputTokens,
      avgOutputTokens,
      plan as keyof typeof PRICING.plans
    );
    
    return apiCalls * costPerCall;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin/login');
  };

  const exportData = () => {
    const data = {
      companies,
      workspaces,
      users,
      stats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teampulse-admin-export-${Date.now()}.json`;
    a.click();
  };

  const filteredWorkspaces = workspaces.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         w.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || w.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const filteredUsers = users.filter(u => {
    return u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.company.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">TeamPulse Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'companies', 'workspaces', 'users', 'api'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'api' ? 'API Usage' : tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Companies</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
                  </div>
                  <Building className="w-8 h-8 text-blue-500" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Workspaces</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalWorkspaces}</p>
                  </div>
                  <Database className="w-8 h-8 text-green-500" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">API Calls</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(stats.totalApiCalls / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <Bot className="w-8 h-8 text-cyan-500" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">수익</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₩{stats.totalRevenue.toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </motion.div>
            </div>

            {/* API Usage Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                API Usage Trend (Last 30 Days)
              </h2>
              <div className="h-64 flex items-end space-x-1">
                {apiUsageData.map((data, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t hover:opacity-80 transition-opacity relative group"
                    style={{ height: `${(data.calls / 1000) * 100}%` }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {data.date}: {data.calls} calls
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Companies Overview</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workspaces
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        API Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Billing Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companies.map((company, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building className="w-5 h-5 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900">{company.companyName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {company.workspaceCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {company.totalUsers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {company.totalApiCalls.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            company.billingType === 'company'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {company.billingType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            company.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                            company.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                            company.plan === 'starter' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {company.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          ₩{Math.round(company.totalCost).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-4 flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search workspaces..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Workspaces Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workspace
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        API Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWorkspaces.map((workspace) => (
                      <tr key={workspace.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{workspace.name}</div>
                          <div className="text-xs text-gray-500">{workspace.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {workspace.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {workspace.userCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {workspace.apiCalls.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            workspace.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                            workspace.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                            workspace.plan === 'starter' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {workspace.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                          {workspace.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          {formatPrice(workspace.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workspace
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        API Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {user.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {user.workspace}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'ceo' || user.role === 'executive' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'pm' || user.role === 'po' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'developer' || user.role === 'frontend' || user.role === 'backend' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {user.apiCalls.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                          <div className="flex items-center">
                            {(() => {
                              const daysSince = Math.floor((Date.now() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24));
                              return daysSince === 0 ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                  Today
                                </>
                              ) : daysSince < 7 ? (
                                <>
                                  <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                                  {daysSince} days ago
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-gray-400 mr-1" />
                                  {daysSince} days ago
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* API Usage Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top API Consumers */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Bot className="w-5 h-5 mr-2" />
                  Top API Consumers (Companies)
                </h3>
                <div className="space-y-3">
                  {companies
                    .sort((a, b) => b.totalApiCalls - a.totalApiCalls)
                    .slice(0, 5)
                    .map((company, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {index + 1}
                          </span>
                          <span className="text-gray-900">{company.companyName}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-900 font-medium">
                            {company.totalApiCalls.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatPrice(company.totalCost)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* API Usage by Plan */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  API Usage by Plan
                </h3>
                <div className="space-y-4">
                  {['free', 'starter', 'pro', 'enterprise'].map(plan => {
                    const planWorkspaces = workspaces.filter(w => w.plan === plan);
                    const totalCalls = planWorkspaces.reduce((sum, w) => sum + w.apiCalls, 0);
                    const percentage = (totalCalls / stats.totalApiCalls) * 100;
                    
                    return (
                      <div key={plan}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 capitalize">{plan}</span>
                          <span className="text-gray-900 font-medium">
                            {totalCalls.toLocaleString()} calls
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              plan === 'enterprise' ? 'bg-purple-600' :
                              plan === 'pro' ? 'bg-blue-600' :
                              plan === 'starter' ? 'bg-green-600' :
                              'bg-gray-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Daily API Usage */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Daily API Usage & Cost
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        API Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiUsageData.slice(-7).reverse().map((data, index) => {
                      const previousCalls = index > 0 ? apiUsageData[apiUsageData.length - index].calls : data.calls;
                      const trend = ((data.calls - previousCalls) / previousCalls) * 100;
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                            {new Date(data.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {data.calls.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                            {formatPrice(data.cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`flex items-center text-sm ${
                              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
                              {Math.abs(trend).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;