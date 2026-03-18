import { Plus, Lock, Unlock } from 'lucide-react';
import { useStore } from '../store/useStore';

interface GraphContextMenuProps {
    menu: { x: number; y: number } | null;
    contextMenuNodeId: string | null;
    handleTogglePin: () => void;
    handleAddNodeFromMenu: () => void;
}

export default function GraphContextMenu({
    menu,
    contextMenuNodeId,
    handleTogglePin,
    handleAddNodeFromMenu
}: GraphContextMenuProps) {
    const { currentTaskData } = useStore();

    if (!menu) return null;

    return (
        <div
            style={{
                position: 'absolute',
                top: menu.y,
                left: menu.x,
                zIndex: 1000,
                background: '#252525',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '5px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                minWidth: 150
            }}
        >
            {contextMenuNodeId ? (
                currentTaskData && (
                    <button
                        onClick={handleTogglePin}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: currentTaskData.node_data?.is_pinned ? '#FFD700' : '#ddd',
                            textAlign: 'left',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            borderRadius: 4
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        {currentTaskData.node_data?.is_pinned ? <Unlock size={14} /> : <Lock size={14} />}
                        {currentTaskData.node_data?.is_pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                    </button>
                )
            ) : (
                <button
                    onClick={handleAddNodeFromMenu}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        textAlign: 'left',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 4
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Plus size={14} color="#4CAF50" /> Buraya Görev Ekle
                </button>
            )}
        </div>
    );
}
