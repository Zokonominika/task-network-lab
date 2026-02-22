import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Clock, CalendarDays, Lock } from 'lucide-react';
import type { TaskData } from '../types';

// Memo'yu kaldırdık, artık doğrudan bileşeni export ediyoruz.
const CyberNode = ({ data }: NodeProps<{ fullData: TaskData }>) => {
    // Veri güvenliği: Eğer data veya fullData yoksa boş obje döndür (Crash önleyici)
    const task = data?.fullData || {} as TaskData;
    
    // 1. ZAMANLAYICI
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 60000); 
        return () => clearInterval(interval);
    }, []);

    // --- RENKLER ---
    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'urgent': return '#ff4444';
            case 'normal': return '#2196F3';
            case 'low': return '#4CAF50';
            default: return '#888';
        }
    };
    
    const getPriorityLabel = (p: string) => {
        switch (p) {
            case 'urgent': return 'ACİL';
            case 'normal': return 'NORMAL';
            case 'low': return 'DÜŞÜK';
            default: return '';
        }
    };

    const priorityColor = getPriorityColor(task.priority || 'normal');

    // --- İLERLEME ---
    const totalAssignees = task.assignments?.length || 0;
    const completedCount = task.assignments?.filter(a => a.is_completed).length || 0;
    const progressPercent = totalAssignees > 0 ? (completedCount / totalAssignees) * 100 : 0;

    // --- SÜRE KONTROLÜ ---
    const isUrgentTime = task.due_date ? (new Date(task.due_date).getTime() - now < 24 * 60 * 60 * 1000) : false;
    const isLate = task.due_date ? (new Date(task.due_date).getTime() < now) : false;
    
    const formattedDate = task.due_date 
        ? new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) 
        : 'Tarih Yok';

    return (
        <div 
            className={`cyber-node-wrapper ${isUrgentTime && task.status === 'active' ? 'urgent-pulse' : ''}`}
            style={{
                width: '240px',
                background: 'rgba(30, 30, 30, 0.9)', // Biraz daha opak yaptım, okuma kolaylığı için
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                border: `1px solid ${isLate ? '#ff4444' : '#444'}`,
                overflow: 'hidden',
                // transition: 'transform...' SATIRINI SİLDİM. React Flow ile çakışır.
                cursor: 'grab', // 'pointer' yerine 'grab' daha doğru
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                position: 'relative'
            }}
            // Hover efektlerini JS ile değil CSS class ile yapmak daha performanslıdır ama şimdilik kalsın
            onMouseEnter={(e) => {
                // Sadece gölgeyi değiştiriyoruz, scale yapmıyoruz (koordinatları şaşırtmasın diye)
                e.currentTarget.style.boxShadow = `0 10px 25px -5px ${priorityColor}40`; 
                e.currentTarget.style.borderColor = priorityColor;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                e.currentTarget.style.borderColor = isLate ? '#ff4444' : '#444';
            }}
        >
            {/* SOL PORT */}
            <Handle type="target" position={Position.Left} style={{ background: '#fff', width: 10, height: 10, borderRadius: 3 }} />

            {/* --- HEADER --- */}
            {task.node_data?.is_pinned && (
                <div style={{ position: 'absolute', top: 5, right: 5, color: '#FFD700', zIndex: 10 }}>
                    <Lock size={14} />
                </div>
            )}
            
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)', 
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div title={task.title} style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {task.title || 'Başlıksız Görev'}
                </div>
                
                <div style={{ fontSize: '0.6rem', fontWeight: 'bold', background: priorityColor, color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                    {getPriorityLabel(task.priority || 'normal')}
                </div>
            </div>

            {/* --- BODY --- */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLate ? '#ff6666' : '#aaa', fontSize: '0.75rem' }}>
                    {isLate ? <Clock size={12} /> : <CalendarDays size={12} />}
                    <span>{formattedDate} {isLate ? '(Gecikti!)' : ''}</span>
                </div>

                {/* Kullanıcılar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {(!task.assignments || task.assignments.length === 0) ? (
                        <span style={{fontSize:'0.7rem', color:'#666', fontStyle:'italic'}}>Atama yok</span>
                    ) : (
                        task.assignments.map((assign, index) => {
                            const displayName = assign.user?.display_name || assign.user?.username || '?';
                            return (
                                <div key={index} title={`${displayName}`} style={{
                                    width: 24, height: 24, borderRadius: '50%', background: '#333',
                                    border: assign.is_completed ? '2px solid #4CAF50' : '1px solid #666',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '0.6rem', fontWeight: 'bold', position: 'relative'
                                }}>
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- PROGRESS BAR --- */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px' }}>
                <div style={{ width: '100%', height: '4px', background: '#333', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: progressPercent === 100 ? '#4CAF50' : priorityColor, 
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>

            {/* SAĞ PORT */}
            <Handle type="source" position={Position.Right} style={{ background: '#fff', width: 10, height: 10, borderRadius: 3 }} />
        </div>
    );
};

export default CyberNode;