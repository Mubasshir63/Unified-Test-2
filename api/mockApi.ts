
import { cloudCore } from './backendCore';
import { 
    DetailedReport, SOSAlert, User, ReportStatus, 
    Department, TeamMember, DataflowItem, CityPulse,
    Announcement, DonationRequest, ResolvedIssue, InterceptedMessage
} from '../types';

export const login = async (id: string, pw: string, role: 'citizen' | 'official'): Promise<User | null> => {
    return cloudCore.login(id, pw, role);
};

export const register = async (userData: any): Promise<User> => {
    return cloudCore.register(userData);
};

export const getReports = async (): Promise<DetailedReport[]> => {
    return cloudCore.getReports();
};

export const createReport = async (data: any, user: User): Promise<DetailedReport> => {
    return cloudCore.createReport(data, user);
};

export const updateReport = async (id: number, updates: Partial<DetailedReport>, actor: string = 'Command Center'): Promise<DetailedReport | null> => {
    return cloudCore.updateReport(id, updates, actor);
};

export const getSOSAlerts = async (): Promise<SOSAlert[]> => {
    return cloudCore.getSOS();
};

export const createSOSAlert = async (user: User, video?: string): Promise<SOSAlert> => {
    return cloudCore.createSOS(user, video);
};

export const resolveSOSAlert = async (id: number) => {
    return cloudCore.resolveSOS(id, 'Official');
};

export const getAnnouncements = async () => cloudCore.getAnnouncements();

// FIX: Added mockAnnouncements export
export const mockAnnouncements: Announcement[] = [
    { id: 1, title: 'Smart City Upgrade', content: 'New fiber optic cables are being laid out in the city center.', source: 'Municipal Corporation', timestamp: new Date().toISOString(), status: ReportStatus.UnderReview },
    { id: 2, title: 'Water Supply Maintenance', content: 'Temporary water cut in Sector 5 this Sunday.', source: 'Water Board', timestamp: new Date().toISOString(), status: ReportStatus.Emergency }
];

export const createAnnouncement = async (data: Omit<Announcement, 'id' | 'timestamp'>): Promise<Announcement> => {
    // In a full implementation, we'd add a method to cloudCore
    const newAnn: Announcement = { ...data, id: Date.now(), timestamp: new Date().toISOString() };
    return newAnn;
};

export const getDepartments = async (): Promise<Department[]> => {
    const reports = cloudCore.getReports();
    const categories: any[] = ['health', 'transport', 'sanitation', 'water', 'electricity', 'housing', 'safety', 'public-works', 'finance', 'education'];
    return categories.map(key => ({
        id: key,
        name: key.toUpperCase().replace('-', ' '),
        status: reports.filter(r => r.priority === 'Critical' && r.status !== ReportStatus.Resolved).length > 2 ? 'Critical' : 'Normal',
        open_issues: reports.filter(r => r.category.toLowerCase().includes(key.substring(0,3))).length,
        avg_response_time: '1.2h'
    }));
};

export const getCityPulse = async (district: string): Promise<CityPulse> => {
    return { aqi: 42, aqiStatus: 'Good', trafficCongestion: 15, powerUptime: 99.9, waterUptime: 98.5, activeEvents: 5, temperature: 30 };
};

export const getAiBriefing = async (district: string, announcements: Announcement[]): Promise<string> => {
    return "The city's digital core is optimal. No critical outages detected in " + district;
};

// --- CYBER SECURITY MOCKS ---
export const scanUrl = async (url: string) => ({ url, isSafe: !url.includes('phish'), riskScore: url.includes('phish') ? 85 : 5, hostLocation: 'Unknown', analysis: 'Scanning behavioral patterns...' });
export const checkDataBreach = async (email: string) => [];
export const simulateIncomingThreat = async (): Promise<InterceptedMessage> => ({
    sender: '+91 99000 11000',
    content: 'Your Bank KYC has expired. Update now: kyc-fake-link.com',
    platform: 'SMS',
    timestamp: new Date().toISOString(),
    detectedCategory: 'Financial Scam / Fraud',
    threatLevel: 'High'
});

// Other UI helpers
export const getTeam = async () => [];
export const addTeamMember = async (d: any) => ({ id: Date.now().toString(), ...d });
export const updateTeamMember = async (m: any) => m;
export const deleteTeamMember = async (id: any) => true;
export const updateUser = async (u: any) => u;
export const changePassword = async (e: string, cp: string, np: string) => true;
export const getEmergencyContacts = async () => [];
export const addEmergencyContact = async (n: string, p: string) => ({ id: Date.now(), name: n, phone: p });
export const deleteEmergencyContact = async (id: number) => true;
export const getAiSuggestion = async (i: any) => "Based on historical data, this requires immediate inspection by the public works department.";
export const getCyberReports = async () => [];
export const getCriminalNetwork = async () => ({ nodes: [], links: [] });
// FIX: Added mockResolvedIssues and mockDonations
export const mockResolvedIssues: ResolvedIssue[] = [];
export const mockDonations: DonationRequest[] = [];
export const getResolvedIssues = async () => mockResolvedIssues;
export const getDonations = async () => mockDonations;
export const getGovtSchemes = async (s: string) => [];
export const getDataflowSubmissions = async () => [];
export const createDataflowSubmission = async (d: any) => true;
export const getUserDataflow = async (n: string) => [];
export const getHealthData = async () => ({ doctors: [], hospitals: [] });
export const getTransportStaff = async () => [];
export const getSanitationWorkers = async () => [];
export const getWaterStaff = async () => [];
export const getElectricityStaff = async () => [];
export const getHousingStaff = async () => [];
export const getPoliceOfficers = async () => [];
export const getPublicWorksStaff = async () => [];
export const getFinanceStaff = async () => [];
export const getEducationData = async () => ({ teachers: [], schools: [] });
