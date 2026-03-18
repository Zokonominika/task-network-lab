import { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';


export default function WelcomeTutorialKanban() {
    const [step, setStep] = useState<number | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        axios.get(`${API_BASE_URL}/api/users/tutorial_status/`, {

            headers: { 'Authorization': `Token ${token}` }
        }).then(res => {
            if (!res.data.tutorial_seen) setStep(1);
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
                entry_point: skipped ? 'kanban_atla' : 'kanban_tamamla',
                completed_step: step,
                total_steps: steps.length
            }, { headers: { 'Authorization': `Token ${token}`, 'X-Session-ID': sessionId || '' } }).catch(() => { });
        }
        setStep(null);
    };

    if (step === null) return null;

    const steps = [
        {
            title: "Görev Ağacı",
            description: "Sol panelde tüm görevlerini hiyerarşik bir ağaç yapısında görebilirsin. Projenin genel yapısını buradan takip edebilirsin.",
            icon: "🌳"
        },
        {
            title: "Alt Görev Oluşturma",
            description: "Bir görevin üzerine geldiğinde çıkan '+ Alt Görev' butonu ile hızlıca alt kırılımlar oluşturabilirsin.",
            icon: "🌿"
        },
        {
            title: "Görev Detayları",
            description: "Herhangi bir göreve tıkladığında, sağ panelde o göreve ait tüm detaylar, dosyalar ve öğrenci durumları açılır.",
            icon: "📋"
        },
        {
            title: "Sunum Süreci",
            description: "Sağ üstteki 'Sunum Süreci' butonu ile pipeline görünümüne geçebilir, aşamaları takip edebilirsin.",
            icon: "📊"
        },
        {
            title: "Bildirim Takibi",
            description: "Zamanlayıcının yanındaki zil ikonu ile sana gelen tüm güncellemeleri ve atamaları anlık olarak görebilirsin.",
            icon: "🔔"
        }
    ];

    const currentStepData = steps[step - 1];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

            <div style={{
                width: '440px',
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>

                <div style={{
                    fontSize: '4rem',
                    marginBottom: '24px',
                    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
                }}>
                    {currentStepData.icon}
                </div>

                <h2 style={{
                    color: '#212121',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    margin: '0 0 12px 0'
                }}>
                    {currentStepData.title}
                </h2>

                <p style={{
                    color: '#757575',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    margin: '0 0 32px 0'
                }}>
                    {currentStepData.description}
                </p>

                {/* Dots indicator */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '32px'
                }}>
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: step === i + 1 ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                backgroundColor: step === i + 1 ? '#1976D2' : '#E0E0E0',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    width: '100%',
                    gap: '12px',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => closeTutorial(true)}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            color: '#1976D2',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Atla
                    </button>

                    <button
                        onClick={() => {
                            if (step < steps.length) {
                                setStep(step + 1);
                            } else {
                                closeTutorial();
                            }
                        }}
                        style={{
                            flex: 2,
                            background: step === steps.length ? '#4CAF50' : '#1976D2',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 24px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {step === steps.length ? (
                            <>Tamamla <CheckCircle2 size={20} /></>
                        ) : (
                            <>Sonraki <ChevronRight size={20} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
