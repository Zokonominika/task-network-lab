import { X, Home, Users, Lock } from 'lucide-react';
import PipelinePanel from './PipelinePanel';
import CreateTaskForm from './CreateTaskForm';
import TaskDetailPanel from './TaskDetailPanel';
import type { ReactFlowInstance } from 'reactflow';
import { useStore } from '../store/useStore';

interface AppSidebarProps {
    rfInstance: ReactFlowInstance | null;
}

export default function AppSidebar({ rfInstance }: AppSidebarProps) {
    const { 
        isSidebarOpen, setIsSidebarOpen, sidebarMode,
        token, currentUser, allTasks, currentTaskData,
        fetchTasks, setShowSurvey 
    } = useStore();

    const sidebarTitle = {
        create: 'Yeni Görev',
        edit: 'Görev Detayı',
        team: 'Grup Üyeleri',
        settings: 'Ayarlar',
        pipeline: 'Sunum Süreci',
        network: 'Görev İstasyonu',
        list: 'Görev Listesi'
    }[sidebarMode];

    return (
        <div style={{
            position: 'absolute', top: 0,
            right: isSidebarOpen ? 0 : '-450px',
            width: '400px', height: '100%',
            background: '#1e1e1e', borderLeft: '1px solid #333', zIndex: 10, padding: '25px',
            display: 'flex', flexDirection: 'column', gap: '15px', color: 'white',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.8)', overflowY: 'auto', paddingBottom: '80px',
            transition: 'right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: 15 }}>
                <h3 style={{ margin: 0 }}>{sidebarTitle}</h3>
                <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            {sidebarMode === 'pipeline' && (
                <PipelinePanel 
                    token={token} 
                    currentUser={currentUser} 
                    onSurveyTrigger={() => setShowSurvey(true)} 
                />
            )}
            
            {sidebarMode === 'create' && (
                <CreateTaskForm />
            )}
            
            {sidebarMode === 'edit' && currentTaskData && (
                <TaskDetailPanel 
                    task={currentTaskData} 
                    currentUser={currentUser} 
                    token={token} 
                    onUpdate={fetchTasks} 
                    onClose={() => setIsSidebarOpen(false)} 
                />
            )}
            
            {sidebarMode === 'network' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '15px', overflow: 'hidden' }}>
                    <div style={{
                        padding: '15px',
                        background: 'linear-gradient(135deg, #1e1e1e 0%, #252525 100%)',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(0, 243, 255, 0.3)'
                        }}>
                            <Home size={20} className="spin-slow" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>Görev İstasyonu</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                Aktif Görev Sayısı: <span style={{ color: '#00f3ff' }}>
                                    {allTasks.filter(t => {
                                        const isActive = t.status === 'active';
                                        const isInSpace = t.node_data?.position_x !== 0 || t.node_data?.position_y !== 0;
                                        const myAssign = t.assignments?.find(a => a.user.username === currentUser);
                                        if (myAssign && (myAssign.is_failed || myAssign.is_completed)) return false;
                                        return isActive && isInSpace;
                                    }).length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {allTasks
                                .filter(t => {
                                    const isActive = t.status === 'active';
                                    const isInSpace = t.node_data?.position_x !== 0 || t.node_data?.position_y !== 0;
                                    if (!isActive || !isInSpace) return false;
                                    const myAssign = t.assignments?.find(a => a.user.username === currentUser);
                                    if (myAssign && (myAssign.is_failed || myAssign.is_completed)) return false;
                                    return true;
                                })
                                .map(task => {
                                    const pColor = task.priority === 'urgent' ? '#ff4444' : task.priority === 'normal' ? '#2196F3' : '#4CAF50';
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => {
                                                const x = task.node_data?.position_x || 0;
                                                const y = task.node_data?.position_y || 0;
                                                const centerX = x + 120;
                                                const centerY = y + 80;
                                                rfInstance?.setCenter(centerX, centerY, { zoom: 1.2, duration: 1000 });
                                            }}
                                            style={{
                                                background: '#252525',
                                                borderLeft: `4px solid ${pColor}`,
                                                borderTop: '1px solid #333',
                                                borderRight: '1px solid #333',
                                                borderBottom: '1px solid #333',
                                                borderRadius: '6px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                position: 'relative',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateX(5px)';
                                                e.currentTarget.style.background = '#2a2a2a';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateX(0)';
                                                e.currentTarget.style.background = '#252525';
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#eee' }}>
                                                    {task.title}
                                                </span>
                                                <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: '#aaa' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        <Users size={10} /> {task.assignments?.length || 0}
                                                    </span>
                                                    {task.node_data?.is_pinned && (
                                                        <span style={{ color: '#FFD700', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <Lock size={10} /> Sabit
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '50%',
                                                width: 24, height: 24,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: pColor
                                            }}>
                                                ➜
                                            </div>
                                        </div>
                                    );
                                })}

                            {allTasks.filter(t => t.status === 'active' && (t.node_data?.position_x !== 0)).length === 0 && (
                                <div style={{ textAlign: 'center', padding: 20, color: '#666', fontStyle: 'italic' }}>
                                    Uzay boşluğunda aktif görev yok.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
