import { User as UserIcon, Briefcase, LogOut, ChevronDown, Shield } from 'lucide-react'; // Mail ve Phone ikonlarını sildim
import type { UserData, UserStatus } from '../types';

interface TeamPanelProps {
    currentUser: string;
    colleagues: UserData[];
    onLogout: () => void;
    onUpdateStatus: (status: UserStatus) => void;
    preferredStatus: UserStatus;
}

export default function TeamPanel({ currentUser, colleagues, onLogout, onUpdateStatus, preferredStatus }: TeamPanelProps) {
    
    const myProfile = colleagues.find(c => c.username === currentUser);
    const otherColleagues = colleagues.filter(c => c.username !== currentUser);

    const getStatusColor = (status: string = 'offline') => {
        switch(status) {
            case 'online': return '#4CAF50';
            case 'busy': return '#ff4444';
            case 'away': return '#FFD700';
            default: return '#555';
        }
    };

    // Yükleniyor durumu
    if (!myProfile) return <div style={{color:'white', padding:20}}>Profil yükleniyor...</div>;

    return (
        <div style={{
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            paddingBottom: '50px', 
            gap: 20,
            overflow: 'hidden' 
        }}>
            
            {/* 1. BÖLÜM: BENİM PROFİL KARTIM (SABİT) */}
            <div style={{
                background: '#252525', 
                padding: 20, 
                borderRadius: 12, 
                border: '1px solid #444',
                flexShrink: 0 
            }}>
                {/* Üst Kısım: Avatar ve İsim */}
                <div style={{display:'flex', alignItems:'center', gap:15, marginBottom:15}}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%', 
                        background: myProfile.gender === 'female' ? '#e91e63' : '#2196F3', 
                        display:'flex', alignItems:'center', justifyContent:'center',
                        border: '3px solid #333'
                    }}>
                        <UserIcon size={32} color="white"/>
                    </div>
                    <div style={{flex:1}}>
                        <div style={{fontWeight:'bold', fontSize:'1.1rem', color:'white'}}>
                            {myProfile.display_name || currentUser}
                        </div>
                        <div style={{fontSize:'0.8rem', color:'#aaa', display:'flex', alignItems:'center', gap:5}}>
                            <Briefcase size={12}/> {myProfile.title || 'Unvan Yok'}
                        </div>
                        <div style={{fontSize:'0.75rem', color:'#666', marginTop:2}}>
                            {myProfile.department || 'Genel Departman'}
                        </div>
                    </div>
                    <button onClick={onLogout} title="Çıkış Yap" style={{background:'#330000', border:'1px solid #550000', borderRadius:6, color:'#ff4444', cursor:'pointer', padding:8}}>
                        <LogOut size={18} /> 
                    </button>
                </div>

                {/* ORTA KISIM: İLETİŞİM BİLGİLERİ - İPTAL EDİLDİ (DENEY GÜVENLİĞİ) */}
                {/* Öğrencilerin WhatsApp yerine Sistem Chat'ini kullanması için iletişim bilgilerini gizliyoruz.
                <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:15, padding:'10px', background:'rgba(0,0,0,0.2)', borderRadius:6}}>
                    <div style={{display:'flex', alignItems:'center', gap:8, fontSize:'0.8rem', color:'#ccc'}}>
                        <Mail size={14} color="#aaa"/> {myProfile.email || 'Gizli'}
                    </div>
                </div> 
                */}

                {/* Alt Kısım: Durum Değiştirici */}
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'#111', border: '1px solid #333', padding:'10px 12px', borderRadius:6}}>
                    <span style={{fontSize:'0.8rem', color:'#888'}}>Durumum:</span>
                    <div style={{position:'relative', display: 'flex', alignItems: 'center'}}>
                        <div style={{width: 8, height: 8, borderRadius: '50%', background: getStatusColor(myProfile.status), marginRight: 8, boxShadow: `0 0 8px ${getStatusColor(myProfile.status || 'offline')}`}} />
                        <select 
                            value={(myProfile.status === 'away' || myProfile.status === 'offline') ? preferredStatus : myProfile.status} 
                            onChange={(e) => onUpdateStatus(e.target.value as UserStatus)}
                            style={{appearance:'none', background:'transparent', border:'none', color:'white', fontSize:'0.85rem', fontWeight:'bold', cursor:'pointer', outline:'none', paddingRight: 18, textAlignLast: 'right'}}
                        >
                            <option value="online" style={{background:'#222', color:'#4CAF50'}}>Çevrimiçi</option>
                            <option value="busy" style={{background:'#222', color:'#ff4444'}}>Meşgul</option>
                        </select>
                        <ChevronDown size={14} style={{position:'absolute', right:0, top:4, pointerEvents:'none', color:'#888'}}/>
                    </div>
                </div>
                {myProfile.status === 'away' && (<div style={{textAlign:'center', fontSize:'0.7rem', color:'#FFD700', marginTop:5, fontStyle:'italic'}}>(Sistem otomatik olarak "Uzakta" moduna aldı)</div>)}
            </div>
            
            {/* 2. BÖLÜM: EKİP LİSTESİ */}
            <div style={{
                flex: 1, 
                background: '#252525',
                borderRadius: 12,
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Başlık */}
                <div style={{
                    padding: '12px 15px', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderBottom:'1px solid #333',
                    color: '#aaa', fontWeight:'bold', fontSize:'0.85rem',
                    display:'flex', justifyContent:'space-between'
                }}>
                    <span>Ekip Üyeleri</span>
                    <span style={{background:'#333', padding:'2px 8px', borderRadius:10, fontSize:'0.7rem', color:'white'}}>
                        {otherColleagues.length}
                    </span>
                </div>

                {/* Liste */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 10,
                    display: 'flex', flexDirection: 'column', gap: 10
                }}>
                    {otherColleagues.map(user => (
                        <div key={user.id} style={{
                            padding: 12, 
                            background: '#1a1a1a', 
                            borderRadius: 8, 
                            border: '1px solid #333',
                            transition: '0.2s'
                        }}>
                            {/* Avatar ve İsim */}
                            <div style={{display:'flex', alignItems:'center', gap:10}}>
                                <div style={{position:'relative'}}>
                                    <div style={{width: 36, height: 36, borderRadius: '50%', background: user.gender === 'female' ? '#e91e63' : '#2196F3', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        <UserIcon size={18} color="white"/>
                                    </div>
                                    <div style={{position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background: getStatusColor(user.status || 'offline'), border:'2px solid #1a1a1a'}}></div>
                                </div>
                                <div style={{flex:1}}>
                                    <div style={{fontSize:'0.9rem', fontWeight:'bold', display:'flex', alignItems:'center', gap:5, color:'white'}}>
                                        {user.display_name || user.username}
                                        {(user.rank || 1) >= 7 && <Shield size={14} color="#FFD700" fill="#FFD700" fillOpacity={0.3}/>}
                                    </div>
                                    <div style={{fontSize:'0.7rem', color:'#888', display:'flex', alignItems:'center', gap:8}}>
                                        <span>{user.title || 'Çalışan'}</span>
                                        <span style={{width:3, height:3, borderRadius:'50%', background:'#555'}}></span>
                                        <span>{user.department || 'Genel'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* İLETİŞİM BİLGİLERİ - GİZLENDİ */}
                            {/* <div style={{marginTop: 8, background:'rgba(255,255,255,0.03)', padding:8, borderRadius:4, display:'flex', flexDirection:'column', gap:5}}>
                                <div style={{display:'flex', alignItems:'center', gap:8, fontSize:'0.75rem', color: '#555'}}>
                                    <span style={{display:'flex', alignItems:'center', gap:4, fontStyle:'italic'}}>İletişim Gizli <EyeOff size={10}/></span>
                                </div>
                            </div>
                            */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}