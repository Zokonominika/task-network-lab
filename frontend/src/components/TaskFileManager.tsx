import { useState } from 'react';
import { FileText, Download, Upload, Paperclip } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface TaskFileManagerProps {
    taskId: number;
    attachments: any[];
    token: string | null;
    t: any;
    theme: string;
    isOverdue: boolean | null;
    isCreator: boolean;
    amIAssigned: boolean;
    didIFinish: boolean | undefined;
    onRefresh: () => Promise<void>;
}

export default function TaskFileManager({
    taskId, attachments, token, t, theme, isOverdue,
    isCreator, amIAssigned, didIFinish, onRefresh
}: TaskFileManagerProps) {
    const [fileTab, setFileTab] = useState<'instruction' | 'delivery'>('instruction');
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'instruction' | 'delivery') => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploading(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('file_type', type);
                await axios.post(`${API_BASE_URL}/api/tasks/${taskId}/upload_file/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Token ${token}` }
                });
            }
            await onRefresh();
        } catch (err) { alert("Dosya yüklenemedi"); console.error(err); }
        finally { setUploading(false); }
    };

    const handleDownload = async (fileUrl: string, fileName: string) => {
        try {
            const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
            const response = await axios.get(fullUrl, { responseType: 'blob', headers: { 'Authorization': `Token ${token}` } });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) { console.error("İndirme hatası:", error); alert("Dosya indirilemedi!"); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            <div style={{ display: 'flex', background: t.bgTertiary, borderRadius: 8, padding: 4, gap: 6 }}>
                <button onClick={() => setFileTab('instruction')} style={{ flex: 1, padding: '8px', cursor: 'pointer', border: 'none', borderRadius: 6, background: fileTab === 'instruction' ? t.bgSecondary : 'transparent', color: fileTab === 'instruction' ? '#ff0072' : t.textSecondary, fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: '0.2s' }}>
                    <FileText size={14} /> Proje Dosyaları
                    {attachments.filter(a => a.file_type === 'instruction').length > 0 && (
                        <span style={{ background: '#ff007222', color: '#ff0072', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8 }}>
                            {attachments.filter(a => a.file_type === 'instruction').length}
                        </span>
                    )}
                </button>
                <button onClick={() => setFileTab('delivery')} style={{ flex: 1, padding: '8px', cursor: 'pointer', border: 'none', borderRadius: 6, background: fileTab === 'delivery' ? t.bgSecondary : 'transparent', color: fileTab === 'delivery' ? '#4CAF50' : t.textSecondary, fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: '0.2s' }}>
                    <Paperclip size={14} /> Teslim Dosyaları
                    {attachments.filter(a => a.file_type === 'delivery').length > 0 && (
                        <span style={{ background: '#4CAF5022', color: '#4CAF50', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8 }}>
                            {attachments.filter(a => a.file_type === 'delivery').length}
                        </span>
                    )}
                </button>
            </div>

            <div style={{ border: `2px dashed ${t.borderAlt}`, borderRadius: 12, height: '400px', padding: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {((fileTab === 'instruction' && isCreator && !isOverdue) || (fileTab === 'delivery' && amIAssigned && !didIFinish && !isOverdue)) && (
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: fileTab === 'instruction' ? '#ff0072' : '#4CAF50', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0, padding: '6px', borderRadius: 6, border: `1px dashed ${fileTab === 'instruction' ? '#ff007244' : '#4CAF5044'}`, background: fileTab === 'instruction' ? 'rgba(255,0,114,0.03)' : 'rgba(76,175,80,0.03)' }}>
                        <Upload size={14} />
                        {uploading ? 'Yükleniyor...' : (fileTab === 'instruction' ? 'Proje Dosyası Ekle' : 'Teslim Dosyası Ekle')}
                        <input type="file" multiple hidden disabled={uploading} onChange={(e) => handleFileUpload(e, fileTab)} />
                    </label>
                )}

                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {attachments.filter(a => a.file_type === fileTab).map(a => {
                        const name = decodeURIComponent(a.file.split('/').pop() || '').replace(/_[a-zA-Z0-9]{7,}(\.[^.]+)$/, '$1');
                        const ext = name.split('.').pop()?.toLowerCase();
                        let iconColor = t.textSecondary;
                        if (ext === 'pdf') iconColor = '#ff4444';
                        else if (['doc', 'docx'].includes(ext || '')) iconColor = t.accent;
                        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) iconColor = '#4CAF50';

                        return (
                            <div key={a.id} onClick={() => handleDownload(a.file, name)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.bgTertiary, padding: '10px 14px', borderRadius: 8, border: `1px solid ${t.border}`, cursor: 'pointer', flexShrink: 0, transition: '0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = theme === 'light' ? t.bgSecondary : '#222'}
                                onMouseLeave={e => e.currentTarget.style.background = t.bgTertiary}
                            >
                                <FileText size={20} color={iconColor} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.9rem', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                <Download size={14} color={t.textSecondary} style={{ flexShrink: 0 }} />
                            </div>
                        );
                    })}
                    {attachments.filter(a => a.file_type === fileTab).length === 0 && (
                        <div style={{ textAlign: 'center', color: t.textSecondary, fontSize: '0.8rem', fontStyle: 'italic', padding: 20 }}>
                            {fileTab === 'instruction' ? 'Proje dosyası yok.' : 'Teslim dosyası yok.'}
                        </div>
                    )}
                </div>
            </div>

            {isOverdue && (
                <div style={{ textAlign: 'center', color: '#ff4444', fontSize: '0.75rem', padding: '6px', borderRadius: 6, background: 'rgba(255,68,68,0.1)', border: '1px solid #ff444433' }}>
                    ⚠️ Süre doldu — yeni dosya yüklenemez.
                </div>
            )}
        </div>
    );
}
