import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useStore } from '../store/useStore';
import type { NotificationData } from '../types';

export default function NotificationArea() {
    const { 
        unreadCount, isNotifOpen, setIsNotifOpen, 
        notifications, setNotifications, token, 
        setCurrentTaskData, setSidebarMode, setIsSidebarOpen,
        isSidebarOpen 
    } = useStore();

    const roundButtonStyle: React.CSSProperties = { 
        width: 40, height: 40, borderRadius: '50%', background: '#333', 
        border: '1px solid #555', color: 'white', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
        transition: '0.2s', position: 'relative'
    };

    return (
        <div style={{ 
            position: 'absolute', 
            top: 20, 
            right: isSidebarOpen ? 465 : 20, 
            transition: 'right 0.3s ease', 
            zIndex: 20 
        }}>
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} style={roundButtonStyle}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <div style={{ 
                        position: 'absolute', top: -5, right: -5, background: 'white', 
                        color: 'black', border: '2px solid black', width: 20, height: 20, 
                        borderRadius: '50%', fontSize: '0.7rem', fontWeight: 'bold', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                        {unreadCount}
                    </div>
                )}
            </button>

            <NotificationPanel
                isOpen={isNotifOpen}
                notifications={notifications}
                onClear={async (e) => {
                    e.stopPropagation();
                    try { 
                        await fetch(`${API_BASE_URL}/api/notifications/clear_all/`, { 
                            method: 'DELETE', 
                            headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' } 
                        }); 
                        setNotifications([]); 
                    } catch (err) { console.error(err); }
                }}
                onMarkAllRead={async () => {
                    try { 
                        await axios.post(`${API_BASE_URL}/api/notifications/mark_all_read/`); 
                        setNotifications((prev: NotificationData[]) => prev.map((n: NotificationData) => ({ ...n, is_read: true }))); 
                    } catch { console.error("Tümü okundu yapılamadı"); }
                }}
                onItemClick={async (notif: NotificationData) => {
                    if (!notif.is_read) { 
                        await axios.post(`${API_BASE_URL}/api/notifications/${notif.id}/mark_read/`); 
                        setNotifications((prev: NotificationData[]) => prev.map((n: NotificationData) => n.id === notif.id ? { ...n, is_read: true } : n)); 
                    }
                    if (notif.task) { 
                        const taskRes = await axios.get(`${API_BASE_URL}/api/tasks/${notif.task}/`); 
                        setCurrentTaskData(taskRes.data);
                        setSidebarMode('edit');
                        setIsSidebarOpen(true);
                        setIsNotifOpen(false); 
                    }
                }}
            />
        </div>
    );
}
