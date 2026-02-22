import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { 
    Info, MessageSquare, FileText, Paperclip, Download, User as UserIcon, 
    ShieldAlert, CheckCircle, Clock, CheckSquare, Trash2, Loader, Send, 
    Upload
} from 'lucide-react';
import type { TaskData, CommentData } from '../types';

interface TaskDetailPanelProps {
    task: TaskData;
    currentUser: string;
    token: string | null;
    onUpdate: () => void;
    onClose: () => void;
}

export default function TaskDetailPanel({ task, currentUser, token, onUpdate, onClose }: TaskDetailPanelProps) {
    
    // --- YENİ MANTIK: Gelen veriyi (task) state içine alıyoruz ki güncelleyebilelim ---
    const [currentTask, setCurrentTask] = useState<TaskData>(task);
    // ----------------------------------------------------------------------------------

    const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState("");
    const [uploading, setUploading] = useState(false);
    const [fileTab, setFileTab] = useState<'instruction' | 'delivery' | null>('instruction');
    
    // Prop değişirse state'i de güncelle (Liste güncellenince burası da değişsin)
    useEffect(() => {
        setCurrentTask(task);
    }, [task]);

    // --- ÖZEL YENİLEME FONKSİYONU ---
    // Dosya yüklenince veya bir şey değişince sadece bu görevi backend'den taze çek
    const refreshTaskData = useCallback(async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/tasks/${currentTask.id}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setCurrentTask(res.data); // Ekranı güncelle
            onUpdate(); // Ana listeyi güncelle
        } catch (e) { console.error("Tazeleme hatası", e); }
    }, [currentTask.id, token, onUpdate]);

    // Yorumları Çek
    const fetchComments = useCallback(async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/comments/?task_id=${currentTask.id}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setComments(res.data);
        } catch (e) { console.error("Yorum hatası", e); }
    }, [currentTask.id, token]);

    // İlk açılışta yorumları getir
    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        try {
            await axios.post('http://127.0.0.1:8000/api/comments/', { 
                task: currentTask.id, 
                content: newComment 
            }, { headers: { 'Authorization': `Token ${token}` } });
            setNewComment(""); 
            fetchComments();
        } catch { alert("Mesaj gönderilemedi."); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'instruction' | 'delivery') => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploading(true);
        try {
            for (const file of files) {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('file_type', type);
              await axios.post(`http://127.0.0.1:8000/api/tasks/${currentTask.id}/upload_file/`, formData, { 
                  headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Token ${token}` } 
              });
            }
            // alert(`${files.length} dosya yüklendi!`); // İstersen açabilirsin
            await refreshTaskData(); // <-- ARTIK ANINDA GÖRÜNECEK
        } catch (err) { alert("Dosya yüklenemedi"); console.error(err); }
        finally { setUploading(false); }
    };

    const handleMyPartComplete = async () => {
        try {
            await axios.post(`http://127.0.0.1:8000/api/tasks/${currentTask.id}/complete_my_part/`, {}, {
                headers: { 'Authorization': `Token ${token}` }
            });
            await refreshTaskData();
        } catch (e) { 
            const err = e as AxiosError; 
            if(err.response) alert("Hata: " + JSON.stringify(err.response.data)); 
            else alert("Hata oluştu!"); 
        }
    };

    const handleArchiveTask = async () => {
        if(confirm("Tüm ekip tamamladı mı? Görev arşive kaldırılacak.")) {
          try {
              await axios.post(`http://127.0.0.1:8000/api/tasks/${currentTask.id}/archive_task/`, {}, {
                  headers: { 'Authorization': `Token ${token}` }
              });
              onUpdate(); onClose();
          } catch (e) { console.error(e); alert("Hata oluştu."); }
        }
    };
  
    const handleDeleteTask = async () => {
      if (confirm("Bu görevi silmek istediğine emin misin?")) {
          try {
              await axios.delete(`http://127.0.0.1:8000/api/tasks/${currentTask.id}/`, {
                  headers: { 'Authorization': `Token ${token}` }
              });
              onUpdate(); onClose();
          } catch (e) { console.error(e); alert("Silinemedi"); }
      }
    };

    const handleDownload = async (fileUrl: string, fileName: string) => {
        try {
            const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://127.0.0.1:8000${fileUrl}`;
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

    const renderThumbnail = (fileUrl: string, name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
        const fullSrc = fileUrl.startsWith('http') ? fileUrl : `http://127.0.0.1:8000${fileUrl}`;
  
        return (
            <div title={name} onClick={() => handleDownload(fileUrl, name)} 
                 style={{
                width: 60, height: 60, borderRadius: 8, overflow: 'hidden', 
                background: '#333', border: '1px solid #555', display: 'flex', 
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor:'pointer', position: 'relative'
            }}>
                {isImage ? (
                    <img src={fullSrc} alt="file" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                    <FileText size={24} color="#aaa" />
                )}
                {!isImage && <span style={{fontSize:'0.5rem', color:'#aaa', marginTop:2, maxWidth:'90%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{ext}</span>}
                <div style={{position:'absolute', bottom: 2, right: 2, background:'rgba(0,0,0,0.5)', borderRadius:3, padding:1}}>
                  <Download size={10} color="white"/>
                </div>
            </div>
        );
    };

    // Mantıksal Değişkenler (currentTask üzerinden)
    const isOverdue = currentTask.due_date && new Date(currentTask.due_date) < new Date() && currentTask.status !== 'completed';
    const isCreator = currentTask.created_by.username === currentUser;
    const myAssignment = currentTask.assignments.find(a => a.user.username === currentUser);
    const amIAssigned = !!myAssignment;
    const didIFinish = myAssignment?.is_completed;
    const isTaskActive = currentTask.status === 'active';
    const allAssigneesFinished = currentTask.assignments.every(a => a.is_completed);
    const priorityLabels: Record<string, string> = { 'low': 'Az', 'normal': 'Normal', 'urgent': 'Acil' };
    const inputStyle = {padding: '10px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px', width: '100%', boxSizing: 'border-box' as const};

    return (
        <>
            {/* SEKME BAŞLIKLARI */}
            <div style={{display:'flex', gap:10, marginBottom:15, borderBottom:'1px solid #333', paddingBottom:10}}>
                <button onClick={() => setActiveTab('details')} style={{flex:1, padding:'8px', cursor:'pointer', border:'none', borderRadius:6, background: activeTab === 'details' ? '#2196F3' : 'transparent', color: activeTab === 'details' ? 'white' : '#888', fontWeight: 'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'0.2s'}}>
                    <Info size={16}/> Detaylar
                </button>
                <button onClick={() => setActiveTab('chat')} style={{flex:1, padding:'8px', cursor:'pointer', border:'none', borderRadius:6, background: activeTab === 'chat' ? '#2196F3' : 'transparent', color: activeTab === 'chat' ? 'white' : '#888', fontWeight: 'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'0.2s'}}>
                    <MessageSquare size={16}/> Sohbet
                </button>
            </div>

            <div style={{flex:1, display:'flex', flexDirection:'column', overflowY:'hidden'}}>
                {/* A) DETAYLAR */}
                {activeTab === 'details' && (
                    <div style={{display:'flex', flexDirection:'column', gap:12, height:'98%', overflowY:'auto', paddingRight:5, paddingBottom: '80px'}}>
                         {/* Atayan */}
                         <div style={{background:'#252525', padding:10, borderRadius:5, borderLeft:'3px solid #ff0072', fontSize:'0.85rem'}}>
                            <span style={{color:'#aaa'}}>Görevi Atayan:</span> <strong style={{color:'white'}}>{currentTask.created_by.display_name || currentTask.created_by.username}</strong>
                        </div>

                        {/* Tarih ve Öncelik */}
                        <div>
                            {/* Üst Başlık */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
                                <label style={{fontSize:'0.8rem', color:'#aaa'}}>Teslim Tarihi</label>
                                {/* Eğer süre dolduysa burada küçük uyarı */}
                                {isOverdue && <span style={{fontSize:'0.65rem', background:'#ff4444', color:'white', padding:'1px 5px', borderRadius:3, fontWeight:'bold'}}>⚠️ SÜRE DOLDU</span>}
                            </div>

                            {/* Input Kutusu */}
                            <div style={{position:'relative', display:'flex', alignItems:'center'}}>
                                
                                {/* Sol İkon: Saat */}
                                <Clock size={16} style={{position:'absolute', left:10, color: isOverdue ? '#ff4444' : '#888', zIndex: 2}} />
                                
                                {/* Ana Input (Tarih Yazısı) */}
                                <input 
                                    type="text" 
                                    value={currentTask.due_date ? currentTask.due_date.replace('T', ' ').slice(0, 16) : 'Belirtilmedi'} 
                                    disabled 
                                    style={{
                                        ...inputStyle, 
                                        paddingLeft: 35, // Sol ikon için boşluk
                                        paddingRight: 80, // Sağdaki öncelik yazısı için boşluk (Üstüne binmesin)
                                        border: isOverdue ? '1px solid #ff4444' : '1px solid #333', 
                                        color: isOverdue ? '#ff4444' : 'white',
                                        width: '100%'
                                    }} 
                                />

                                {/* Sağ Kısım: Öncelik Durumu */}
                                <div style={{
                                    position: 'absolute', 
                                    right: 15, 
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: '#252525', // Input zemininden hafif farklı dursun
                                    border: '1px solid #444',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: currentTask.priority === 'urgent' ? '#ff4444' : currentTask.priority === 'low' ? '#4CAF50' : '#2196F3',
                                    textTransform: 'capitalize',
                                    zIndex: 2,
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}>
                                    {priorityLabels[currentTask.priority]}
                                </div>

                            </div>
                        </div>
                        
                        {/* Bilgilendirme Kutusu */}
                        <div>
                            <label style={{fontSize:'0.8rem', color:'#aaa', display:'block', marginBottom:5}}>Bilgilendirme</label>
                            <div style={{
                                width: '100%',
                                padding: '10px', 
                                background: '#333', 
                                border: '1px solid #555', 
                                color: 'white', 
                                borderRadius: '4px', 
                                boxSizing: 'border-box',
                                minHeight: '100px',
                                fontSize: '0.85rem',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap', // Satır boşluklarını korur
                                overflowWrap: 'break-word' // Uzun kelimeleri taşır
                            }}>
                                {currentTask.description || task.description || <span style={{color:'#666', fontStyle:'italic'}}>Bilgilendirme girilmemiş.</span>}
                            </div>
                        </div>

                        {/* Dosyalar */}
                        <div style={{borderTop:'1px solid #333', borderBottom:'1px solid #333', padding:'10px 0'}}>
                        {isTaskActive && (
                            <div style={{marginBottom: 20}}>
                                {/* KONTROL PANELİ (Butonlar) */}
                                <div style={{display:'flex', gap:10}}>
                                    {/* Talimatlar Butonu */}
                                    <button 
                                        onClick={() => setFileTab(fileTab === 'instruction' ? null : 'instruction')} // Açıksa kapat, kapalıysa aç
                                        style={{
                                            flex:1, padding:'12px', 
                                            background: fileTab === 'instruction' ? '#333' : '#1e1e1e', // Aktifse parlak
                                            border: fileTab === 'instruction' ? '1px solid #ff0072' : '1px solid #333', 
                                            borderRadius:8, cursor:'pointer', 
                                            color: fileTab === 'instruction' ? '#ff0072' : '#888', 
                                            fontWeight:'bold', display:'flex', gap:8, justifyContent:'center', alignItems:'center', 
                                            transition:'all 0.2s ease',
                                            boxShadow: fileTab === 'instruction' ? '0 4px 12px rgba(255, 0, 114, 0.2)' : 'none'
                                        }}
                                    >
                                        <FileText size={16}/> 
                                        <span>Talimat Dosyaları</span>
                                        {/* Küçük Rozet (Varsa Sayı) */}
                                        {currentTask.attachments.filter(a => a.file_type === 'instruction').length > 0 && (
                                            <span style={{background:'#ff0072', color:'white', fontSize:'0.6rem', padding:'2px 6px', borderRadius:10}}>
                                                {currentTask.attachments.filter(a => a.file_type === 'instruction').length}
                                            </span>
                                        )}
                                    </button>

                                    {/* Teslimat Butonu */}
                                    <button 
                                        onClick={() => setFileTab(fileTab === 'delivery' ? null : 'delivery')} // Açıksa kapat, kapalıysa aç
                                        style={{
                                            flex:1, padding:'12px', 
                                            background: fileTab === 'delivery' ? '#333' : '#1e1e1e', 
                                            border: fileTab === 'delivery' ? '1px solid #4CAF50' : '1px solid #333', 
                                            borderRadius:8, cursor:'pointer', 
                                            color: fileTab === 'delivery' ? '#4CAF50' : '#888', 
                                            fontWeight:'bold', display:'flex', gap:8, justifyContent:'center', alignItems:'center', 
                                            transition:'all 0.2s ease',
                                            boxShadow: fileTab === 'delivery' ? '0 4px 12px rgba(76, 175, 80, 0.2)' : 'none'
                                        }}
                                    >
                                        <Paperclip size={16}/> 
                                        <span>Teslim Dosyaları</span>
                                        {currentTask.attachments.filter(a => a.file_type === 'delivery').length > 0 && (
                                            <span style={{background:'#4CAF50', color:'white', fontSize:'0.6rem', padding:'2px 6px', borderRadius:10}}>
                                                {currentTask.attachments.filter(a => a.file_type === 'delivery').length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* ÇEKMECE İÇERİĞİ (Sadece bir tab seçiliyse görünür) */}
                                {fileTab && (
                                    <div style={{
                                        marginTop: 10, 
                                        background:'#1a1a1a', 
                                        border:'1px solid #333', 
                                        borderRadius:8, 
                                        overflow:'hidden',
                                        // --- KRİTİK AYAR: SABİT YÜKSEKLİK ---
                                        height: '120px', // Kutu boyutu sabitlendi, ana ekranı itmez.
                                        // ------------------------------------
                                        animation: 'fadeIn 0.3s ease' 
                                    }}>
                                        <div style={{padding:15, height:'100%', boxSizing:'border-box'}}>
                                            
                                            {/* --- TALİMATLAR İÇERİĞİ --- */}
                                            {fileTab === 'instruction' && (
                                                <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                                                    {/* Scrollable Alan: Yükseklik hesaplandı (160px - 30px padding = ~130px) */}
                                                    <div style={{
                                                        display:'flex', gap:20, flexWrap:'wrap', 
                                                        height:'130px', overflowY:'auto', alignContent:'flex-start',
                                                        padding:2 
                                                    }}>
                                                        
                                                        {/* Upload Butonu (50px) */}
                                                        {isCreator && !isOverdue && (
                                                            <label title="Yeni Dosya Ekle" style={{
                                                                width: 50, height: 50, flexShrink: 0, 
                                                                border:'2px dashed #ff0072', borderRadius:8, 
                                                                display:'flex', alignItems:'center', justifyContent:'center', 
                                                                cursor:'pointer', background:'rgba(255, 0, 114, 0.05)', color:'#ff0072', 
                                                                transition: '0.2s'
                                                            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 0, 114, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 0, 114, 0.05)'}>
                                                                <Upload size={20} />
                                                                <input type="file" multiple hidden onChange={(e) => handleFileUpload(e, 'instruction')} />
                                                            </label>
                                                        )}

                                                        {/* Dosyalar */}
                                                        {currentTask.attachments.filter(a => a.file_type === 'instruction').length > 0 
                                                            ? currentTask.attachments.filter(a => a.file_type === 'instruction').map(a => (
                                                                <div key={a.id} style={{transform: 'scale(0.85)', transformOrigin: 'top left', width: 50, height: 50}}>
                                                                    {renderThumbnail(a.file, a.file.split('/').pop() || '')}
                                                                </div>
                                                            ))
                                                            : !isCreator && <span style={{color:'#555', fontSize:'0.8rem', fontStyle:'italic', padding:10, width:'100%'}}>Talimat yok.</span>
                                                        }
                                                    </div>
                                                    {isCreator && isOverdue && <div style={{fontSize:'0.7rem', color:'#ff4444', textAlign:'center', marginTop:-15, background:'#1a1a1a'}}>⚠️ Süre doldu.</div>}
                                                </div>
                                            )}

                                            {/* --- TESLİMATLAR İÇERİĞİ --- */}
                                            {fileTab === 'delivery' && (
                                                <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                                                    <div style={{
                                                        display:'flex', gap:10, flexWrap:'wrap', 
                                                        height:'130px', overflowY:'auto', alignContent:'flex-start',
                                                        padding:2
                                                    }}>
                                                        
                                                        {/* Upload Butonu */}
                                                        {amIAssigned && !didIFinish && !isOverdue && (
                                                            <label title="Teslimat Yükle" style={{
                                                                width: 50, height: 50, flexShrink: 0, 
                                                                border:'2px dashed #4CAF50', borderRadius:8, 
                                                                display:'flex', alignItems:'center', justifyContent:'center', 
                                                                cursor:'pointer', background:'rgba(76, 175, 80, 0.05)', color:'#4CAF50', 
                                                                transition: '0.2s'
                                                            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(76, 175, 80, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(76, 175, 80, 0.05)'}>
                                                                {uploading ? <Loader size={18} className="spin-slow"/> : <Upload size={20} />}
                                                                <input type="file" multiple hidden onChange={(e) => handleFileUpload(e, 'delivery')} disabled={uploading} />
                                                            </label>
                                                        )}

                                                        {/* Dosyalar */}
                                                        {currentTask.attachments.filter(a => a.file_type === 'delivery').length > 0 
                                                            ? currentTask.attachments.filter(a => a.file_type === 'delivery').map(a => (
                                                                <div key={a.id} style={{position:'relative', transform: 'scale(0.85)', transformOrigin: 'top left', width: 50, height: 50}}>
                                                                    {renderThumbnail(a.file, a.file.split('/').pop() || '')}
                                                                </div>
                                                            ))
                                                            : (!amIAssigned || didIFinish) && <span style={{color:'#555', fontSize:'0.8rem', fontStyle:'italic', padding:10, width:'100%'}}>Teslimat yok.</span>
                                                        }
                                                    </div>
                                                    {isOverdue && <span style={{color:'#ff4444', fontSize:'0.7rem', textAlign:'center', display:'block', marginTop:-15, background:'#1a1a1a'}}>⚠️ Süre doldu.</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>

                        {/* Personel Durumu (Sabit Yükseklik + Scroll) */}
                        <div style={{background:'#252525', padding:10, borderRadius:5}}>
                            <label style={{fontSize:'0.8rem', color:'#aaa', display:'block', marginBottom:8}}>Personel Durumu:</label>
                            
                            {/* Liste Kapsayıcısı */}
                            <div style={{
                                height: '120px',    // <-- DEĞİŞİKLİK: Sabit yükseklik (Kutu hep bu boyda kalır)
                                overflowY: 'auto',  // <-- Sığmazsa scroll çıkar
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 6,
                                paddingRight: 4
                            }}>
                                {currentTask.assignments.length > 0 ? (
                                    currentTask.assignments.map(a => {
                                        const isUserLate = a.is_failed || (!a.is_completed && (isOverdue || currentTask.status === 'completed'));
                                        
                                        return (
                                            <div key={a.id} style={{
                                                fontSize:'0.85rem', display:'flex', justifyContent:'space-between', alignItems:'center', 
                                                background:'#1e1e1e', padding:'8px 12px', borderRadius:6,
                                                borderLeft: isUserLate ? '3px solid #ff4444' : (a.is_completed ? '3px solid #4CAF50' : '3px solid #444'),
                                                borderBottom: '1px solid #222',
                                                flexShrink: 0 // Listeleme sıkışmasın
                                            }}>
                                                <span style={{display:'flex', alignItems:'center', gap:8, color:'white'}}>
                                                    <UserIcon size={14} color="#aaa"/> 
                                                    {a.user.display_name || a.user.username}
                                                    {isUserLate && <span style={{color:'#ff4444', fontSize:'0.7rem', fontWeight:'bold'}}>(Tamamlanmadı)</span>}
                                                </span>
                                                
                                                <span style={{color: a.is_completed ? '#4CAF50' : (isUserLate ? '#ff4444' : '#ff9800'), fontSize:'0.75rem', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}>
                                                    {a.is_completed ? 'Tamamladı' : (isUserLate ? 'Başarısız' : 'Yapıyor...')}
                                                    {isUserLate ? <ShieldAlert size={14}/> : (a.is_completed ? <CheckCircle size={14}/> : null)}
                                                </span>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#555', fontSize:'0.8rem', fontStyle:'italic'}}>
                                        Henüz personel atanmamış.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Aksiyon Butonları */}
                        <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop:15, paddingBottom:25}}>
                            {amIAssigned && !didIFinish && isTaskActive && !isOverdue && (
                                <button 
                                    onClick={handleMyPartComplete} 
                                    style={{ 
                                        position: 'sticky', bottom: '20px', width: '100%', marginTop: 'auto', zIndex: 50,
                                        background: '#4CAF50', border: 'none', padding: '12.5px', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.9rem',
                                        boxShadow: '0 -10px 20px rgba(30,30,30,0.9)'
                                    }}
                                >
                                    <CheckSquare size={18} style={{marginRight:5}}/> Görevi Tamamladım
                                </button>
                            )}
                            {amIAssigned && !didIFinish && isOverdue && (
                                <div style={{textAlign:'center', color:'#ff4444', border:'1px solid #ff4444', padding:10, borderRadius:5, background:'rgba(255, 68, 68, 0.1)'}}>
                                    ⚠️ Bu görevin süresi doldu, işlem yapamazsınız.
                                </div>
                            )}

                            {amIAssigned && didIFinish && (
                                <div style={{textAlign:'center', color:'#4CAF50', border:'1px solid #4CAF50', padding:10, borderRadius:5, background:'rgba(76, 175, 80, 0.1)'}}>Harika! Kendi kısmını tamamladın.</div>
                            )}
                            {isCreator && isTaskActive && (
                                <>
                                    {(allAssigneesFinished || isOverdue) ? (
                                        <button onClick={handleArchiveTask} style={{ background: isOverdue ? '#ff9800' : '#4CAF50', border: 'none', padding: '12px', color: 'white', borderRadius: '8px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontWeight:'bold', fontSize:'0.9rem' }}>
                                            <CheckCircle size={18}/> 
                                            {isOverdue ? 'Süre Doldu: Görevi Zorla Kapat' : 'Tüm Ekip Tamamladı: Görevi Kapat'}
                                        </button>
                                    ) : (
                                        <div style={{textAlign:'center', padding:10, color:'#888', border:'1px dashed #444', borderRadius:8, fontSize:'0.8rem'}}>
                                            <Loader size={14} style={{display:'inline', marginRight:5, animation:'spin 2s linear infinite'}}/> 
                                            Personel çalışıyor...
                                        </div>
                                    )}
                                    <button onClick={handleDeleteTask} style={{ background: '#222', border: '1px solid #ff4444', color: '#ff4444', padding: '12px', borderRadius: '8px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:'0.9rem' }}>
                                        <Trash2 size={18}/> Sil
                                    </button>
                                </>
                            )}
                        </div>  
                    </div>
                )}

                {/* B) SOHBET */}
                {activeTab === 'chat' && (
                    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
                        <div style={{flex:0.95, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, padding:10, background:'#1a1a1a', borderRadius:8, marginBottom:10}}>
                            {comments.length === 0 ? (
                                <div style={{textAlign:'center', color:'#555', fontSize:'0.8rem', fontStyle:'italic', marginTop:'50%'}}>Henüz mesaj yok.</div>
                            ) : (
                                comments.map(msg => (
                                    <div key={msg.id} style={{alignSelf: msg.is_me ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: msg.is_me ? 'flex-end' : 'flex-start'}}>
                                        {!msg.is_me && <span style={{fontSize: '0.65rem', color: '#aaa', marginBottom: 2, marginLeft: 2}}>{msg.user_display_name}</span>}
                                        <div style={{background: msg.is_me ? '#2196F3' : '#333', color: 'white', padding: '8px 12px', borderRadius: msg.is_me ? '12px 12px 0 12px' : '12px 12px 12px 0', fontSize: '0.9rem', lineHeight: '1.4', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}>
                                            {msg.content}
                                        </div>
                                        <span style={{fontSize: '0.6rem', color: '#555', marginTop: 2}}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        {(currentTask.status === 'completed' || isOverdue) ? (
                            <div style={{textAlign:'center', padding:15, color:'#ff4444', fontSize:'0.85rem', border:'1px dashed #444', borderRadius:8, background:'#222'}}>
                                {currentTask.status === 'completed' ? '🔒 Görev tamamlandığı için sohbet kapalıdır.' : '⏳ Süre dolduğu için sohbet kapatıldı.'}
                            </div>
                        ) : (
                            <div style={{display: 'flex', gap: 5, position:'relative'}}>
                                <input type="text" placeholder="Mesaj yazın..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} style={{width: '100%', padding: '12px 45px 12px 15px', background: '#111', border: '1px solid #444', borderRadius: 25, color: 'white', outline: 'none'}} />
                                <button onClick={handleSendComment} style={{position: 'absolute', right: 5, top: 5, width: 34, height: 34, borderRadius: '50%', background: '#2196F3', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}><Send size={18} /></button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}