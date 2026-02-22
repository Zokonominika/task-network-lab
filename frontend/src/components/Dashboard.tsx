import { useMemo, type ReactNode } from 'react'; 
import { Briefcase, Clock, Eye, Loader, X, ArrowRight } from 'lucide-react'; // CheckCircle sildik
import type { TaskData, UserData } from '../types';

interface DashboardProps {
    isVisible: boolean;
    onClose: () => void;
    currentUser: string;
    myProfile?: UserData;
    allTasks: TaskData[];
}

// StatItem için Tip Tanımı (any hatasını çözer)
interface StatItemProps {
    color: string;
    icon: ReactNode; 
    label: string;
    value: number | string;
    iconBg?: string;
}

export default function Dashboard({ isVisible, onClose, currentUser, myProfile, allTasks }: DashboardProps) {
    
    // --- HOOK'LAR EN ÜSTTE ---

    const dashboardStats = useMemo(() => {
        if (!allTasks || !currentUser) return null;

        const myActiveTasks = allTasks.filter(t => 
            t.status === 'active' && 
            t.assignments.some(a => a.user.username === currentUser && !a.is_completed)
        );

        const myUrgentTasks = myActiveTasks.filter(t => t.priority === 'urgent');

        const waitingForReview = allTasks.filter(t => 
            t.status === 'active' &&
            t.created_by.username === currentUser &&
            t.assignments.every(a => a.is_completed)
        );

        // "Bugün Tamamlanan" verisi hesaplamasını kaldırdık (Yarışma hissi olmasın)

        return {
            active: myActiveTasks.length,
            urgent: myUrgentTasks.length,
            review: waitingForReview.length
        };
    }, [allTasks, currentUser]);

    // Daha Nötr Selamlama
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return "Günaydın";
        if (hour >= 12 && hour < 17) return "İyi Günler";
        return "İyi Akşamlar";
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.95)', // Biraz daha koyu, odaklanmayı artırır
            zIndex: 9999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: '#161616', 
                width: '400px',
                borderRadius: '20px', 
                padding: '30px', 
                border: '1px solid #333',
                boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                position: 'relative',
                display: 'flex', flexDirection: 'column', gap: 20
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 15, right: 15,
                        background: '#222', border: 'none', color: '#888', borderRadius:'50%', width:30, height:30,
                        cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                    }}
                >
                    <X size={18} />
                </button>

                <div style={{textAlign: 'center', borderBottom:'1px solid #333', paddingBottom:20}}>
                    <h2 style={{margin: 0, color: 'white', fontSize: '1.5rem', fontWeight:'500'}}>
                        {getGreeting()}, <br/>
                        <span style={{color: '#00f3ff', fontWeight:'bold', fontSize:'1.8rem'}}> {/* Neon Mavisi daha sakin */}
                            {myProfile ? (myProfile.display_name || currentUser) : currentUser}
                        </span>
                    </h2>
                    <p style={{margin: '10px 0 0 0', color: '#666', fontSize: '0.85rem'}}>
                        Sistem bağlantısı kuruldu. Mevcut iş yükü durumu:
                    </p>
                </div>

                {dashboardStats ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        <StatItem color="#ff4444" icon={<Briefcase size={16} color="white"/>} label="Acil Görevler" value={dashboardStats.urgent} />
                        <StatItem color="#2196F3" icon={<Clock size={16} color="white"/>} label="Aktif Görevler" value={dashboardStats.active} />
                        <StatItem color="#FFD700" icon={<Eye size={16} color="black"/>} label="Onay Bekleyen" value={dashboardStats.review} iconBg="#FFD700" />
                        {/* "Tamamlanan" kutusu kaldırıldı */}
                    </div>
                ) : (
                    <div style={{textAlign:'center', padding:20, color:'#666'}}>
                        <Loader size={24} style={{animation:'spin 1s linear infinite'}} />
                        <div style={{marginTop:10, fontSize:'0.8rem'}}>Veriler senkronize ediliyor...</div>
                    </div>
                )}

                <button 
                    onClick={onClose}
                    style={{
                        marginTop: 10,
                        background: '#333', color: 'white', border: '1px solid #444',
                        padding: '15px', borderRadius: '12px',
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                        transition: '0.2s', width:'100%',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:10
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#444'; e.currentTarget.style.borderColor = '#00f3ff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.borderColor = '#444'; }}
                >
                    Çalışma Alanına Giriş <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
}

// Tip tanımlı StatItem (any yok!)
const StatItem = ({ color, icon, label, value, iconBg }: StatItemProps) => (
    <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: `linear-gradient(90deg, ${color}1a 0%, rgba(30,30,30,0) 100%)`, 
        padding: '15px 20px', borderRadius: 12, borderLeft: `4px solid ${color}`
    }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{background: iconBg || color, padding:8, borderRadius:'50%', display:'flex'}}>{icon}</div>
            <span style={{color:'#ddd', fontSize:'0.95rem'}}>{label}</span>
        </div>
        <span style={{fontSize:'1.5rem', fontWeight:'bold', color: color}}>{value}</span>
    </div>
);