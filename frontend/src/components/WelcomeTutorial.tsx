import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';


export default function WelcomeTutorial() {
    const [step, setStep] = useState<number | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        axios.get(`${API_BASE_URL}/api/users/tutorial_status/`, {

            headers: { 'Authorization': `Token ${token}` }
        }).then(res => {
            if (!res.data.tutorial_seen) setStep(0);
        }).catch(() => { });
    }, []);

    const closeTutorial = (skipped: boolean = false) => {
        const token = localStorage.getItem('auth_token');
        const sessionId = localStorage.getItem('session_id');
        if (token) {
            axios.post(`${API_BASE_URL}/api/users/tutorial_status/`, {}, {

                headers: { 'Authorization': `Token ${token}` }
            }).catch(() => { });

            axios.post(`${API_BASE_URL}/api/research/log_interaction/`, {

                event_type: 'tutorial_interaction',
                action: skipped ? 'skipped' : 'completed',
                entry_point: skipped ? 'kesfedeyim' : 'anlat_bana'
            }, { headers: { 'Authorization': `Token ${token}`, 'X-Session-ID': sessionId || '' } }).catch(() => { });
        }
        setStep(null);
    };

    if (step === null) return null;

    // Fade-in animation style
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: step === 0 ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease forwards',
        pointerEvents: 'auto',
    };

    const cardStyle: React.CSSProperties = {
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    };

    const tooltipCardStyle = (pos: React.CSSProperties): React.CSSProperties => ({
        position: 'fixed',
        background: '#1a1a1a',
        border: '1px solid #00ffff33',
        borderRadius: '12px',
        padding: '20px',
        width: '280px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        zIndex: 9999,
        ...pos
    });

    const buttonPinkStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #ff0072, #ff4da6)',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        flex: 1,
        transition: '0.2s',
    };

    const buttonDarkStyle: React.CSSProperties = {
        background: '#252525',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '12px 24px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        flex: 1,
        transition: '0.2s',
    };

    const buttonCyanStyle: React.CSSProperties = {
        background: 'transparent',
        border: '1px solid #00ffff',
        borderRadius: '8px',
        padding: '10px 20px',
        color: '#00ffff',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '15px',
        width: '100%',
        transition: '0.2s',
    };

    const arrowStyle = (direction: 'up' | 'down', side: 'left' | 'right' | 'center'): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            color: '#00ffff33',
            fontSize: '1.2rem',
            left: side === 'center' ? '50%' : side === 'left' ? '20px' : 'auto',
            right: side === 'right' ? '20px' : 'auto',
            transform: side === 'center' ? 'translateX(-50%)' : 'none',
        };
        if (direction === 'up') {
            return { ...base, top: '-24px' };
        } else {
            return { ...base, bottom: '-24px' };
        }
    };

    return (
        <>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulse-cyan {
                    0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(0, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
                }
                `}
            </style>

            <div style={overlayStyle}>
                {step === 0 && (
                    <div style={cardStyle}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(0, 255, 255, 0.1)', border: '2px solid #00ffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', margin: '0 auto 24px auto',
                            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                        }}>
                            🎓
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.8rem', margin: '0 0 12px 0' }}>Hoş geldin!</h2>
                        <p style={{ color: '#aaa', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 32px 0' }}>
                            Sunum çalışma alanına hoş geldin. Nasıl devam etmek istersin?
                        </p>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button style={buttonPinkStyle} onClick={() => setStep(1)}>🗺️ Anlat Bana</button>
                            <button style={buttonDarkStyle} onClick={() => closeTutorial(true)}>🚀 Keşfedeyim</button>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div style={tooltipCardStyle({ top: '75px', left: '10px' })}>
                        <div style={{ ...arrowStyle('up', 'left') }}>▲</div>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>1 / 7</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>⏰ Sunum Sayacı</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Sol üstte sunumuna kalan süreyi görebilirsin. Sarıya döndüğünde son 24 saat!</p>
                        <button style={buttonCyanStyle} onClick={() => setStep(2)}>Sonraki →</button>
                    </div>
                )}

                {step === 2 && (
                    <div style={tooltipCardStyle({ top: '75px', left: '153px' })}>
                        <div style={{ ...arrowStyle('up', 'left') }}>▲</div>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>2 / 8</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>🏠 Ana Ekran</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Ev butonu seni her zaman çalışma tahtasının merkezine döndürür.</p>
                        <button style={buttonCyanStyle} onClick={() => setStep(3)}>Sonraki →</button>
                    </div>
                )}

                {step === 3 && (
                    <div style={tooltipCardStyle({ top: '75px', left: '208px' })}>
                        <div style={{ ...arrowStyle('up', 'left') }}>▲</div>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>3 / 8</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>➕ Yeni Görev</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Artı butonu ile yeni görev oluşturabilirsin. Ekip arkadaşlarını atayabilir, dosya ekleyebilirsin.</p>
                        <button style={buttonCyanStyle} onClick={() => setStep(4)}>Sonraki →</button>
                    </div>
                )}

                {step === 4 && (
                    <div style={tooltipCardStyle({ top: '75px', left: '263px' })}>
                        <div style={{ ...arrowStyle('up', 'left') }}>▲</div>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>4 / 7</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>📊 Sunum Takibi</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Grafik ikonu sunum aşamalarını gösterir. Her aşamayı sırayla tamamla — son aşamada seni kısa bir anket bekliyor!</p>
                        <button style={buttonCyanStyle} onClick={() => setStep(5)}>Sonraki →</button>
                    </div>
                )}

                {step === 5 && (
                    <div style={tooltipCardStyle({ top: '75px', right: '10px' })}>
                        <div style={{ ...arrowStyle('up', 'right') }}>▲</div>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>5 / 7</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>🔔 Bildirimler</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Sağ üstteki zil ikonu sana gelen bildirimleri gösterir. Görev atamaları ve güncellemeler buraya düşer.</p>
                        <button style={buttonCyanStyle} onClick={() => setStep(6)}>Sonraki →</button>
                    </div>
                )}

                {step === 6 && (
                    <div style={tooltipCardStyle({ bottom: '80px', left: '10px' })}>
                        <div style={{ ...arrowStyle('down', 'left') }}>▼</div>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>6 / 7</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>📬 Gelen Kutusu</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Sol alttaki Gelen Kutusu sana atanan görevleri gösterir. Buradan görevlere hızlıca erişebilirsin.</p>
                        <button style={buttonCyanStyle} onClick={() => setStep(7)}>Sonraki →</button>
                    </div>
                )}

                {step === 7 && (
                    <div style={tooltipCardStyle({ top: '50%', left: '50%', transform: 'translateX(-50%) translateY(-50%)' })}>
                        <div style={{ color: '#00ffff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>7 / 7</div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.1rem' }}>🗂️ Görev Tahtası</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0' }}>Bu alan senin çalışma tahtandır. Görevler burada düğüm olarak görünür, aralarında bağlantı kurabilirsin. Düğümlere tıklayarak detayları açabilirsin.</p>
                        <button style={buttonCyanStyle} onClick={() => closeTutorial(false)}>Başlayalım! 🚀</button>
                    </div>
                )}
            </div>
        </>
    );
}
