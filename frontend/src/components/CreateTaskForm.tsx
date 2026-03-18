import { useState, type ChangeEvent } from 'react';
import { Paperclip, Save, File, ChevronRight } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config';
import { useStore } from '../store/useStore';
import type { UserData } from '../types';

interface CreateTaskFormProps {
    theme?: 'dark' | 'light';
    colleagues?: UserData[];
    token?: string | null;
    onTaskCreated?: () => void;
    currentUser?: string;
    initialParentTask?: number | null;
}

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

export default function CreateTaskForm({ 
    theme = 'dark',
    colleagues: propsColleagues,
    token: propsToken,
    onTaskCreated,
    currentUser: propsCurrentUser,
    initialParentTask = null
}: CreateTaskFormProps) {
    const store = useStore();
    
    // Choose between props and store
    const colleagues = propsColleagues || store.colleagues;
    const token = propsToken || store.token;
    const currentUser = propsCurrentUser || store.currentUser;
    const { fetchTasks, newTaskPos, setIsSidebarOpen } = store;
    
    const t = getTheme(theme);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [taskPriority, setTaskPriority] = useState("normal");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [createFiles, setCreateFiles] = useState<{ id: number, file: File }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState(1);

    const priorityLabels: Record<string, string> = { 'low': 'Az', 'normal': 'Normal', 'urgent': 'Acil' };
    const assignableColleagues = colleagues.filter((c: UserData) => c.username !== currentUser);

    const handleSaveTask = async () => {
        if (!taskTitle) return alert("Başlık girin!");
        setUploading(true);

        const payload = {
            title: taskTitle,
            description: taskDesc,
            priority: taskPriority,
            due_date: taskDueDate || null,
            assignee_ids: selectedAssignees.map((id: string) => parseInt(id)),
            position_x: newTaskPos ? newTaskPos.x : 0,
            position_y: newTaskPos ? newTaskPos.y : 0,
            parent_task: initialParentTask
        };

        try {
            const res = await axios.post(`${API_BASE_URL}/api/tasks/`, payload, { 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` } 
            });

            const newTaskId = res.data.id;
            if (createFiles.length > 0) {
                for (const { file } of createFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('file_type', 'instruction');
                    await axios.post(`${API_BASE_URL}/api/tasks/${newTaskId}/upload_file/`, formData, { 
                        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Token ${token}` } 
                    });
                }
            }

            if (onTaskCreated) {
                onTaskCreated();
            } else {
                fetchTasks();
                setIsSidebarOpen(false);
            }
            setTaskTitle(""); setTaskDesc(""); setCreateFiles([]); setSelectedAssignees([]); setTaskDueDate("");
        } catch (err: unknown) {
            console.error("Hata Detayı:", err);
            let errorMsg = "İşlem başarısız! Sunucu hatası.";
            if (err instanceof AxiosError && err.response?.data) {
                const data = err.response.data;
                if (Array.isArray(data)) errorMsg = data.join('\n');
                else if (typeof data === 'object') errorMsg = Object.values(data).flat().join('\n');
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }
            alert(`HATA: ${errorMsg}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: theme === 'light' ? t.bg : '#12121280' }}>
            <div style={{ padding: '20px 0 10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.accent, boxShadow: `0 0 8px ${t.accentGlow}` }} />
                    <div style={{ width: '40px', height: '2px', background: step === 2 ? t.accent : t.border, transition: '0.3s' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: step === 2 ? t.accent : t.border, boxShadow: step === 2 ? `0 0 8px ${t.accentGlow}` : 'none', transition: '0.3s' }} />
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '0.65rem', color: t.textSecondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <span style={{ color: step === 1 ? t.accent : t.textSecondary }}>Detaylar</span>
                    <span style={{ color: step === 2 ? t.accent : t.textSecondary }}>Atama</span>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column' }}>
                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '6px' }}>Başlık</label>
                            <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '0 12px', color: t.inputText, width: '100%', height: '44px', boxSizing: 'border-box' }} placeholder="Görev başlığı..." />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '6px' }}>Bilgilendirme</label>
                            <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={5} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '12px', color: t.inputText, width: '100%', boxSizing: 'border-box', resize: 'none' }} placeholder="Görev açıklaması..." />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '6px' }}>Son Teslim Tarihi</label>
                            <input type="datetime-local" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '10px 12px', color: t.inputText, width: '100%', boxSizing: 'border-box', colorScheme: theme }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '6px' }}>Dosya Ekle</label>
                            <div style={{ border: `2px dashed ${t.borderAlt}`, borderRadius: '12px', height: '105px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: t.accent, fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0, padding: '6px', borderRadius: '6px', border: `1px dashed ${t.accent}33`, background: `${t.accent}08` }}>
                                    <Paperclip size={14} />
                                    {createFiles.length === 0 ? 'Dosyaları Seç' : `+ Daha Fazla Ekle (${createFiles.length})`}
                                    <input type="file" multiple hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && setCreateFiles((prev) => [...prev, ...Array.from(e.target.files!).map(file => ({ id: Date.now() + Math.random(), file }))])} />
                                </label>
                                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {createFiles.map(({ id, file }) => (
                                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1a1a1a', padding: '6px 10px', borderRadius: '6px', border: '1px solid #222', flexShrink: 0 }}>
                                            <File size={16} color="#888" style={{ flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.8rem', color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                            <button onClick={() => setCreateFiles(prev => prev.filter(f => f.id !== id))} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginBottom: '6px' }}>Detaylar Özeti</div>
                            <div style={{ background: t.bgTertiary, padding: '12px 16px', borderRadius: '10px', borderLeft: `4px solid ${t.accent}` }}>
                                <div style={{ fontSize: '0.9rem', color: t.text, fontWeight: 'bold', marginBottom: '8px' }}>{taskTitle || 'Başlıksız Görev'}</div>
                                {taskDueDate ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', color: t.textSecondary }}>
                                        <span>📅 {new Date(taskDueDate).toLocaleDateString('tr-TR')} 🕐 {new Date(taskDueDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ) : <div style={{ fontSize: '0.75rem', color: t.textSecondary, fontStyle: 'italic' }}>Tarih belirtilmedi</div>}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '12px' }}>Öncelik Durumu</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['low', 'normal', 'urgent'].map(p => (
                                    <button key={p} onClick={() => setTaskPriority(p)} style={{ flex: 1, padding: '14px', borderRadius: '8px', cursor: 'pointer', color: taskPriority === p ? (p === 'urgent' ? '#ff4444' : p === 'normal' ? '#2196F3' : '#4CAF50') : t.textSecondary, fontSize: '0.9rem', background: taskPriority === p ? (p === 'urgent' ? 'rgba(255,68,68,0.1)' : p === 'normal' ? 'rgba(33,150,243,0.1)' : 'rgba(76,175,80,0.1)') : t.bgTertiary, border: taskPriority === p ? `1px solid ${p === 'urgent' ? '#ff4444' : p === 'normal' ? '#2196F3' : '#4CAF50'}` : `1px solid ${t.border}` }}>
                                        {priorityLabels[p]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '6px' }}>Atanabilir Kişiler ({selectedAssignees.length})</label>
                            <div style={{ background: t.bgTertiary, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', height: '205px', overflowY: 'auto' }}>
                                {assignableColleagues.map((user: UserData) => {
                                    const isSelected = selectedAssignees.includes(user.id.toString());
                                    return (
                                        <div key={user.id} onClick={() => setSelectedAssignees(prev => prev.includes(user.id.toString()) ? prev.filter(id => id !== user.id.toString()) : [...prev, user.id.toString()])} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: isSelected ? t.accentGlow : t.bgTertiary, borderBottom: `1px solid ${t.border}` }}>
                                            <span style={{ fontSize: '0.9rem', color: isSelected ? t.text : t.textSecondary }}>{user.first_name || user.username}</span>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: isSelected ? `2px solid ${t.accent}` : `2px solid ${t.borderAlt}`, background: isSelected ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {isSelected && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ flexShrink: 0, padding: '15px 20px', background: t.bgSecondary, borderTop: `1px solid ${t.border}`, display: 'flex', gap: '12px' }}>
                {step === 1 ? (
                    <button onClick={() => taskTitle ? setStep(2) : alert("Başlık girin!")} style={{ flex: 1, background: t.accent, border: 'none', padding: '14px', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Devam <ChevronRight size={20} />
                    </button>
                ) : (
                    <>
                        <button onClick={() => setStep(1)} style={{ flex: 0.4, background: t.borderAlt, border: 'none', padding: '14px', color: t.text, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Geri</button>
                        <button onClick={handleSaveTask} disabled={uploading} style={{ flex: 1, background: t.accent, border: 'none', padding: '14px', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: uploading ? 0.7 : 1 }}>
                            <Save size={20} /> {uploading ? 'Oluşturuluyor...' : 'Görevi Başlat'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
