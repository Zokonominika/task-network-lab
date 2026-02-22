import React from 'react';
import { Trash2, CheckCheck } from 'lucide-react';
import type { NotificationData } from '../types';

interface NotificationPanelProps {
    isOpen: boolean;
    notifications: NotificationData[];
    onClear: (e: React.MouseEvent) => void;
    onMarkAllRead: () => void;
    onItemClick: (notif: NotificationData) => void;
}

export default function NotificationPanel({ isOpen, notifications, onClear, onMarkAllRead, onItemClick }: NotificationPanelProps) {
    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            position: 'absolute', top: 50, right: 0, 
            width: 300, maxHeight: 400, overflowY: 'auto',
            background: '#1e1e1e', border: '1px solid #333', borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            zIndex: 9999
        }}>
            <div style={{padding: '10px', borderBottom: '1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <span style={{fontWeight:'bold', fontSize:'0.9rem', color:'white'}}>Bildirimler</span>
                    {notifications.length > 0 && (
                        <button 
                            onClick={onClear}
                            title="Listeyi Temizle"
                            style={{
                                background:'transparent', border:'none', color:'#666', 
                                cursor:'pointer', padding:2, display:'flex', alignItems:'center',
                                transition: '0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#ff4444'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
                <button onClick={onMarkAllRead} style={{background:'none', border:'none', color:'#4CAF50', fontSize:'0.75rem', cursor:'pointer', display:'flex', alignItems:'center', gap:3}}>
                    <CheckCheck size={14}/> Tümü Okundu
                </button>
            </div>

            {notifications.length === 0 ? (
                <div style={{padding: 20, textAlign:'center', color:'#666', fontSize:'0.8rem'}}>Hiç bildirim yok.</div>
            ) : (
                notifications.map(notif => (
                    <div key={notif.id} onClick={() => onItemClick(notif)} style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #252525',
                        background: notif.is_read ? 'transparent' : '#2a2a2a',
                        cursor: 'pointer', transition: '0.2s',
                        borderLeft: notif.is_read ? '3px solid transparent' : '3px solid #ff0072'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'transparent' : '#2a2a2a'}
                    >
                        <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'white', marginBottom:2}}>{notif.title}</div>
                        <div style={{fontSize:'0.75rem', color:'#aaa', lineHeight:'1.2'}}>{notif.message}</div>
                        <div style={{fontSize:'0.65rem', color:'#555', marginTop:4, textAlign:'right'}}>{formatDate(notif.created_at)}</div>
                    </div>
                ))
            )}
        </div>
    );
}