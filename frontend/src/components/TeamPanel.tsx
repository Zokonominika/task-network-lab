import { LogOut } from 'lucide-react'; // Mail ve Phone ikonlarını sildim
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
        switch (status) {
            case 'online': return '#4CAF50';
            case 'busy': return '#ff4444';
            case 'away': return '#FFD700';
            default: return '#555';
        }
    };

    // Yükleniyor durumu
    if (!myProfile) return <div style={{ color: 'white', padding: 20 }}>Profil yükleniyor...</div>;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: 16,
            overflow: 'hidden'
        }}>

            {/* 1. BÖLÜM: BENİM PROFİL KARTIM */}
            <div style={{
                background: '#1a1a1a',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid #333',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12
            }}>
                {/* Initial Avatar */}
                <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: myProfile.gender === 'female' ? '#e91e63' : '#2196F3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 'bold', color: 'white',
                    border: '2px solid #333'
                }}>
                    {(myProfile.first_name || currentUser).charAt(0).toUpperCase()}
                </div>

                {/* Name + Status */}
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white' }}>
                        {myProfile.first_name || currentUser}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: getStatusColor(myProfile.status),
                            boxShadow: `0 0 6px ${getStatusColor(myProfile.status || 'offline')}`
                        }} />
                        <select
                            value={(myProfile.status === 'away' || myProfile.status === 'offline') ? preferredStatus : myProfile.status}
                            onChange={(e) => onUpdateStatus(e.target.value as UserStatus)}
                            style={{ appearance: 'none', background: 'transparent', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="online" style={{ background: '#222', color: '#4CAF50' }}>Çevrimiçi</option>
                            <option value="busy" style={{ background: '#222', color: '#ff4444' }}>Meşgul</option>
                        </select>
                        {myProfile.status === 'away' && <span style={{ fontSize: '0.7rem', color: '#FFD700', fontStyle: 'italic' }}>(Uzakta)</span>}
                    </div>
                </div>

                {/* Logout — subtle */}
                <button onClick={onLogout} title="Çıkış Yap" style={{
                    background: 'transparent', border: '1px solid #333',
                    borderRadius: 6, color: '#666', cursor: 'pointer',
                    padding: '6px 8px', display: 'flex', alignItems: 'center',
                    transition: '0.2s', flexShrink: 0
                }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4444'; e.currentTarget.style.color = '#ff4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666'; }}
                >
                    <LogOut size={15} />
                </button>
            </div>

            {/* 2. BÖLÜM: EKİP LİSTESİ */}
            <div style={{
                flex: 1,
                background: '#1a1a1a',
                borderRadius: 12,
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Başlık */}
                <div style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #222',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grup Üyeleri</span>
                    <span style={{ background: '#252525', border: '1px solid #333', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', color: '#aaa' }}>
                        {otherColleagues.length}
                    </span>
                </div>

                {/* Liste */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {otherColleagues.map((user, index) => (
                        <div key={user.id} style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            borderBottom: index < otherColleagues.length - 1 ? '1px solid #222' : 'none',
                            transition: '0.15s'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {/* Initial Avatar */}
                            <div style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                background: user.gender === 'female' ? '#e91e63' : '#2196F3',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', fontWeight: 'bold', color: 'white',
                                position: 'relative'
                            }}>
                                {(user.first_name || user.username).charAt(0).toUpperCase()}
                                {/* Status dot */}
                                <div style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: 9, height: 9, borderRadius: '50%',
                                    background: getStatusColor(user.status || 'offline'),
                                    border: '2px solid #1a1a1a'
                                }} />
                            </div>

                            {/* Name */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold' }}>
                                    {user.first_name || user.username}
                                </div>
                            </div>

                            {/* Status text */}
                            <div style={{ fontSize: '0.75rem', color: getStatusColor(user.status || 'offline') }}>
                                {user.status === 'online' ? 'Çevrimiçi' : user.status === 'busy' ? 'Meşgul' : 'Uzakta'}
                            </div>
                        </div>
                    ))}

                    {otherColleagues.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 30, color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            Henüz grup üyesi yok.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}