import { Clock, User as UserIcon, ShieldAlert, CheckCircle, CheckSquare, Loader } from 'lucide-react';
import type { TaskData } from '../types';

interface TaskDetailInfoProps {
    currentTask: TaskData;
    t: any;
    theme: string;
    isOverdue: boolean | null;
    priorityLabels: Record<string, string>;
    amIAssigned: boolean;
    didIFinish: boolean | undefined;
    isTaskActive: boolean;
    allAssigneesFinished: boolean;
    isCreator: boolean;
    handleMyPartComplete: () => void;
    handleArchiveTask: () => void;
}

export default function TaskDetailInfo({
    currentTask, t, theme, isOverdue, priorityLabels,
    amIAssigned, didIFinish, isTaskActive, allAssigneesFinished,
    isCreator, handleMyPartComplete, handleArchiveTask
}: TaskDetailInfoProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '98%', overflowY: 'hidden', paddingRight: 5, paddingBottom: '10px' }}>
            {/* Atayan */}
            <div style={{ background: t.bgSecondary, padding: 10, borderRadius: 5, borderLeft: '3px solid #ff0072', fontSize: '0.85rem' }}>
                <span style={{ color: t.textSecondary }}>Görevi Oluşturan:</span> <strong style={{ color: t.text }}>{currentTask.created_by?.first_name || currentTask.created_by?.username}</strong>
            </div>

            {/* Tarih ve Öncelik */}
            <div>
                <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: '6px' }}>
                    Teslim Tarihi
                    {isOverdue && <span style={{ marginLeft: 8, fontSize: '0.65rem', background: '#ff4444', color: 'white', padding: '1px 5px', borderRadius: 3, fontWeight: 'bold' }}>⚠️ SÜRE DOLDU</span>}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Clock size={16} style={{ position: 'absolute', left: 10, color: isOverdue ? '#ff4444' : t.textSecondary, zIndex: 2 }} />
                    <input
                        type="text"
                        value={currentTask.due_date
                            ? `${new Date(currentTask.due_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${new Date(currentTask.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                            : 'Belirtilmedi'}
                        disabled
                        style={{ background: t.bgTertiary, border: isOverdue ? '1px solid #ff4444' : `1px solid ${t.border}`, borderRadius: 8, padding: '10px 90px 10px 34px', color: isOverdue ? '#ff4444' : t.text, width: '100%', boxSizing: 'border-box' as const }}
                    />
                    <div style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold',
                        color: currentTask.priority === 'urgent' ? '#ff4444' : currentTask.priority === 'low' ? '#4CAF50' : '#2196F3',
                        background: currentTask.priority === 'urgent' ? 'rgba(255,68,68,0.1)' : currentTask.priority === 'low' ? 'rgba(76,175,80,0.1)' : 'rgba(33,150,243,0.1)',
                        border: `1px solid ${currentTask.priority === 'urgent' ? '#ff444444' : currentTask.priority === 'low' ? '#4CAF5044' : '#2196F344'}`
                    }}>
                        {priorityLabels[currentTask.priority]}
                    </div>
                </div>
            </div>

            {/* Bilgilendirme Kutusu */}
            <div>
                <label style={{ fontSize: '0.8rem', color: t.textSecondary, display: 'block', marginBottom: 5 }}>Bilgilendirme</label>
                <div style={{
                    width: '100%',
                    padding: '10px',
                    background: theme === 'light' ? t.bgTertiary : '#1a1a1a81',
                    border: `1px solid ${t.border}`,
                    color: t.text,
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word'
                }}>
                    {currentTask.description || <span style={{ color: t.textSecondary, fontStyle: 'italic' }}>Bilgilendirme girilmemiş.</span>}
                </div>
            </div>

            {/* Öğrenci Durumu */}
            <div>
                <label style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'block', marginBottom: 6 }}>Öğrenci Durumu</label>
                <div style={{ background: t.bgTertiary, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                        {(currentTask.assignments || []).length > 0 ? (
                            (currentTask.assignments || []).map((a: any) => {
                                const isUserLate = a.is_failed || (!a.is_completed && (isOverdue || currentTask.status === 'completed'));
                                return (
                                    <div key={a.id} style={{
                                        fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: t.bgSecondary, padding: '8px 12px', borderRadius: 6,
                                        borderLeft: isUserLate ? '3px solid #ff4444' : (a.is_completed ? '3px solid #4CAF50' : `3px solid ${t.borderAlt}`),
                                        borderBottom: `1px solid ${t.border}`,
                                        flexShrink: 0
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.text }}>
                                            <UserIcon size={14} color={t.textSecondary} />
                                            {a.user?.first_name || a.user?.username || 'Bilinmiyor'}
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: a.user?.status === 'online' ? '#4CAF50' : a.user?.status === 'busy' ? '#ff4444' : a.user?.status === 'away' ? '#FFD700' : t.textSecondary,
                                            }}>
                                                {a.user?.status === 'online' ? '● Çevrimiçi' : a.user?.status === 'busy' ? '● Meşgul' : a.user?.status === 'away' ? '● Uzakta' : '● Çevrimdışı'}
                                            </span>
                                            {isUserLate && <span style={{ color: '#ff4444', fontSize: '0.7rem', fontWeight: 'bold' }}>(Tamamlanmadı)</span>}
                                        </span>
                                        <span style={{ color: a.is_completed ? '#4CAF50' : (isUserLate ? '#ff4444' : '#ff9800'), fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {a.is_completed ? 'Tamamladı' : (isUserLate ? 'Başarısız' : 'Çalışıyor...')}
                                            {isUserLate ? <ShieldAlert size={14} /> : (a.is_completed ? <CheckCircle size={14} /> : null)}
                                        </span>
                                    </div>
                                )
                            })
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textSecondary, fontSize: '0.8rem', fontStyle: 'italic' }}>
                                Henüz öğrenci atanmamış.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Aksiyon Butonları */}
            {(amIAssigned || isCreator) && (
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, paddingBottom: 25 }}>
                    {amIAssigned && !didIFinish && isTaskActive && !isOverdue && (
                        <button
                            onClick={handleMyPartComplete}
                            style={{
                                background: '#4CAF50', border: 'none', padding: '12.5px', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.9rem',
                                boxShadow: `0 -10px 20px ${t.shadow}`
                            }}
                        >
                            <CheckSquare size={18} style={{ marginRight: 5 }} /> Görevi Tamamladım
                        </button>
                    )}
                    {amIAssigned && !didIFinish && isOverdue && (
                        <div style={{ textAlign: 'center', color: '#ff4444', border: '1px solid #ff4444', padding: 10, borderRadius: 5, background: 'rgba(255, 68, 68, 0.1)' }}>
                            ⚠️ Bu görevin süresi doldu, işlem yapamazsınız.
                        </div>
                    )}
                    {amIAssigned && didIFinish && (
                        <div style={{ textAlign: 'center', color: '#4CAF50', border: '1px solid #4CAF50', padding: 10, borderRadius: 5, background: 'rgba(76, 175, 80, 0.1)' }}>Harika! Kendi kısmını tamamladın.</div>
                    )}
                    {isCreator && isTaskActive && (
                        <>
                            {(allAssigneesFinished || isOverdue) ? (
                                <button onClick={handleArchiveTask} style={{ background: isOverdue ? '#ff9800' : '#4CAF50', border: 'none', padding: '12px', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    <CheckCircle size={18} />
                                    {isOverdue ? 'Süre Doldu: Görevi Zorla Kapat' : 'Tüm Ekip Tamamladı: Görevi Kapat'}
                                </button>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 10, color: t.textSecondary, border: `1px dashed ${t.borderAlt}`, borderRadius: 8, fontSize: '0.8rem' }}>
                                    <Loader size={14} style={{ display: 'inline', marginRight: 5, animation: 'spin 2s linear infinite' }} />
                                    Öğrenciler çalışıyor...
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
