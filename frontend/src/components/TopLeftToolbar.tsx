import { Home, Plus, TrendingUp, LogOut } from 'lucide-react';
import DeadlineTimer from './DeadlineTimer';
import type { ReactFlowInstance } from 'reactflow';
import { useStore } from '../store/useStore';

interface TopLeftToolbarProps {
    rfInstance: ReactFlowInstance | null;
}

export default function TopLeftToolbar({ rfInstance }: TopLeftToolbarProps) {
    const { 
        token, sidebarMode, isSidebarOpen, setSidebarMode, 
        setIsSidebarOpen, setNewTaskPos, setIsNotifOpen,
        setIsInboxOpen, logout 
    } = useStore();

    const roundButtonStyle: React.CSSProperties = { 
        width: 40, height: 40, borderRadius: '50%', background: '#333', 
        border: '1px solid #555', color: 'white', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
        transition: '0.2s' 
    };

    return (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 5, display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white', marginRight: 10 }}>TaskNetwork</h2>
                <DeadlineTimer token={token} />
            </div>
            
            <button 
                onClick={() => { rfInstance?.setCenter(0, 0, { zoom: 1, duration: 500 }); }} 
                title="Merkeze Dön" 
                style={{ ...roundButtonStyle, background: '#333' }}
            >
                <Home size={20} />
            </button>

            <button 
                onClick={() => { 
                    setSidebarMode('create'); 
                    setIsSidebarOpen(true); 
                    setNewTaskPos(null); 
                    setIsNotifOpen(false);
                    setIsInboxOpen(false);
                }} 
                title="Yeni Görev" 
                style={{ ...roundButtonStyle, background: sidebarMode === 'create' && isSidebarOpen ? '#4CAF50' : '#333' }}
            >
                <Plus size={20} />
            </button>

            <button 
                onClick={() => { 
                    setSidebarMode('pipeline'); 
                    setIsSidebarOpen(true); 
                    setIsNotifOpen(false);
                    setIsInboxOpen(false);
                }} 
                title="Sunum Süreci" 
                style={{ 
                    ...roundButtonStyle, 
                    background: sidebarMode === 'pipeline' && isSidebarOpen ? '#00ffff' : '#333', 
                    color: sidebarMode === 'pipeline' && isSidebarOpen ? '#000' : '#fff' 
                }}
            >
                <TrendingUp size={20} />
            </button>

            <button 
                onClick={logout} 
                title="Çıkış Yap" 
                style={{ ...roundButtonStyle, background: '#330000', border: '1px solid #550000', color: '#ff4444' }}
            >
                <LogOut size={20} />
            </button>
        </div>
    );
}
