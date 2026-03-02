import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Plus, Bell, LogOut, ChevronRight, ChevronDown, LayoutDashboard, BarChart3, X, Paperclip, Calendar, User2, Tag, Clock, CheckCircle2, Circle } from 'lucide-react';

import type { TaskData, UserData, NotificationData } from './types';
import CreateTaskForm from './components/CreateTaskForm';
import NotificationPanel from './components/NotificationPanel';
import DeadlineTimer from './components/DeadlineTimer';
import SurveyModal from './components/SurveyModal';
import PipelinePanel from './components/PipelinePanel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Assignment {
    id: number;
    user: { id: number; username: string; first_name: string; last_name: string };
    is_completed: boolean;
    is_read: boolean;
    completed_at: string | null;
}

interface Attachment {
    id: number;
    file: string;
    file_type: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const priorityLabel = (p: string) => p === 'urgent' ? '🔴 Acil' : '⚪ Normal';
const priorityColors = (p: string) => p === 'urgent'
    ? { bg: '#FFF0F0', color: '#D32F2F', border: '#FFCDD2' }
    : { bg: '#F5F5F5', color: '#616161', border: '#E0E0E0' };

const statusColors = (s: string) => {
    if (s === 'completed') return { bg: '#E8F5E9', color: '#2E7D32', border: '#C8E6C9' };
    if (s === 'active') return { bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' };
    return { bg: '#FFF3E0', color: '#E65100', border: '#FFE0B2' };
};

const statusLabel = (s: string) => {
    if (s === 'completed') return 'Tamamlandı';
    if (s === 'active') return 'Aktif';
    return 'Süresi Doldu';
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const avatarColor = (name: string) => {
    const colors = ['#1976D2', '#388E3C', '#7B1FA2', '#F57C00', '#C62828', '#00838F'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

// ─── Section Label Helper ─────────────────────────────────────────────────────
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.7px',
            textTransform: 'uppercase' as const, color: '#9E9E9E', marginBottom: 8
        }}>
            {icon} {text}
        </div>
    );
}

// ─── Inline Task Detail ───────────────────────────────────────────────────────
function TaskDetail({ task, currentUser, onUpdate, onClose }: {
    task: TaskData;
    currentUser: string;
    onUpdate: () => void;
    onClose: () => void;
}) {
    const [completing, setCompleting] = useState(false);
    const [archiving, setArchiving] = useState(false);

    const assignments = (task.assignments as Assignment[]) || [];
    const attachments = (task.attachments as Attachment[]) || [];
    const myAssignment = assignments.find(a => a.user.username === currentUser);
    const allDone = assignments.length > 0 && assignments.every(a => a.is_completed);
    const isCreator = (task.created_by as any)?.username === currentUser;

    const handleComplete = async () => {
        setCompleting(true);
        try {
            await axios.post(`http://127.0.0.1:8000/api/tasks/${task.id}/complete_my_part/`, {});
            onUpdate();
        } catch (e) { console.error(e); }
        setCompleting(false);
    };

    const handleArchive = async () => {
        setArchiving(true);
        try {
            await axios.post(`http://127.0.0.1:8000/api/tasks/${task.id}/archive_task/`, {});
            onUpdate();
            onClose();
        } catch (e) { console.error(e); }
        setArchiving(false);
    };

    const sc = statusColors(task.status);
    const pc = priorityColors(task.priority || 'normal');

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {/* Header */}
            <div style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid #EEF0F3',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: '#9E9E9E', marginBottom: 4 }}>
                        Görev Detayı
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1A1A2E', lineHeight: 1.4, wordBreak: 'break-word' as const }}>
                        {task.title}
                    </h3>
                </div>
                <button onClick={onClose} style={{
                    background: '#F5F5F5', border: 'none', borderRadius: 6,
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#757575', flexShrink: 0
                }}>
                    <X size={14} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>
                        {priorityLabel(task.priority || 'normal')}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {statusLabel(task.status)}
                    </span>
                </div>

                {/* Description */}
                {task.description && (
                    <div>
                        <SectionLabel icon={<Tag size={12} />} text="Açıklama" />
                        <div style={{ fontSize: '0.85rem', color: '#424242', lineHeight: 1.7, background: '#FAFAFA', padding: '12px 14px', borderRadius: 8, border: '1px solid #F0F0F0' }}>
                            {task.description}
                        </div>
                    </div>
                )}

                {/* Due Date */}
                {task.due_date && (
                    <div>
                        <SectionLabel icon={<Calendar size={12} />} text="Teslim Tarihi" />
                        <div style={{ fontSize: '0.85rem', color: '#424242', background: '#FAFAFA', padding: '10px 14px', borderRadius: 8, border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={14} color="#1976D2" />
                            {formatDate(task.due_date)}
                        </div>
                    </div>
                )}

                {/* Assignees */}
                {assignments.length > 0 && (
                    <div>
                        <SectionLabel icon={<User2 size={12} />} text="Atanan Kişiler" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {assignments.map(a => {
                                const name = a.user.first_name || a.user.username;
                                const bg = avatarColor(name);
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #F0F0F0' }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                            {name[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', color: '#212121', fontWeight: 500 }}>{name}</div>
                                            <div style={{ fontSize: '0.7rem', color: a.is_completed ? '#4CAF50' : '#9E9E9E' }}>
                                                {a.is_completed ? '✅ Tamamladı' : 'Devam ediyor'}
                                            </div>
                                        </div>
                                        {a.is_completed ? <CheckCircle2 size={16} color="#4CAF50" /> : <Circle size={16} color="#E0E0E0" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Files */}
                {attachments.length > 0 && (
                    <div>
                        <SectionLabel icon={<Paperclip size={12} />} text="Dosyalar" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {attachments.map(att => (
                                <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #F0F0F0', textDecoration: 'none', color: '#1976D2', fontSize: '0.82rem' }}>
                                    <Paperclip size={13} />
                                    {decodeURIComponent(att.file.split('/').pop() || '').replace(/_[a-zA-Z0-9]{7,}(\.[^.]+)$/, '$1')}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Creator */}
                {task.created_by && (
                    <div style={{ fontSize: '0.72rem', color: '#BDBDBD', paddingTop: 12, borderTop: '1px solid #F5F5F5' }}>
                        Oluşturan: {(task.created_by as any).first_name || (task.created_by as any).username}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #EEF0F3', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myAssignment && !myAssignment.is_completed && (
                    <button onClick={handleComplete} disabled={completing} style={{
                        width: '100%', padding: '10px', borderRadius: 8,
                        background: '#1976D2', color: 'white', border: 'none',
                        fontWeight: 600, fontSize: '0.85rem', cursor: completing ? 'not-allowed' : 'pointer',
                        opacity: completing ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                        <CheckCircle2 size={16} />
                        {completing ? 'İşleniyor...' : 'Payımı Tamamladım'}
                    </button>
                )}
                {allDone && task.status !== 'completed' && isCreator && (
                    <button onClick={handleArchive} disabled={archiving} style={{
                        width: '100%', padding: '10px', borderRadius: 8,
                        background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9',
                        fontWeight: 600, fontSize: '0.85rem', cursor: archiving ? 'not-allowed' : 'pointer',
                        opacity: archiving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                        🎉 Görevi Arşivle
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main AppKanban ───────────────────────────────────────────────────────────
export default function AppKanban() {
    const [currentUser] = useState<string>(localStorage.getItem('username') || '');
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

    const notificationSound = useMemo(() => {
        try { return new Audio('/notification.wav'); } catch { return null; }
    }, []);
    const prevUnreadRef = useRef(0);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (token) axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    }, [token]);

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        try { const r = await axios.get('http://127.0.0.1:8000/api/tasks/'); setTasks(r.data); } catch { }
    }, [token]);

    const fetchColleagues = useCallback(async () => {
        if (!token) return;
        try { const r = await axios.get('http://127.0.0.1:8000/api/users/'); setColleagues(r.data); } catch { }
    }, [token]);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try { const r = await axios.get('http://127.0.0.1:8000/api/notifications/'); setNotifications(r.data); } catch { }
    }, [token]);

    const updateStatus = useCallback(async (s: string) => {
        if (!token) return;
        try { await axios.post('http://127.0.0.1:8000/api/users/update_status/', { status: s }); } catch { }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetchTasks(); fetchColleagues(); fetchNotifications();
        const iv = setInterval(() => {
            fetchTasks(); fetchColleagues(); fetchNotifications();
            axios.post('http://127.0.0.1:8000/api/tasks/check_deadlines/', {}).catch(() => { });
        }, 2000);
        return () => clearInterval(iv);
    }, [token, fetchTasks, fetchColleagues, fetchNotifications]);

    useEffect(() => {
        const onFocus = () => updateStatus('online');
        const onBlur = () => updateStatus('away');
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);
        return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('blur', onBlur); };
    }, [updateStatus]);

    useEffect(() => {
        if (unreadCount > prevUnreadRef.current) {
            notificationSound?.play().catch(() => { });
            document.title = `(${unreadCount}) 🔔 Yeni Bildirim!`;
        } else if (unreadCount === 0) {
            document.title = 'TaskNetwork';
        }
        prevUnreadRef.current = unreadCount;
    }, [unreadCount, notificationSound]);

    const handleLogout = async () => {
        try { await updateStatus('offline'); } catch { }
        localStorage.clear();
        window.location.href = '/';
    };

    const toggleExpand = (id: number, depth: number) => {
        const next = new Set(expandedIds);
        if (!next.has(id)) {
            next.add(id);
            axios.post('http://127.0.0.1:8000/api/research/log_interaction/', { event_type: 'task_expanded', task_id: id, depth_level: depth }).catch(() => { });
        } else { next.delete(id); }
        setExpandedIds(next);
    };

    const handleTaskClick = async (task: TaskData) => {
        setSelectedTaskId(task.id);
        setViewMode('detail');
        const a = ((task.assignments as Assignment[]) || []).find(a => a.user.username === currentUser);
        if (a && !a.is_read) {
            try { await axios.post(`http://127.0.0.1:8000/api/tasks/${task.id}/mark_as_read/`, {}); fetchTasks(); } catch { }
        }
    };

    const handleAddSubtask = (e: React.MouseEvent, parentId: number) => {
        e.stopPropagation();
        setInitialParentId(parentId);
        setViewMode('create');
        axios.post('http://127.0.0.1:8000/api/research/log_interaction/', { event_type: 'subtask_initiated', task_id: parentId }).catch(() => { });
    };

    const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
    const nonPipelineCount = tasks.filter(t => !t.is_pipeline_task).length;

    const renderTree = (parentId: number | null = null, depth = 0): React.ReactNode => {
        const items = tasks.filter(t => t.parent_task === parentId && !t.is_pipeline_task);
        if (items.length === 0) return null;
        return items.map(task => {
            const hasChildren = tasks.some(t => t.parent_task === task.id && !t.is_pipeline_task);
            const isExpanded = expandedIds.has(task.id);
            const isSelected = selectedTaskId === task.id;
            const pc = priorityColors(task.priority || 'normal');
            const hasUnread = ((task.assignments as Assignment[]) || []).some(a => a.user.username === currentUser && !a.is_read);

            return (
                <div key={task.id}>
                    <div
                        className="task-row"
                        onClick={() => handleTaskClick(task)}
                        style={{
                            display: 'flex', alignItems: 'center', minHeight: 44,
                            paddingLeft: 16 + depth * 24, paddingRight: 12,
                            paddingTop: 6, paddingBottom: 6, cursor: 'pointer',
                            borderLeft: isSelected ? '3px solid #1976D2' : '3px solid transparent',
                            backgroundColor: isSelected ? 'rgba(25,118,210,0.06)' : 'transparent',
                            borderBottom: '1px solid #F5F6F8', transition: 'background 0.15s', position: 'relative' as const
                        }}
                    >
                        <div onClick={e => { e.stopPropagation(); toggleExpand(task.id, depth); }} style={{ width: 20, marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BDBDBD', flexShrink: 0 }}>
                            {hasChildren
                                ? (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)
                                : <div style={{ width: 5, height: 5, borderRadius: '50%', background: depth === 0 ? '#CFD8DC' : '#ECEFF1' }} />
                            }
                        </div>

                        {hasUnread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E91E63', flexShrink: 0, marginRight: 6 }} />}

                        <span style={{
                            flex: 1, fontSize: depth === 0 ? '0.88rem' : '0.83rem',
                            fontWeight: depth === 0 ? 600 : 400,
                            color: task.status === 'completed' ? '#BDBDBD' : '#1A1A2E',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                            lineHeight: 1.4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const
                        }}>
                            {task.title}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <button className="subtask-btn" onClick={e => handleAddSubtask(e, task.id)} style={{
                                opacity: 0, transition: 'opacity 0.15s', background: 'transparent',
                                color: '#1976D2', border: '1px solid #1976D2', borderRadius: 4,
                                padding: '2px 7px', fontSize: '0.65rem', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontWeight: 600
                            }}>
                                + Alt Görev
                            </button>
                            {task.priority === 'urgent' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>
                                    🔴 Acil
                                </span>
                            )}
                            {task.status !== 'active' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: statusColors(task.status).bg, color: statusColors(task.status).color, border: `1px solid ${statusColors(task.status).border}` }}>
                                    {statusLabel(task.status)}
                                </span>
                            )}
                        </div>
                    </div>
                    {isExpanded && renderTree(task.id, depth + 1)}
                </div>
            );
        });
    };

    const rightPanel = () => {
        if (viewMode === 'pipeline') return (
            <div style={{ height: '100%', overflowY: 'auto' }} className="kanban-pipeline-wrapper">
                <PipelinePanel token={token} currentUser={currentUser} onSurveyTrigger={() => setShowSurvey(true)} />
            </div>
        );
        if (viewMode === 'create') return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF0F3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: '#9E9E9E', marginBottom: 2 }}>
                            {initialParentId ? 'Alt Görev' : 'Yeni'}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1A1A2E' }}>
                            {initialParentId ? 'Alt Görev Oluştur' : 'Görev Oluştur'}
                        </div>
                    </div>
                    <button onClick={() => setViewMode('detail')} style={{ background: '#F5F5F5', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#757575' }}>
                        <X size={14} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <CreateTaskForm colleagues={colleagues} token={token} onTaskCreated={() => { fetchTasks(); setViewMode('detail'); }} currentUser={currentUser} initialParentTask={initialParentId} />
                </div>
            </div>
        );
        if (selectedTask) return (
            <TaskDetail task={selectedTask} currentUser={currentUser} onUpdate={fetchTasks} onClose={() => setSelectedTaskId(null)} />
        );
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#BDBDBD', gap: 14, padding: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LayoutDashboard size={28} color="#E0E0E0" />
                </div>
                <div style={{ textAlign: 'center' as const }}>
                    <div style={{ fontSize: '0.9rem', color: '#9E9E9E', fontWeight: 500, marginBottom: 4 }}>Bir görev seçin</div>
                    <div style={{ fontSize: '0.75rem', color: '#BDBDBD' }}>Sol panelden göreve tıklayın</div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: '#F8F9FA' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
                .task-row:hover { background: rgba(25,118,210,0.04) !important; }
                .task-row:hover .subtask-btn { opacity: 1 !important; }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #BDBDBD; }
                .kanban-pipeline-wrapper > div { background: #ffffff !important; color: #212121 !important; }
                .kanban-pipeline-wrapper h2 { color: #1976D2 !important; }
                .kanban-pipeline-wrapper h4 { color: #212121 !important; }
                .kanban-pipeline-wrapper p { color: #616161 !important; }
                .kanban-pipeline-wrapper span { color: #212121 !important; }
                .kanban-pipeline-wrapper .stage-card { background: #F8F9FA !important; border-color: #E0E0E0 !important; }
                .kanban-pipeline-wrapper .stage-card.current { background: #E3F2FD !important; border-color: #1976D2 !important; box-shadow: 0 0 16px rgba(25,118,210,0.12) !important; }
                .kanban-pipeline-wrapper .progress-bar-container { background: #E0E0E0 !important; }
                .kanban-pipeline-wrapper .progress-bar-fill { background: #1976D2 !important; box-shadow: none !important; }
                .kanban-pipeline-wrapper .glow-btn { border-color: #1976D2 !important; color: #1976D2 !important; background: transparent !important; }
                .kanban-pipeline-wrapper .glow-btn:hover:not(:disabled) { background: rgba(25,118,210,0.08) !important; box-shadow: 0 0 12px rgba(25,118,210,0.2) !important; }
            `}</style>

            {/* TOP BAR */}
            <header style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #EEF0F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #1976D2, #42A5F5)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LayoutDashboard size={15} color="white" />
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1A1A2E' }}>TaskNetwork</span>
                    </div>
                    <div style={{ width: 1, height: 20, background: '#EEF0F3' }} />
                    <DeadlineTimer token={token} />
                </div>

                {!showSurvey && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => { setInitialParentId(null); setViewMode('create'); }} style={{ background: '#1976D2', color: 'white', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Plus size={15} /> Yeni Görev
                        </button>
                        <button onClick={() => setViewMode(v => v === 'pipeline' ? 'detail' : 'pipeline')} style={{ background: viewMode === 'pipeline' ? '#E3F2FD' : 'white', color: '#1976D2', border: '1px solid #BBDEFB', borderRadius: 7, padding: '7px 14px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <BarChart3 size={15} /> Sunum Süreci
                        </button>

                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setIsNotifOpen(v => !v)} style={{ background: isNotifOpen ? '#F5F5F5' : 'white', border: '1px solid #EEF0F3', borderRadius: 7, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' as const, color: '#616161' }}>
                                <Bell size={17} />
                                {unreadCount > 0 && (
                                    <span style={{ position: 'absolute', top: -4, right: -4, background: '#E91E63', color: 'white', fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            <div style={{ position: 'absolute' as const, right: 0, top: 44, width: 320, zIndex: 1000, display: isNotifOpen ? 'block' : 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', borderRadius: 10, overflow: 'hidden' }}>
                                {/* @ts-ignore */}
                                <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} notifications={notifications} fetchNotifications={fetchNotifications} />
                            </div>
                        </div>

                        <button onClick={handleLogout} style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 7, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#D32F2F' }}>
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </header>

            {/* MAIN */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* LEFT */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EEF0F3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', minHeight: '100%' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F6F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1976D2' }} />
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1A1A2E' }}>Görev Ağacı</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9E9E9E', background: '#F5F5F5', padding: '3px 10px', borderRadius: 20 }}>
                                {nonPipelineCount} görev
                            </span>
                        </div>
                        <div style={{ padding: '6px 0' }}>
                            {nonPipelineCount === 0
                                ? <div style={{ padding: '48px 24px', textAlign: 'center' as const, color: '#BDBDBD', fontSize: '0.85rem' }}>Henüz görev yok. Yeni Görev ile başlayın!</div>
                                : renderTree(null)
                            }
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div style={{ width: 380, background: 'white', borderLeft: '1px solid #EEF0F3', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0, boxShadow: '-2px 0 12px rgba(0,0,0,0.03)' }}>
                    {rightPanel()}
                </div>
            </div>

            {/* @ts-ignore */}
            <SurveyModal isOpen={showSurvey} token={token} sessionId={localStorage.getItem('session_id')} />
        </div>
    );
}
