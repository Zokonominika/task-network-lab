import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Background, BackgroundVariant, SelectionMode,
    type NodeDragHandler, type NodeMouseHandler,
    type ReactFlowInstance
} from 'reactflow';
import axios from 'axios';
import 'reactflow/dist/style.css';

// --- COMPONENTS ---
import LoginScreen from './components/LoginScreen';
import NotificationArea from './components/NotificationArea';
import AppSidebar from './components/AppSidebar';
import TopLeftToolbar from './components/TopLeftToolbar';
import InboxDrawer from './components/InboxDrawer';
import GraphContextMenu from './components/GraphContextMenu';
import WelcomeTutorial from './components/WelcomeTutorial';
import SurveyModal from './components/SurveyModal';

// --- CONFIG & STORE ---
import { nodeTypes } from './nodeConfig';
import { useStore } from './store/useStore';
import { API_BASE_URL } from './config';

export default function App() {
    const store = useStore();
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);

    const prevUnreadCountRef = useRef(0);
    const notificationSound = useMemo(() => new Audio('/notification.wav'), []);

    // --- INITIAL SESSION RESTORE ---
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('username');
        if (savedToken && savedUser) {
            store.setToken(savedToken);
            store.setCurrentUser(savedUser);
            store.setIsAuthenticated(true);
        }
    }, []);

    // --- SOUND & TITLE EFFECTS ---
    useEffect(() => {
        if (store.unreadCount > prevUnreadCountRef.current) {
            notificationSound.play().catch(e => console.log("Ses çalma engellendi:", e));
            document.title = `(${store.unreadCount}) 🔔 Yeni Bildirim! | TaskNetwork`;
        } else if (store.unreadCount === 0) {
            document.title = "TaskNetwork";
        }
        prevUnreadCountRef.current = store.unreadCount;
    }, [store.unreadCount, notificationSound]);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (store.isAuthenticated && store.token) {
            const loadInitialData = async () => {
                await store.fetchTasks();
                await store.fetchDependencies();
                await store.fetchColleagues();
                store.fetchMyProfile();
            };
            loadInitialData();
        }
    }, [store.isAuthenticated, store.token]);

    // --- AUTO UPDATE LOOP ---
    useEffect(() => {
        if (!store.isAuthenticated) return;
        const interval = setInterval(() => {
            if (store.isDragging || store.isSelecting) return;
            store.fetchColleagues();
            store.fetchNotifications();
            if (store.token) {
                axios.post(`${API_BASE_URL}/api/tasks/check_deadlines/`).catch(() => { });
                store.fetchTasks();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [store.isAuthenticated, store.isDragging, store.isSelecting, store.token]);

    // --- STATUS AUTO UPDATE (Focus/Blur) ---
    useEffect(() => {
        const handleFocus = () => store.updateMyStatus(store.preferredStatus);
        const handleBlur = () => {
            store.updateMyStatus('away' as any);
        };
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        return () => { 
            window.removeEventListener('focus', handleFocus); 
            window.removeEventListener('blur', handleBlur); 
        };
    }, [store.preferredStatus]);

    // --- HANDLERS ---
    const onNodeClick: NodeMouseHandler = async (_, node) => {
        if (node.type === 'hub') {
            store.setSidebarMode('network');
            store.setIsSidebarOpen(true);
            return;
        }
        const task = node.data.fullData;
        store.setCurrentTaskData(task);
        store.setSidebarMode('edit');
        store.setIsSidebarOpen(true);

        const myAssign = task.assignments?.find((a: any) => a.user.username === store.currentUser);
        if (myAssign && !myAssign.is_read && store.token) {
            try { 
                await axios.post(`${API_BASE_URL}/api/tasks/${task.id}/mark_as_read/`); 
                store.fetchTasks(); 
            } catch { }
        }
    };

    const onNodeDragStop: NodeDragHandler = async (_, node) => {
        if (!rfInstance) return;
        const liveNodes = rfInstance.getNodes();
        const selectedNodes = liveNodes.filter(n => n.selected);
        const targetNode = liveNodes.find(n => n.id === node.id);
        const nodesToProcess = selectedNodes.length > 0 ? selectedNodes : (targetNode ? [targetNode] : []);

        try {
            for (const n of nodesToProcess) {
                const taskId = parseInt(n.id);
                if (isNaN(taskId)) continue;
                await axios.post(`${API_BASE_URL}/api/tasks/${taskId}/update_position/`, {
                    x: Math.round(n.position.x),
                    y: Math.round(n.position.y)
                });
            }
            // After bulk save, update local state
            store.fetchTasks(); 
        } catch (e) {
            console.error("Kayıt hatası:", e);
        } finally {
            store.setIsDragging(false);
        }
    };

    const onSelectionDragStop = async (_: React.MouseEvent, selectionNodes: any[]) => {
        try {
            for (const n of selectionNodes) {
                const taskId = parseInt(n.id);
                if (isNaN(taskId)) continue;
                await axios.post(`${API_BASE_URL}/api/tasks/${taskId}/update_position/`, {
                    x: Math.round(n.position.x),
                    y: Math.round(n.position.y)
                });
            }
            store.fetchTasks();
        } catch (e) { }
    };

    // --- CONNECT LOGIC ---
    useEffect(() => {
        store.setNodes((nds) => nds.map((node) => {
            if (!connectingNodeId) return { ...node, style: { ...node.style, opacity: 1 } };
            const sourceNode = nds.find(n => n.id === connectingNodeId);
            if (!sourceNode || sourceNode.type === 'hub' || node.type === 'hub' || !sourceNode.data.fullData || !node.data.fullData) {
                return { ...node, style: { ...node.style, opacity: 1 } };
            }
            const srcD = sourceNode.data.fullData.due_date ? new Date(sourceNode.data.fullData.due_date).getTime() : 0;
            const trgD = node.data.fullData.due_date ? new Date(node.data.fullData.due_date).getTime() : 0;
            if (srcD !== 0 && trgD !== 0 && trgD < srcD) return { ...node, style: { ...node.style, opacity: 0.2, transition: 'opacity 0.3s' } };
            return { ...node, style: { ...node.style, opacity: 1, transition: 'opacity 0.3s' } };
        }));
    }, [connectingNodeId]);

    const handleTogglePin = async () => {
        if (!store.currentTaskData || !store.currentTaskData.node_data) return;
        const taskNodeId = store.currentTaskData.node_data.id;
        const newPinnedState = !store.currentTaskData.node_data.is_pinned;

        setMenu(null);
        try { 
            await axios.patch(`${API_BASE_URL}/api/nodes/${taskNodeId}/`, { is_pinned: newPinnedState });
            store.fetchTasks();
        } catch (e) { }
    };

    const onDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        const taskIdStr = event.dataTransfer.getData('application/reactflow');
        if (!taskIdStr || !rfInstance) return;
        const taskId = parseInt(taskIdStr);
        const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        try { 
            await axios.post(`${API_BASE_URL}/api/tasks/${taskId}/update_position/`, { x: position.x, y: position.y });
            store.fetchTasks();
        } catch (e) { }
    };

    if (!store.isAuthenticated) return <LoginScreen onLoginSuccess={(user) => {
        store.setIsAuthenticated(true);
        store.setCurrentUser(user);
        localStorage.setItem('username', user);
        store.setToken(localStorage.getItem('auth_token'));
    }} />;

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', overflow: 'hidden' }}>
            <ReactFlow
                proOptions={{ hideAttribution: true }}
                nodes={store.nodes} edges={store.edges} nodeTypes={nodeTypes}
                onNodesChange={store.onNodesChange} onEdgesChange={store.onEdgesChange}
                onConnect={store.onConnect}
                onConnectStart={(_, { nodeId }) => setConnectingNodeId(nodeId)}
                onConnectEnd={() => setConnectingNodeId(null)}
                onNodeDragStop={onNodeDragStop} 
                onSelectionDragStop={onSelectionDragStop}
                onNodeDragStart={() => store.setIsDragging(true)} 
                onNodeClick={onNodeClick}
                onPaneClick={() => { setMenu(null); store.setIsSidebarOpen(false); store.setIsNotifOpen(false); store.setIsInboxOpen(false); }}
                onPaneContextMenu={(e) => { e.preventDefault(); setContextMenuNodeId(null); setMenu({ x: e.clientX, y: e.clientY }); }}
                onNodeContextMenu={(e, node) => { e.preventDefault(); if (node.type === 'hub') return; setContextMenuNodeId(node.id); store.setCurrentTaskData(node.data.fullData); setMenu({ x: e.clientX, y: e.clientY }); }}
                onInit={setRfInstance}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={onDrop}
                onSelectionStart={() => store.setIsSelecting(true)} 
                onSelectionEnd={() => store.setIsSelecting(false)}
                selectionKeyCode="Shift" selectionMode={SelectionMode.Partial} fitView
            >
                <GraphContextMenu 
                    menu={menu} 
                    contextMenuNodeId={contextMenuNodeId} 
                    handleTogglePin={handleTogglePin} 
                    handleAddNodeFromMenu={() => {
                        if (menu && rfInstance) {
                            store.setNewTaskPos(rfInstance.screenToFlowPosition({ x: menu.x, y: menu.y }));
                            store.setSidebarMode('create');
                            store.setIsSidebarOpen(true);
                            setMenu(null);
                        }
                    }} 
                />

                <Background
                    variant={store.bgStyle === 'grid' ? BackgroundVariant.Lines : BackgroundVariant.Dots}
                    gap={store.bgStyle === 'grid' ? 40 : 20}
                    size={store.bgStyle === 'plain' ? 0 : 1}
                    color={store.bgStyle === 'grid' ? '#333' : '#444'}
                    style={{ backgroundColor: store.bgStyle === 'plain' ? '#111' : 'transparent' }}
                />
            </ReactFlow>

            <TopLeftToolbar rfInstance={rfInstance} />
            <NotificationArea />
            <AppSidebar rfInstance={rfInstance} />
            <InboxDrawer />

            {store.showSurvey && <SurveyModal isOpen={store.showSurvey} token={store.token} sessionId={localStorage.getItem('session_id')} />}
            <WelcomeTutorial />
        </div>
    );
}