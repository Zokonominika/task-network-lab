import { useStore } from '../store/useStore';

export default function InboxDrawer() {
    const { 
        allTasks, currentUser, isInboxOpen, setIsInboxOpen, showSurvey 
    } = useStore();

    if (showSurvey) return null;

    const inboxTasks = allTasks.filter(t =>
        t.node_data?.position_x === 0 &&
        t.node_data?.position_y === 0 &&
        t.status !== 'completed' &&
        t.status !== 'failed' &&
        t.created_by.username !== currentUser
    );

    return (
        <>
            {/* 1. KULP (BUTTON) */}
            <div
                onClick={() => setIsInboxOpen(!isInboxOpen)}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 20,
                    width: '400px',
                    height: '40px',
                    background: '#1e1e1e',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    border: '1px solid #333',
                    borderBottom: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px',
                    cursor: 'pointer',
                    zIndex: 40,
                    color: '#ddd',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: '0 -5px 20px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>📥 Gelen Kutusu</span>
                    {inboxTasks.length > 0 && (
                        <span style={{ background: '#E91E63', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10 }}>
                            {inboxTasks.length}
                        </span>
                    )}
                </div>
                <span>{isInboxOpen ? '▼' : '▲'}</span>
            </div>

            {/* 2. ÇEKMECE (PANEL) */}
            <div style={{
                position: 'absolute',
                bottom: 40,
                left: 20,
                width: '400px',
                height: isInboxOpen ? '50vh' : '0px',
                transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                background: '#1e1e1e',
                borderLeft: '1px solid #333',
                borderRight: '1px solid #333',
                borderTop: isInboxOpen ? '1px solid #333' : 'none',
                overflow: 'hidden',
                zIndex: 39,
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: 15, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {inboxTasks.length === 0 ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
                            Yeni görev yok. Uzay temiz! 🚀
                        </div>
                    ) : (
                        inboxTasks.map(task => (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(event) => {
                                    event.dataTransfer.setData('application/reactflow', task.id.toString());
                                    event.dataTransfer.effectAllowed = 'move';
                                }}
                                style={{
                                    background: '#252525',
                                    padding: 15,
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    cursor: 'grab',
                                    display: 'flex', flexDirection: 'column', gap: 5
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#555'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                            >
                                <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>{task.title}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#aaa' }}>
                                    <span>{task.priority === 'urgent' ? '🔴 Acil' : '⚪ Normal'}</span>
                                    <span style={{ color: '#E91E63' }}>Uzaya Sürükle ↝</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
