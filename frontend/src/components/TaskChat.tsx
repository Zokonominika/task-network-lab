import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';
import type { CommentData } from '../types';
import { API_BASE_URL } from '../config';

interface TaskChatProps {
    taskId: number;
    token: string | null;
    t: any;
    isOverdue: boolean | null;
    status: string;
}

export default function TaskChat({ taskId, token, t, isOverdue, status }: TaskChatProps) {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState("");

    const fetchComments = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/comments/?task_id=${taskId}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setComments(res.data);
        } catch (e) { console.error("Yorum hatası", e); }
    }, [taskId, token]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        try {
            await axios.post(`${API_BASE_URL}/api/comments/`, {
                task: taskId,
                content: newComment
            }, { headers: { 'Authorization': `Token ${token}` } });
            setNewComment("");
            fetchComments();
        } catch { alert("Mesaj gönderilemedi."); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: t.bgTertiary, borderRadius: 8, marginBottom: 10 }}>
                {comments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: t.textSecondary, fontSize: '0.8rem', fontStyle: 'italic', marginTop: '50%' }}>Henüz mesaj yok.</div>
                ) : (
                    comments.map(msg => (
                        <div key={msg.id} style={{ alignSelf: msg.is_me ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: msg.is_me ? 'flex-end' : 'flex-start' }}>
                            {!msg.is_me && <span style={{ fontSize: '0.65rem', color: t.textSecondary, marginBottom: 2, marginLeft: 2 }}>{msg.user_display_name?.split(' ')[0]}</span>}
                            <div style={{ background: msg.is_me ? t.accent : t.bgTertiary, color: msg.is_me ? 'white' : t.text, padding: '8px 12px', borderRadius: msg.is_me ? '12px 12px 0 12px' : '12px 12px 12px 0', fontSize: '0.9rem', lineHeight: '1.4', boxShadow: `0 2px 5px ${t.shadow}`, border: !msg.is_me ? `1px solid ${t.border}` : 'none' }}>
                                {msg.content}
                            </div>
                            <span style={{ fontSize: '0.6rem', color: t.textSecondary, marginTop: 2 }}>{new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        </div>
                    ))
                )}
            </div>
            {(status === 'completed' || isOverdue) ? (
                <div style={{ textAlign: 'center', padding: 15, color: '#ff4444', fontSize: '0.85rem', border: `1px dashed ${t.borderAlt}`, borderRadius: 8, background: t.bgSecondary }}>
                    {status === 'completed' ? '🔒 Görev tamamlandığı için sohbet kapalıdır.' : '⏳ Süre dolduğu için sohbet kapatıldı.'}
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 5, position: 'relative' }}>
                    <input 
                        type="text" placeholder="Mesaj yazın..." 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} 
                        style={{ width: '100%', padding: '12px 45px 12px 15px', background: t.input, border: `1px solid ${t.border}`, borderRadius: 25, color: t.inputText, outline: 'none' }} 
                    />
                    <button onClick={handleSendComment} style={{ position: 'absolute', right: 5, top: 5, width: 34, height: 34, borderRadius: '50%', background: t.accent, border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Send size={18} /></button>
                </div>
            )}
        </div>
    );
}
