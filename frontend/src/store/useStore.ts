import { create } from 'zustand';
import type { 
    Connection, Edge, Node, NodeChange, EdgeChange 
} from 'reactflow';
import { applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from 'reactflow';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { TaskData, UserData, UserStatus, NotificationData, DependencyData } from '../types';

interface AppState {
    // --- Auth & User ---
    isAuthenticated: boolean;
    currentUser: string;
    token: string | null;
    setIsAuthenticated: (val: boolean) => void;
    setCurrentUser: (user: string) => void;
    setToken: (token: string | null) => void;
    logout: () => void;

    // --- UI State ---
    isSidebarOpen: boolean;
    sidebarMode: 'create' | 'edit' | 'list' | 'team' | 'settings' | 'network' | 'pipeline';
    isNotifOpen: boolean;
    isInboxOpen: boolean;
    isDragging: boolean;
    isSelecting: boolean;
    currentTaskData: TaskData | null;
    newTaskPos: { x: number, y: number } | null;
    showSurvey: boolean;
    
    setIsSidebarOpen: (val: boolean) => void;
    setSidebarMode: (mode: AppState['sidebarMode']) => void;
    setIsNotifOpen: (val: boolean) => void;
    setIsInboxOpen: (val: boolean) => void;
    setIsDragging: (val: boolean) => void;
    setIsSelecting: (val: boolean) => void;
    setCurrentTaskData: (task: TaskData | null) => void;
    setNewTaskPos: (pos: { x: number, y: number } | null) => void;
    setShowSurvey: (val: boolean) => void;

    // --- Data ---
    allTasks: TaskData[];
    colleagues: UserData[];
    notifications: NotificationData[];
    unreadCount: number;
    bgStyle: 'plain' | 'grid' | 'dots';
    preferredStatus: 'online' | 'busy';

    setAllTasks: (tasks: TaskData[]) => void;
    setColleagues: (users: UserData[]) => void;
    setNotifications: (notifs: NotificationData[] | ((prev: NotificationData[]) => NotificationData[])) => void;
    setBgStyle: (style: 'plain' | 'grid' | 'dots') => void;
    setPreferredStatus: (status: 'online' | 'busy') => void;

    // --- Graph State ---
    nodes: Node[];
    edges: Edge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    onConnect: (params: Connection | Edge) => void;

    // --- Actions (Side Effects) ---
    fetchTasks: () => Promise<void>;
    fetchColleagues: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
    fetchDependencies: () => Promise<void>;
    fetchMyProfile: () => Promise<void>;
    updateMyStatus: (status: UserStatus) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    // --- Auth Initial State ---
    isAuthenticated: !!localStorage.getItem('auth_token'),
    currentUser: localStorage.getItem('username') || "",
    token: localStorage.getItem('auth_token'),
    setIsAuthenticated: (val) => set({ isAuthenticated: val }),
    setCurrentUser: (user) => set({ currentUser: user }),
    setToken: (token) => {
        set({ token });
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Token ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    },
    logout: () => {
        const hwid = localStorage.getItem('device_hwid');
        const savedTenant = localStorage.getItem('saved_tenant_code');
        localStorage.clear();
        if (hwid) localStorage.setItem('device_hwid', hwid);
        if (savedTenant) localStorage.setItem('saved_tenant_code', savedTenant);
        set({ isAuthenticated: false, currentUser: "", token: null, nodes: [], edges: [], allTasks: [], notifications: [] });
        window.location.href = '/';
    },

    // --- UI Initial State ---
    isSidebarOpen: false,
    sidebarMode: 'network',
    isNotifOpen: false,
    isInboxOpen: false,
    isDragging: false,
    isSelecting: false,
    currentTaskData: null,
    newTaskPos: null,
    showSurvey: false,

    setIsSidebarOpen: (val) => set({ isSidebarOpen: val }),
    setSidebarMode: (mode) => set({ sidebarMode: mode }),
    setIsNotifOpen: (val) => set({ isNotifOpen: val }),
    setIsInboxOpen: (val) => set({ isInboxOpen: val }),
    setIsDragging: (val) => set({ isDragging: val }),
    setIsSelecting: (val) => set({ isSelecting: val }),
    setCurrentTaskData: (task) => set({ currentTaskData: task }),
    setNewTaskPos: (pos) => set({ newTaskPos: pos }),
    setShowSurvey: (val) => set({ showSurvey: val }),

    // --- Data Initial State ---
    allTasks: [],
    colleagues: [],
    notifications: [],
    unreadCount: 0,
    bgStyle: 'plain',
    preferredStatus: 'online',

    setAllTasks: (tasks) => set({ allTasks: tasks }),
    setColleagues: (users) => set({ colleagues: users }),
    setNotifications: (notifsOrFn) => set((state) => {
        const notifs = typeof notifsOrFn === 'function' ? notifsOrFn(state.notifications) : notifsOrFn;
        return { 
            notifications: notifs,
            unreadCount: notifs.filter(n => !n.is_read).length 
        };
    }),
    setBgStyle: (style) => set({ bgStyle: style }),
    setPreferredStatus: (status) => set({ preferredStatus: status }),

    // --- Graph Initial State ---
    nodes: [],
    edges: [],
    onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
    onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
    setNodes: (nodesOrFn) => set((state) => ({ 
        nodes: typeof nodesOrFn === 'function' ? nodesOrFn(state.nodes) : nodesOrFn 
    })),
    setEdges: (edgesOrFn) => set((state) => ({ 
        edges: typeof edgesOrFn === 'function' ? edgesOrFn(state.edges) : edgesOrFn 
    })),
    onConnect: (params) => {
        if (params.source === params.target) return;
        set((state) => ({
            edges: addEdge({ 
                ...params, animated: true, type: 'smoothstep', 
                style: { stroke: '#00f3ff', strokeWidth: 2, filter: 'drop-shadow(0 0 4px #00f3ff)' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#00f3ff' },
            }, state.edges)
        }));
    },

    // --- Actions ---
    fetchTasks: async () => {
        const { token, currentUser, setNodes } = get();
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/tasks/`);
            const serverTasks: TaskData[] = response.data;
            set({ allTasks: serverTasks });

            setNodes((currentNodes) => {
                const currentSelectionMap = new Map(currentNodes.map(n => [n.id, n.selected]));
                const currentPosMap = new Map(currentNodes.map(n => [n.id, n.position]));

                const hubNode: Node = {
                    id: 'hub-center',
                    type: 'hub',
                    position: { x: 0, y: 0 },
                    data: { label: 'Center' },
                    draggable: false, selectable: false, zIndex: -1
                };

                const activeTasks = serverTasks.filter(t => {
                    if (t.status !== 'active') return false;
                    const myAssignment = t.assignments?.find(a => a.user.username === currentUser);
                    if (myAssignment && (myAssignment.is_completed || myAssignment.is_failed)) return false;
                    const posX = t.node_data?.position_x || 0;
                    const posY = t.node_data?.position_y || 0;
                    if (posX === 0 && posY === 0) return t.created_by.username === currentUser;
                    return true;
                });

                const taskNodes: Node[] = activeTasks.map((task) => {
                    const nodeId = task.id.toString();
                    const isPinned = task.node_data?.is_pinned || false;
                    const existingPos = currentPosMap.get(nodeId);
                    const finalPosition = existingPos || {
                        x: task.node_data?.position_x || 0,
                        y: task.node_data?.position_y || 0
                    };

                    return {
                        id: nodeId,
                        type: 'cyber',
                        draggable: !isPinned,
                        position: finalPosition,
                        selected: currentSelectionMap.get(nodeId) || false,
                        data: {
                            fullData: {
                                ...task,
                                node_data: { ...(task.node_data || { id: 0, is_pinned: false }), is_pinned: isPinned }
                            }
                        },
                        parentNode: 'hub-center',
                    };
                });

                return [hubNode, ...taskNodes];
            });
        } catch (e) { console.error("Görev çekme hatası", e); }
    },

    fetchColleagues: async () => {
        const { token, currentUser } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/users/`);
            const serverData: UserData[] = res.data.map((u: any) => ({
                ...u,
                phone: u.profile?.phone,
                privacy_settings: u.profile?.privacy_settings,
                notification_settings: u.profile?.notification_settings,
                rank: u.rank || u.profile?.rank,
                title: u.title || u.profile?.title,
                department: u.department || u.profile?.department,
                status: u.status || 'offline'
            }));
            
            set((state) => {
                const myLocalProfile = state.colleagues.find(c => c.username === currentUser);
                const myCurrentStatus = myLocalProfile ? myLocalProfile.status : 'online';
                return {
                    colleagues: serverData.map(serverUser =>
                        serverUser.username === currentUser ? { ...serverUser, status: myCurrentStatus } : serverUser
                    )
                };
            });
        } catch (e) { console.error("Kullanıcı çekme hatası", e); }
    },

    fetchNotifications: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/notifications/`);
            const notifs = res.data;
            set({ 
                notifications: notifs,
                unreadCount: notifs.filter((n: any) => !n.is_read).length
            });
        } catch (e) { console.error("Bildirim çekme hatası", e); }
    },

    fetchDependencies: async () => {
        const { token, setEdges } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/dependencies/`);
            setEdges(res.data.map((dep: DependencyData) => ({
                id: `e${dep.source_task}-${dep.target_task}`,
                source: dep.source_task.toString(),
                target: dep.target_task.toString(),
                animated: true,
                type: 'smoothstep',
                style: { stroke: '#E91E63', strokeWidth: 2, filter: 'drop-shadow(0 0 3px #E91E63)' }
            })));
        } catch (e) { console.error("Bağlantı çekme hatası", e); }
    },

    fetchMyProfile: async () => {
        const { token, currentUser } = get();
        if (!currentUser || !token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me/`, { headers: { 'Authorization': `Token ${token}` } });
            const data = await res.json();
            const profileObj = data.profile || {};
            set({ bgStyle: profileObj.background_style || 'plain' });
        } catch (e) { console.error("Profil çekme hatası", e); }
    },

    updateMyStatus: async (newStatus: UserStatus) => {
        const { currentUser } = get();
        if (newStatus === 'online' || newStatus === 'busy') set({ preferredStatus: newStatus });
        
        set((state) => ({
            colleagues: state.colleagues.map(c => c.username === currentUser ? { ...c, status: newStatus } : c)
        }));

        try {
            await axios.post(`${API_BASE_URL}/api/users/update_status/`, { status: newStatus });
        } catch { }
    }
}));
