import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { Info, MessageSquare, Paperclip } from 'lucide-react';
import type { TaskData } from '../types';
import { API_BASE_URL } from '../config';
import TaskDetailInfo from './TaskDetailInfo';
import TaskChat from './TaskChat';
import TaskFileManager from './TaskFileManager';

const getTheme = (theme: 'dark' | 'light') => ({
    bg: theme === 'light' ? '#FFFFFF' : '#1e1e1e',
    bgSecondary: theme === 'light' ? '#F8F9FA' : '#252525',
    bgTertiary: theme === 'light' ? '#F0F0F0' : '#1a1a1a',
    border: theme === 'light' ? '#E0E0E0' : '#333',
    borderAlt: theme === 'light' ? '#E0E0E0' : '#444',
    text: theme === 'light' ? '#212121' : '#eeeeee',
    textSecondary: theme === 'light' ? '#757575' : '#888888',
    input: theme === 'light' ? '#F8F9FA' : '#252525',
    inputText: theme === 'light' ? '#212121' : '#ffffff',
    accent: theme === 'light' ? '#1976D2' : '#00ffff',
    accentGlow: theme === 'light' ? 'rgba(25,118,210,0.15)' : 'rgba(0,255,255,0.1)',
    shadow: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.5)',
});

interface TaskDetailPanelProps {
    task: TaskData;
    currentUser: string;
    token: string | null;
    onUpdate: () => void;
    onClose: () => void;
    theme?: 'dark' | 'light';
}

export default function TaskDetailPanel({ task, currentUser, token, onUpdate, onClose, theme = 'dark' }: TaskDetailPanelProps) {
    if (!task) return null;
    const t = getTheme(theme);
    const [currentTask, setCurrentTask] = useState<TaskData>(task);
    const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'files'>('details');

    useEffect(() => {
        setCurrentTask(task);
    }, [task]);

    const refreshTaskData = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/tasks/${currentTask.id}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setCurrentTask(res.data);
            onUpdate();
        } catch (e) { console.error("Tazeleme hatası", e); }
    }, [currentTask.id, token, onUpdate]);

    const handleMyPartComplete = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/tasks/${currentTask.id}/complete_my_part/`, {}, {
                headers: { 'Authorization': `Token ${token}` }
            });
            await refreshTaskData();
        } catch (e) {
            const err = e as AxiosError;
            if (err.response) alert("Hata: " + JSON.stringify(err.response.data));
            else alert("Hata oluştu!");
        }
    };

    const handleArchiveTask = async () => {
        if (confirm("Tüm ekip tamamladı mı? Görev arşive kaldırılacak.")) {
            try {
                await axios.post(`${API_BASE_URL}/api/tasks/${currentTask.id}/archive_task/`, {}, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                onUpdate(); onClose();
            } catch (e) { console.error(e); alert("Hata oluştu."); }
        }
    };

    const isOverdue = !!(currentTask.due_date && new Date(currentTask.due_date) < new Date() && currentTask.status !== 'completed');
    const isCreator = currentTask.created_by?.username === currentUser;
    const myAssignment = (currentTask.assignments || []).find(a => a.user.username === currentUser);
    const amIAssigned = !!myAssignment;
    const didIFinish = myAssignment?.is_completed;
    const isTaskActive = currentTask.status === 'active';
    const allAssigneesFinished = (currentTask.assignments || []).every(a => a.is_completed);
    const priorityLabels: Record<string, string> = { 'low': 'Az', 'normal': 'Normal', 'urgent': 'Acil' };

    return (
        <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 15, borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
                <button onClick={() => setActiveTab('details')} style={{ flex: 1, padding: '8px', cursor: 'pointer', border: 'none', borderRadius: 6, background: activeTab === 'details' ? t.accentGlow : 'transparent', color: activeTab === 'details' ? t.accent : t.textSecondary, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: '0.2s', borderBottom: activeTab === 'details' ? `2px solid ${t.accent}` : '2px solid transparent' }}>
                    <Info size={15} /> Detaylar
                </button>
                <button onClick={() => setActiveTab('chat')} style={{ flex: 1, padding: '8px', cursor: 'pointer', border: 'none', borderRadius: 6, background: activeTab === 'chat' ? t.accentGlow : 'transparent', color: activeTab === 'chat' ? t.accent : t.textSecondary, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: '0.2s', borderBottom: activeTab === 'chat' ? `2px solid ${t.accent}` : '2px solid transparent' }}>
                    <MessageSquare size={15} /> Sohbet
                </button>
                <button onClick={() => setActiveTab('files')} style={{ flex: 1, padding: '8px', cursor: 'pointer', border: 'none', borderRadius: 6, background: activeTab === 'files' ? t.accentGlow : 'transparent', color: activeTab === 'files' ? t.accent : t.textSecondary, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: '0.2s', borderBottom: activeTab === 'files' ? `2px solid ${t.accent}` : '2px solid transparent' }}>
                    <Paperclip size={15} /> Dosyalar
                    {(currentTask.attachments || []).length > 0 && (
                        <span style={{ background: `${t.accent}22`, color: t.accent, fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8 }}>
                            {(currentTask.attachments || []).length}
                        </span>
                    )}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
                {activeTab === 'details' && (
                    <TaskDetailInfo 
                        currentTask={currentTask} t={t} theme={theme}
                        isOverdue={isOverdue} priorityLabels={priorityLabels}
                        amIAssigned={amIAssigned} didIFinish={didIFinish}
                        isTaskActive={isTaskActive} allAssigneesFinished={allAssigneesFinished}
                        isCreator={isCreator} handleMyPartComplete={handleMyPartComplete}
                        handleArchiveTask={handleArchiveTask}
                    />
                )}
                {activeTab === 'chat' && (
                    <TaskChat 
                        taskId={currentTask.id} token={token} t={t} 
                        isOverdue={isOverdue} status={currentTask.status} 
                    />
                )}
                {activeTab === 'files' && (
                    <TaskFileManager 
                        taskId={currentTask.id} attachments={currentTask.attachments || []} 
                        token={token} t={t} theme={theme} isOverdue={isOverdue}
                        isCreator={isCreator} amIAssigned={amIAssigned} 
                        didIFinish={didIFinish} onRefresh={refreshTaskData}
                    />
                )}
            </div>
        </>
    );
}