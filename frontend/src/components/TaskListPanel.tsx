import type { ReactNode } from 'react';
import { Clock, AlertCircle, PlayCircle, Archive, User } from 'lucide-react'; // CheckCircle ve ArrowRight kaldırıldı
import type { TaskData } from '../types';

interface TaskListPanelProps {
    currentUser: string;
    allTasks: TaskData[];
    onTaskClick: (task: TaskData) => void;
}

// --- YARDIMCI BİLEŞEN (DIŞARI ALINDI) ---
// Bu bileşeni ana fonksiyonun DIŞINA taşıdık.
const TaskSection = ({ title, icon, tasks, color, onTaskClick }: { 
    title: string, 
    icon: ReactNode, 
    tasks: TaskData[], 
    color: string,
    onTaskClick: (task: TaskData) => void 
}) => (
    <div style={{
        flex: 1, // Kalan alanı 3 kardeş eşit paylaşsın
        display: 'flex', 
        flexDirection: 'column',
        background: '#252525', // Kutu Rengi
        borderRadius: 12,
        overflow: 'hidden', // Taşanı gizle
        border: '1px solid #333',
        minHeight: 0 // Flexbox scroll fix
    }}>
        {/* KUTU BAŞLIĞI */}
        <div style={{
            padding: '12px 15px', 
            background: 'rgba(0,0,0,0.2)', 
            borderBottom:'1px solid #333',
            display:'flex', alignItems:'center', gap:8,
            color: color, fontWeight:'bold', fontSize:'0.9rem'
        }}>
            {icon} {title} 
            <span style={{marginLeft:'auto', background:'#333', color:'white', padding:'2px 8px', borderRadius:10, fontSize:'0.7rem'}}>
                {tasks.length}
            </span>
        </div>

        {/* KUTU İÇERİĞİ */}
        <div style={{
            flex: 1, 
            overflowY: 'auto', 
            padding: 10,
            display: 'flex', flexDirection: 'column', gap: 8
        }}>
            {tasks.length === 0 ? (
                <div style={{textAlign:'center', color:'#666', fontSize:'0.8rem', marginTop:20}}>Liste boş</div>
            ) : (
                tasks.map(task => {
                    const priorityColor = task.priority === 'urgent' ? '#ff4444' : task.priority === 'normal' ? '#2196F3' : '#4CAF50';
                    // isMyTask kullanılmıyordu, sildim.
                    
                    return (
                        <div key={task.id} 
                            onClick={() => onTaskClick(task)}
                            style={{
                                background: '#1e1e1e', padding: '10px', borderRadius: 6, cursor: 'pointer',
                                borderLeft: `3px solid ${priorityColor}`,
                                display:'flex', flexDirection:'column', gap:4,
                                transition: '0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#1e1e1e'}
                        >
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9rem', color:'white', fontWeight:500}}>
                                <span>{task.title}</span>
                            </div>
                            
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.75rem', color:'#888'}}>
                                <span style={{display:'flex', alignItems:'center', gap:4}}>
                                    <User size={10}/> {task.created_by.username}
                                </span>
                                {task.due_date && (
                                    <span style={{color: priorityColor, display:'flex', alignItems:'center', gap:4}}>
                                        <Clock size={10}/> 
                                        {new Date(task.due_date).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    </div>
);

// --- ANA BİLEŞEN ---
export default function TaskListPanel({ currentUser, allTasks, onTaskClick }: TaskListPanelProps) {
    
    // 1. GÖREVLERİ KATEGORİZE ET
    const myCreatedTasks = allTasks.filter(t => 
        t.created_by.username === currentUser && t.status !== 'completed'
    );

    const myAssignedTasks = allTasks.filter(t => 
        t.status !== 'completed' && 
        t.assignments.some(a => a.user.username === currentUser)
    );

    const archivedTasks = allTasks.filter(t => 
        t.status === 'completed' && (
            t.created_by.username === currentUser || 
            t.assignments.some(a => a.user.username === currentUser)
        )
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%', 
            marginTop: '20px',  
            paddingBottom: '50px',
            gap: '15px', 
            overflow: 'hidden' 
        }}>
            {/* 1. KUTU: OLUŞTURDUKLARIM */}
            <TaskSection 
                title="Oluşturduklarım" 
                icon={<PlayCircle size={16}/>} 
                tasks={myCreatedTasks} 
                color="#2196F3" 
                onTaskClick={onTaskClick} // Prop olarak geçiyoruz
            />

            {/* 2. KUTU: BANA ATANANLAR */}
            <TaskSection 
                title="Aktif Görevlerim" 
                icon={<AlertCircle size={16}/>} 
                tasks={myAssignedTasks} 
                color="#ff9800" 
                onTaskClick={onTaskClick}
            />

            {/* 3. KUTU: ARŞİV */}
            <TaskSection 
                title="Arşiv / Tamamlanan" 
                icon={<Archive size={16}/>} 
                tasks={archivedTasks} 
                color="#4CAF50" 
                onTaskClick={onTaskClick}
            />
        </div>
    );
}