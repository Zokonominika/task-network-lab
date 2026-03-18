import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    Plus, Bell, LogOut, ChevronRight, ChevronDown,
    Layout, PieChart
} from 'lucide-react';

import type { TaskData, UserData, NotificationData } from './types';
import PipelinePanel from './components/PipelinePanel';
import CreateTaskForm from './components/CreateTaskForm';
import NotificationPanel from './components/NotificationPanel';
import TaskDetailPanel from './components/TaskDetailPanel';
import DeadlineTimer from './components/DeadlineTimer';
import SurveyModal from './components/SurveyModal';
import WelcomeTutorialKanban from './components/WelcomeTutorialKanban';
import { API_BASE_URL } from './config';


export default function AppKanban() {
    // --- 1. STATE ---
    const [currentUser] = useState<string>(localStorage.getItem('username') || "");
    const [token] = useState<string | null>(localStorage.getItem('auth_token'));
    const [tasks, setTasks] = useState<TaskData[]>([]);
    const [colleagues, setColleagues] = useState<UserData[]>([]);
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'detail' | 'create' | 'pipeline'>('detail');
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [showSurvey, setShowSurvey] = useState(false);
    const [initialParentId, setInitialParentId] = useState<number | null>(null);
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<any>(null);

    const notificationSound = useMemo(() => {
        try { return new Audio('/notification.wav'); }
        catch { return null; }
    }, []);
    const prevUnreadCountRef = useRef(0);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token')
        if (savedToken) {
            axios.defaults.headers.common['Authorization'] = `Token ${savedToken}`
        }
    }, [])

    // --- 2. DATA FETCHING ---
    const fetchTasks = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/tasks/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setTasks(res.data);
        } catch (e) { console.error("Tasks fetch error", e); }
    }, [token]);

    const fetchColleagues = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/users/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setColleagues(res.data);
        } catch (e) { console.error("Users fetch error", e); }
    }, [token]);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/notifications/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setNotifications(res.data);
        } catch (e) { console.error("Notifications fetch error", e); }
    }, [token]);

    const updateMyStatus = useCallback(async (status: string) => {
        if (!token) return;
        try {
            await axios.post(`${API_BASE_URL}/api/users/update_status/`, { status }, {
                headers: { 'Authorization': `Token ${token}` }
            });
        } catch { }
    }, [token]);


    useEffect(() => {
        if (!token) return;
        fetchTasks();
        fetchColleagues();
        fetchNotifications();

        const interval = setInterval(() => {
            fetchTasks();
            fetchColleagues();
            fetchNotifications();
            axios.post(`${API_BASE_URL}/api/tasks/check_deadlines/`, {}, {
                headers: { 'Authorization': `Token ${token}` }
            }).catch(() => { });
        }, 2000);

        return () => clearInterval(interval);
    }, [token, fetchTasks, fetchColleagues, fetchNotifications]);

    useEffect(() => {
        const handleFocus = () => updateMyStatus('online');
        const handleBlur = () => updateMyStatus('away');
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, [updateMyStatus]);

    useEffect(() => {
        if (unreadCount > prevUnreadCountRef.current) {
            notificationSound?.play().catch(() => { });
            document.title = `(${unreadCount}) 🔔 Yeni Bildirim!`;
        } else if (unreadCount === 0) {
            document.title = "TaskNetwork";
        }
        prevUnreadCountRef.current = unreadCount;
    }, [unreadCount, notificationSound]);

    // --- 3. HANDLERS ---
    const handleLogout = async () => {
        try {
            await updateMyStatus('offline');
        } catch { }
        const hwid = localStorage.getItem('device_hwid');
        const savedTenant = localStorage.getItem('saved_tenant_code');
        localStorage.clear();
        if (hwid) localStorage.setItem('device_hwid', hwid);
        if (savedTenant) localStorage.setItem('saved_tenant_code', savedTenant);
        window.location.href = '/';
    };

    const toggleExpand = (id: number, depth: number) => {
        const newExpanded = new Set(expandedIds);
        const becomingExpanded = !newExpanded.has(id);
        if (becomingExpanded) {
            newExpanded.add(id);
            axios.post(`${API_BASE_URL}/api/research/log_interaction/`, {
                event_type: 'task_expanded', task_id: id, depth_level: depth
            }, { headers: { 'Authorization': `Token ${token}` } });
        } else {
            newExpanded.delete(id);
        }
        setExpandedIds(newExpanded);
    };

    const handleTaskClick = async (task: TaskData) => {
        setSelectedTaskId(task.id);
        setSelectedTaskDetail(null);
        setViewMode('detail');

        try {
            const detailRes = await axios.get(`${API_BASE_URL}/api/tasks/${task.id}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setSelectedTaskDetail(detailRes.data);

            const myAssign = detailRes.data.assignments?.find((a: any) => a.user?.username === currentUser);
            if (myAssign && !myAssign.is_read) {
                await axios.post(`${API_BASE_URL}/api/tasks/${task.id}/mark_as_read/`, {}, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                fetchTasks();
            }
        } catch (e) {
            console.error("Task detail fetch error", e);
        }
    };

    const handleAddSubtask = (e: React.MouseEvent, parentId: number) => {
        e.stopPropagation();
        setInitialParentId(parentId);
        setViewMode('create');
        axios.post(`${API_BASE_URL}/api/research/log_interaction/`, {
                event_type: 'subtask_initiated', task_id: parentId
            }, { headers: { 'Authorization': `Token ${token}` } });
    };

    const handleMarkNotifAllRead = async () => {
        if (!token) return;
        try {
            await axios.post(`${API_BASE_URL}/api/notifications/mark_all_read/`, {}, {
                headers: { 'Authorization': `Token ${token}` }
            });
            fetchNotifications();
        } catch (e) { console.error("Mark all read error", e); }
    };

    const handleClearNotifications = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token) return;
        try {
            await axios.post(`${API_BASE_URL}/api/notifications/clear_all/`, {}, {
                headers: { 'Authorization': `Token ${token}` }
            });
            fetchNotifications();
        } catch (e) { console.error("Clear notifications error", e); }
    };

    const handleNotifItemClick = () => {
        // Handle notification click if needed
    };


    // --- 4. RENDER HELPERS ---
    const renderTaskTree = (parentId: number | null = null, depth = 0) => {
        const filtered = (tasks || []).filter(t => t.parent_task === parentId && !t.is_pipeline_task && t.status !== 'completed');
        return filtered.map(task => {
            const hasSubtasks = (tasks || []).some(t => t.parent_task === task.id && !t.is_pipeline_task);
            const isExpanded = expandedIds.has(task.id);
            const isSelected = selectedTaskId === task.id;

            return (
                <div key={task.id}>
                    <div
                        onClick={() => handleTaskClick(task)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            paddingLeft: 12 + (depth * 24),
                            cursor: 'pointer',
                            minHeight: '44px',
                            borderLeft: isSelected ? '3px solid #1976D2' : '3px solid transparent',
                            backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            transition: 'all 0.2s ease',
                            borderBottom: '1px solid #F0F0F0'
                        }}
                        className="task-row-container"
                    >
                        <div
                            onClick={(e) => { e.stopPropagation(); toggleExpand(task.id, depth); }}
                            style={{ marginRight: 8, color: '#9E9E9E', width: 20, display: 'flex', justifyContent: 'center' }}
                        >
                            {hasSubtasks ? (isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#CCC' }} />}
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <span style={{
                                flex: 1,
                                fontSize: '0.9rem',
                                fontWeight: depth === 0 ? '600' : '400',
                                color: task.status === 'completed' ? '#9E9E9E' : '#212121',
                                textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                            }}>
                                {task.title}
                            </span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                    className="add-subtask-btn"
                                    onClick={(e) => handleAddSubtask(e, task.id)}
                                    style={{
                                        background: 'transparent',
                                        color: '#1976D2',
                                        border: '1px solid #1976D2',
                                        borderRadius: 4,
                                        padding: '2px 6px',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    + Alt Görev
                                </button>
                                {task.priority === 'urgent' && (
                                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#ffebee', color: '#f44336', borderRadius: 4, border: '1px solid #ffcdd2' }}>
                                        🔴 Acil
                                    </span>
                                )}
                                <div style={{ fontSize: '0.75rem', color: '#757575', minWidth: 60, textAlign: 'right' }}>
                                    {(task.assignments || []).slice(0, 2).map((a: any) => a.user.first_name || a.user.username).join(', ')}
                                    {(task.assignments || []).length > 2 && ` +${task.assignments.length - 2}`}
                                </div>
                                {task.status !== 'active' && (
                                    <div style={{
                                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12, fontWeight: '500',
                                        background: task.status === 'completed' ? '#E8F5E9' : '#FFEBEE',
                                        color: task.status === 'completed' ? '#4CAF50' : '#F44336'
                                    }}>
                                        {task.status === 'completed' ? 'Tamamlandı' : 'Süresi Doldu'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {isExpanded && renderTaskTree(task.id, depth + 1)}
                </div>
            );
        });
    };

    // --- 5. STYLES ---
    const headerStyle: React.CSSProperties = {
        height: '56px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
    };

    const mainContainerStyle: React.CSSProperties = {
        display: 'flex',
        height: 'calc(100vh - 56px)',
        backgroundColor: '#F8F9FA',
        overflow: 'hidden'
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                .task-row-container:hover .add-subtask-btn { opacity: 1 !important; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #DDD; borderRadius: 4px; }

                /* Pipeline Light Theme Overrides */
                .kanban-pipeline-wrapper .pipeline-panel,
                .kanban-pipeline-wrapper > div {
                    background: #ffffff !important;
                    color: #212121 !important;
                    border-color: #E0E0E0 !important;
                }
                .kanban-pipeline-wrapper h2,
                .kanban-pipeline-wrapper h4,
                .kanban-pipeline-wrapper span,
                .kanban-pipeline-wrapper p {
                    color: #212121 !important;
                }
                .kanban-pipeline-wrapper .stage-card {
                    background: #F8F9FA !important;
                    border-color: #E0E0E0 !important;
                }
                .kanban-pipeline-wrapper .stage-card.current {
                    background: #E3F2FD !important;
                    border-color: #1976D2 !important;
                    box-shadow: 0 0 20px rgba(25, 118, 210, 0.15) !important;
                }
                .kanban-pipeline-wrapper .progress-bar-container {
                    background: #E0E0E0 !important;
                }
                .kanban-pipeline-wrapper .progress-bar-fill {
                    background: #1976D2 !important;
                    box-shadow: none !important;
                }
                .kanban-pipeline-wrapper .glow-btn {
                    border-color: #1976D2 !important;
                    color: #1976D2 !important;
                }
                .kanban-pipeline-wrapper .glow-btn:hover:not(:disabled) {
                    background: rgba(25, 118, 210, 0.1) !important;
                    box-shadow: 0 0 15px rgba(25, 118, 210, 0.3) !important;
                }
            `}</style>

            {/* TOP BAR */}
            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1976D2', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Layout size={24} /> TaskNetwork
                    </span>
                    <DeadlineTimer token={token} />
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setIsNotifOpen(!isNotifOpen)} style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#E91E63', color: 'white', fontSize: '0.65rem', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <div style={{
                            position: 'absolute',
                            left: '-30px',
                            top: 0,
                            width: 320,
                            zIndex: 1000,
                            display: isNotifOpen ? 'block' : 'none',
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
                        }}>
                            {/* Arrow pointer */}
                            <div style={{
                                position: 'absolute',
                                top: 40,
                                left: 40,
                                width: 0,
                                height: 0,
                                borderLeft: '8px solid transparent',
                                borderRight: '8px solid transparent',
                                borderBottom: '8px solid #ffffff',
                                zIndex: 1001
                            }} />
                            {/* @ts-ignore */}
                            <NotificationPanel
                                isOpen={isNotifOpen}
                                notifications={notifications}
                                onMarkAllRead={handleMarkNotifAllRead}
                                onItemClick={handleNotifItemClick}
                                onClear={handleClearNotifications}
                                theme="light"
                            />
                        </div>
                    </div>
                </div>

                {!showSurvey && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => { setInitialParentId(null); setViewMode('create'); }}
                            style={{ backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Plus size={18} /> Yeni Görev
                        </button>

                        <button
                            onClick={() => setViewMode('pipeline')}
                            style={{ backgroundColor: 'white', color: '#1976D2', border: '1px solid #1976D2', borderRadius: 6, padding: '8px 16px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <PieChart size={18} /> 📊 Sunum Süreci
                        </button>

                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}>
                            <LogOut size={20} />
                        </button>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT */}
            <main style={mainContainerStyle}>
                {/* LEFT PANEL */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #E0E0E0', minHeight: '100%' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#212121' }}>Görev Ağacı</h3>
                            <span style={{ fontSize: '0.8rem', color: '#757575' }}>{tasks.filter(t => !t.is_pipeline_task && t.status !== 'completed').length} Görev</span>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {renderTaskTree(null)}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div style={{ width: '400px', backgroundColor: 'white', borderLeft: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {viewMode === 'pipeline' ? (
                        <div style={{ height: '100%', overflowY: 'auto' }} className="kanban-pipeline-wrapper">
                            <PipelinePanel onSurveyTrigger={() => setShowSurvey(true)} token={token} currentUser={currentUser} />
                        </div>
                    ) : viewMode === 'create' ? (
                        <div style={{ height: '100%' }}>
                            <CreateTaskForm
                                colleagues={colleagues}
                                token={token}
                                onTaskCreated={() => { fetchTasks(); setViewMode('detail'); }}
                                currentUser={currentUser}
                                initialParentTask={initialParentId}
                                theme="light"
                            />
                        </div>
                    ) : selectedTaskDetail ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', position: 'relative', overflowY: 'auto' }}>
                            <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <TaskDetailPanel
                                    task={selectedTaskDetail}
                                    onClose={() => setSelectedTaskId(null)}
                                    onUpdate={fetchTasks}
                                    currentUser={currentUser}
                                    token={token}
                                    theme="light"
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#757575', gap: 12 }}>
                            <Layout size={48} strokeWidth={1} />
                            <span>Bir görev seçin</span>
                        </div>
                    )}
                </div>
            </main >

            {/* @ts-ignore */}
            < SurveyModal isOpen={showSurvey} onClose={() => setShowSurvey(false)
            } token={token} sessionId={localStorage.getItem('session_id')} />

            {/* WELCOME TUTORIAL */}
            <WelcomeTutorialKanban />
        </div >
    );
}
