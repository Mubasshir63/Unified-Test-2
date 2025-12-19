
import { 
    DetailedReport, SOSAlert, User, ReportStatus, 
    DataflowItem, TeamMember, Announcement, EmergencyContact,
    LocationData
} from '../types';

interface UnifiedDatabase {
    users: User[];
    reports: DetailedReport[];
    sos: SOSAlert[];
    announcements: Announcement[];
    dataflow: DataflowItem[];
    team: TeamMember[];
    auditLogs: Array<{ timestamp: string; action: string; actor: string; targetId: string | number }>;
}

const DB_KEY = 'UNIFIED_PROD_DB_V6';

class BackendCore {
    private db: UnifiedDatabase;
    private listeners: Array<(event: string, data: any) => void> = [];
    private localSyncChannel: BroadcastChannel;
    private peer: any = null;
    private connections: any[] = [];
    public cloudId: string = '';
    private isOfficial: boolean = false;

    constructor() {
        this.localSyncChannel = new BroadcastChannel('unified_local_sync');
        const stored = localStorage.getItem(DB_KEY);
        
        if (stored) {
            this.db = JSON.parse(stored);
        } else {
            this.db = this.initializeDefaultDB();
            this.persist();
        }

        this.localSyncChannel.onmessage = (event) => {
            if (event.data.type === 'REMOTE_UPDATE') {
                this.db = event.data.payload;
                this.broadcastLocal('CLOUD_SYNC', this.db);
            }
        };

        this.ensureOfficialAccounts();
    }

    // --- CLOUD SYNC ENGINE (WebRTC) ---

    public async initializeCloudSync(user: User) {
        if (this.peer) return;
        this.isOfficial = user.role === 'official';
        
        // @ts-ignore
        this.peer = new Peer(this.isOfficial ? `UNIFIED-GOV-HUB-${user.name.replace(/\s+/g, '-')}` : undefined);
        
        this.peer.on('open', (id: string) => {
            this.cloudId = id;
            console.log('Cloud Sync Engine Active. ID:', id);
            this.broadcastLocal('CLOUD_ONLINE', id);
        });

        this.peer.on('connection', (conn: any) => {
            this.setupConnection(conn);
            // If we are gov, push latest DB to new citizen device
            if (this.isOfficial) {
                setTimeout(() => conn.send({ type: 'FULL_SYNC', payload: this.db }), 1000);
            }
        });
    }

    public connectToCloud(targetId: string) {
        if (!this.peer) return;
        const conn = this.peer.connect(targetId);
        this.setupConnection(conn);
    }

    private setupConnection(conn: any) {
        conn.on('open', () => {
            this.connections.push(conn);
            this.broadcastLocal('PEER_CONNECTED', conn.peer);
        });

        conn.on('data', (data: any) => {
            if (data.type === 'FULL_SYNC' || data.type === 'PARTIAL_UPDATE') {
                this.db = data.payload;
                localStorage.setItem(DB_KEY, JSON.stringify(this.db));
                this.broadcastLocal('CLOUD_SYNC', this.db);
            }
        });
    }

    private broadcastCloud(type: string, payload: any) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send({ type, payload });
            }
        });
    }

    // --- STANDARD BACKEND LOGIC ---

    private ensureOfficialAccounts() {
        const required = [
            { email: 'mubasshir.mohamed@gov.in', name: 'MUBASSHIR' },
            { email: 'hisham.mohamed@gov.in', name: 'HISHAM' }
        ];
        let updated = false;
        required.forEach(off => {
            if (!this.db.users.find(u => u.email === off.email)) {
                this.db.users.push({
                    name: off.name, email: off.email, phone: '9999988888',
                    aadhaar: '123456781234', password: 'unified',
                    profilePicture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${off.name}`,
                    role: 'official',
                    location: { country: 'India', state: 'Tamil Nadu', district: 'Chennai', coords: { lat: 13.0827, lng: 80.2707 } }
                });
                updated = true;
            }
        });
        if (updated) this.persist();
    }

    private initializeDefaultDB(): UnifiedDatabase {
        return {
            users: [], reports: [], sos: [],
            announcements: [{ id: 1, title: 'Network Initialized', content: 'Cloud Synchronization Active.', source: 'System', timestamp: new Date().toISOString(), status: ReportStatus.Resolved }],
            dataflow: [], team: [{ id: '1', name: 'Admin', role: 'Department Head', avatar: 'https://i.pravatar.cc/150?u=admin' }], auditLogs: []
        };
    }

    private persist() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.db));
        this.localSyncChannel.postMessage({ type: 'REMOTE_UPDATE', payload: this.db });
        this.broadcastCloud('PARTIAL_UPDATE', this.db);
    }

    private broadcastLocal(event: string, data: any) {
        this.listeners.forEach(l => l(event, data));
    }

    public subscribe(callback: (event: string, data: any) => void) {
        this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    }

    public async login(id: string, pw: string, role: 'citizen' | 'official'): Promise<User | null> {
        return this.db.users.find(u => (u.email === id || u.phone === id || u.aadhaar === id) && u.role === role && u.password === pw) || null;
    }

    public async register(userData: Partial<User>): Promise<User> {
        const newUser = { 
            ...userData, role: 'citizen', 
            profilePicture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`,
            email: `${userData.phone}@unified.user` 
        } as User;
        this.db.users.push(newUser);
        this.persist();
        return newUser;
    }

    public getReports() { return [...this.db.reports]; }
    public getSOS() { return [...this.db.sos]; }

    public async createReport(data: any, user: User) {
        const newReport: DetailedReport = {
            id: Date.now(), title: data.title, category: data.category, description: data.description,
            status: ReportStatus.UnderReview, date: new Date().toISOString(),
            location: data.location || "GPS Location", coords: data.coords,
            photo: data.photo, video: data.video, priority: data.priority || 'Medium',
            updates: [{ timestamp: new Date().toISOString(), message: 'Report logged via Cloud.', by: 'System' }]
        };
        this.db.reports.unshift(newReport);
        this.persist();
        this.broadcastLocal('NEW_ISSUE', newReport);
        return newReport;
    }

    public async updateReport(id: number, updates: Partial<DetailedReport>, actor: string) {
        const idx = this.db.reports.findIndex(r => r.id === id);
        if (idx === -1) return null;
        const updated = { ...this.db.reports[idx], ...updates };
        if (updates.status) updated.updates.push({ timestamp: new Date().toISOString(), message: `Status: ${updates.status}`, by: actor });
        this.db.reports[idx] = updated;
        this.persist();
        this.broadcastLocal('ISSUE_UPDATED', updated);
        return updated;
    }

    public async createSOS(user: User, video?: string) {
        const alert: SOSAlert = {
            id: Date.now(), user: { name: user.name, phone: user.phone, profilePicture: user.profilePicture },
            timestamp: new Date().toISOString(), location: { address: 'Live Feed', coords: user.location.coords },
            status: 'Active', recordedVideo: video
        };
        this.db.sos.unshift(alert);
        this.persist();
        this.broadcastLocal('SOS_ALERT', alert);
        return alert;
    }

    public async resolveSOS(id: number, actor: string) {
        const idx = this.db.sos.findIndex(s => s.id === id);
        if (idx !== -1) {
            this.db.sos[idx].status = 'Resolved';
            this.persist();
            this.broadcastLocal('SOS_RESOLVED', id);
        }
    }

    public getAnnouncements() { return this.db.announcements; }
}

export const cloudCore = new BackendCore();
