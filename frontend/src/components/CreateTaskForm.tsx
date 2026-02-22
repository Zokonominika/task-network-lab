import { useState, type ChangeEvent } from 'react';
import { Paperclip, FileText, Save } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import type { UserData } from '../types';

interface CreateTaskFormProps {
    colleagues: UserData[];
    onTaskCreated: () => void;
    token: string | null;
    initialPosition?: { x: number, y: number } | null;
}

export default function CreateTaskForm({ colleagues, token, onTaskCreated, initialPosition }: CreateTaskFormProps) {
    
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [taskPriority, setTaskPriority] = useState("normal");
    const [taskDueDate, setTaskDueDate] = useState(""); 
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]); 
    const [createFiles, setCreateFiles] = useState<File[]>([]); 
    const [uploading, setUploading] = useState(false);

    const priorityLabels: Record<string, string> = { 'low': 'Az', 'normal': 'Normal', 'urgent': 'Acil' };
    const inputStyle = {padding: '10px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px', width: '100%', boxSizing: 'border-box' as const};

    // İş arkadaşlarını departmanlara göre grupla
    const groupedColleagues = colleagues.reduce((groups, user) => {
        const dept = user.department || 'Diğer'; // Departmanı olmayanları 'Diğer' grubuna al
        if (!groups[dept]) {
            groups[dept] = [];
        }
        groups[dept].push(user);
        return groups;
    }, {} as Record<string, UserData[]>);

    const handleSaveTask = async () => {
        if (!taskTitle) return alert("Başlık girin!");
        setUploading(true);
    
        const payload = {
            title: taskTitle, 
            description: taskDesc, 
            priority: taskPriority, 
            due_date: taskDueDate || null,
            assignee_ids: selectedAssignees.map(id => parseInt(id)),
            position_x: initialPosition ? initialPosition.x : 0, 
            position_y: initialPosition ? initialPosition.y : 0
        };
    
        try {
             // 1. Görevi Oluştur
             const res = await axios.post('http://127.0.0.1:8000/api/tasks/', payload, { headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` } });
             const newTaskId = res.data.id;
    
             // 2. Dosyaları Yükle
             if (createFiles.length > 0) {
                 for (const file of createFiles) {
                     const formData = new FormData();
                     formData.append('file', file);
                     formData.append('file_type', 'instruction'); 
                     await axios.post(`http://127.0.0.1:8000/api/tasks/${newTaskId}/upload_file/`, formData, { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Token ${token}` } });
                 }
             }
             
             onTaskCreated(); 
             setTaskTitle(""); setTaskDesc(""); setCreateFiles([]); setSelectedAssignees([]); setTaskDueDate("");
             
        } catch (err: unknown) { // <-- 1. ADIM: 'any' yerine 'unknown' dedik
            console.error("Hata Detayı:", err); 
            
            let errorMsg = "İşlem başarısız! Sunucu hatası.";

            // <-- 2. ADIM: Hatanın Axios'tan gelip gelmediğini kontrol ediyoruz
            if (err instanceof AxiosError && err.response?.data) {
                const data = err.response.data;
                
                // Eğer hata bir dizi ise
                if (Array.isArray(data)) {
                    errorMsg = data.join('\n');
                } 
                // Eğer hata bir nesne ise
                else if (typeof data === 'object') {
                    errorMsg = Object.values(data).flat().join('\n');
                }
            } else if (err instanceof Error) {
                // Axios dışı genel bir JS hatası ise
                errorMsg = err.message;
            }
            
            alert(`HATA: ${errorMsg}`);

        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{display:'flex', flexDirection:'column', gap:15, height:'100%'}}>
            <div>
                <label style={{fontSize:'0.8rem', color:'#aaa'}}>Başlık</label>
                <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} style={inputStyle} />
            </div>
            
            {/* Dosya Ekleme */}
            <div style={{borderTop:'1px solid #333', borderBottom:'1px solid #333', padding:'10px 0'}}>
                <label style={{fontSize:'0.85rem', color:'#aaa', display:'block', marginBottom:5}}>Dosya Ekle (İsteğe Bağlı)</label>
                <label style={{cursor:'pointer', background:'#333', padding:'8px', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', gap:5, border:'1px dashed #777', color:'#ccc'}}>
                    <Paperclip size={16}/> Dosyaları Seç
                    <input type="file" multiple hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && setCreateFiles(Array.from(e.target.files))} />
                </label>
                {createFiles.length > 0 && (
                    <div style={{display:'flex', gap:10, marginTop:5, flexWrap:'wrap'}}>
                        {createFiles.map((file, i) => (
                            <div key={i} title={file.name} style={{width:50, height:50, borderRadius:8, background:'#252525', border:'1px solid #444', display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
                                <FileText size={20} color="#aaa"/>
                                <button onClick={() => setCreateFiles(createFiles.filter((_, index) => index !== i))} style={{position:'absolute', top:-5, right:-5, background:'#ff4444', border:'none', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', fontSize:'0.7rem'}}>×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Öncelik */}
            <div>
                <label style={{fontSize:'0.8rem', color:'#aaa'}}>Öncelik Durumu</label>
                <div style={{display:'flex', gap: 10}}>
                    {['low', 'normal', 'urgent'].map(p => (
                        <button key={p} onClick={() => setTaskPriority(p)}
                            style={{flex: 1, padding: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: taskPriority === p ? (p==='urgent'?'#ff4444': p==='low'?'#4CAF50':'#2196F3') : '#333', color: 'white', fontWeight: taskPriority === p ? 'bold' : 'normal'}}>
                            {priorityLabels[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Atama - GÜNCELLENEN KISIM */}
            <div>
                <label style={{fontSize:'0.8rem', color:'#aaa'}}>Atanan Kişiler (Ctrl ile çoklu seç)</label>
                <select 
                    multiple 
                    value={selectedAssignees} 
                    onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions, o => o.value);
                        setSelectedAssignees(options);
                    }} 
                    style={{...inputStyle, height: 150, cursor: 'pointer'}} // Yüksekliği biraz artırdım
                >
                    {Object.keys(groupedColleagues).map(dept => (
                        <optgroup key={dept} label={dept} style={{color: '#aaa', fontStyle: 'italic'}}>
                            {groupedColleagues[dept].map(user => (
                                <option key={user.id} value={user.id} style={{color: 'white', fontStyle: 'normal', padding: '5px'}}>
                                    {user.display_name || user.username} 
                                    {user.rank ? ` (Rütbe: ${user.rank})` : ''}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {/* Rütbe bilgisinin silik görünmesi için ufak bir stil notu:
                    Option elementi içindeki metnin bir kısmını CSS ile silikleştirmek zordur (tarayıcı desteği sınırlıdır).
                    Bu yüzden parantez içinde griye yakın bir renk vermeyi denedik ama select option içinde HTML tag çalışmaz.
                    Alternatif olarak tüm metin beyaz, rütbe bilgisi parantez içinde gösteriliyor. 
                    Daha gelişmiş bir görünüm için özel bir 'Custom Select' bileşeni gerekir.
                */}
            </div>

            {/* Tarih */}
            <div>
                <label style={{fontSize:'0.85rem', color:'#aaa', display:'block', marginBottom:5}}>Son Teslim Tarihi</label>
                <input 
                    type="datetime-local" 
                    value={taskDueDate} 
                    onChange={(e) => setTaskDueDate(e.target.value)} 
                    min={new Date().toISOString().slice(0, 16)}
                    style={{...inputStyle, padding:'12px', cursor:'pointer', colorScheme: 'dark'}} 
                />
            </div>
            
            <div><label style={{fontSize:'0.8rem', color:'#aaa'}}>Bilgilendirme</label><textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={4} style={{...inputStyle, resize:'none'}} /></div>

            {/* Kaydet Butonu */}
            <button 
                onClick={handleSaveTask} 
                style={{ 
                    position: 'sticky', 
                    bottom: '0', // Sticky özelliğinin çalışması için bottom 0 veya belirli bir değer olmalı
                    width: '100%', 
                    marginTop: '240px',
                    zIndex: 50,
                    background: '#ff0072', 
                    border: 'none', 
                    padding: '12.5px', 
                    color: 'white', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 5,
                    boxShadow: '0 -10px 20px rgba(30,30,30,0.9)'
                }}
            >
                <Save size={18} /> {uploading ? 'Yükleniyor...' : 'Oluştur'}
            </button>
        </div>
    );
}