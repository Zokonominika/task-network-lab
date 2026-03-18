import React from 'react';
import { Trash2, CheckCheck } from 'lucide-react';
import type { NotificationData } from '../types';

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

interface NotificationPanelProps {
    isOpen: boolean;
    notifications: NotificationData[];
    onClear: (e: React.MouseEvent) => void;
    onMarkAllRead: () => void;
    onItemClick: (notif: NotificationData) => void;
    theme?: 'dark' | 'light';
}

export default function NotificationPanel({ isOpen, notifications, onClear, onMarkAllRead, onItemClick, theme = 'dark' }: NotificationPanelProps) {
    const t = getTheme(theme);
    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            position: 'absolute', top: 50, right: 0,
            width: 300, maxHeight: 400, overflowY: 'auto',
            background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
            boxShadow: `0 10px 30px ${t.shadow}`,
            display: 'flex', flexDirection: 'column',
            zIndex: 9999
        }}>
            <div style={{ padding: '10px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: t.text }}>Bildirimler</span>
                    {notifications.length > 0 && (
                        <button
                            onClick={onClear}
                            title="Listeyi Temizle"
                            style={{
                                background: 'transparent', border: 'none', color: '#666',
                                cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center',
                                transition: '0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#ff4444'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
                <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', color: theme === 'light' ? t.accent : '#4CAF50', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CheckCheck size={14} /> Tümü Okundu
                </button>
            </div>

            {notifications.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: t.textSecondary, fontSize: '0.8rem' }}>Hiç bildirim yok.</div>
            ) : (
                notifications.map(notif => (
                    <div key={notif.id} onClick={() => onItemClick(notif)} style={{
                        padding: '8px 12px',
                        borderBottom: `1px solid ${t.border}`,
                        background: notif.is_read ? 'transparent' : t.bgSecondary,
                        cursor: 'pointer', transition: '0.2s',
                        borderLeft: notif.is_read ? '3px solid transparent' : '3px solid #ff0072'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.background = theme === 'light' ? t.bgTertiary : '#333'}
                        onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'transparent' : t.bgSecondary}
                    >
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: t.text, marginBottom: 2 }}>{notif.title}</div>
                        <div style={{ fontSize: '0.75rem', color: t.textSecondary, lineHeight: '1.2' }}>{notif.message}</div>
                        <div style={{ fontSize: '0.65rem', color: t.textSecondary, marginTop: 4, textAlign: 'right' }}>{formatDate(notif.created_at)}</div>
                    </div>
                ))
            )}
        </div>
    );
}