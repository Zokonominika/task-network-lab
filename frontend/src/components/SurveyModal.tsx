import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

import { Trophy, ArrowRight, Check } from 'lucide-react';

interface Question {
    id: number;
    text: string;
    order: number;
}

interface SurveyModalProps {
    isOpen: boolean;
    token: string | null;
    sessionId: string | null;
}

const SurveyModal: React.FC<SurveyModalProps> = ({ isOpen, token, sessionId }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: number]: number }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
    const [timeTracking, setTimeTracking] = useState<{ [key: number]: number }>({});

    useEffect(() => {
        if (isOpen && token) fetchQuestions();
    }, [isOpen, token]);

    useEffect(() => {
        if (isOpen && questions.length > 0) setQuestionStartTime(Date.now());
    }, [isOpen, currentIndex, questions.length]);

    useEffect(() => {
        if (!isFinished) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finalizeAndLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isFinished]);

    const fetchQuestions = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/survey/questions/`);

            setQuestions(res.data);
        } catch (e) {
            console.error("Survey questions fetch error", e);
        }
    };

    const handleAnswer = (questionId: number, value: number) => {
        const answerTime = Date.now();
        const timeOnQuestion = answerTime - questionStartTime;
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        setTimeTracking(prev => ({ ...prev, [questionId]: timeOnQuestion }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            submitSurvey();
        }
    };

    const submitSurvey = async () => {
        if (!token) return;
        setIsSubmitting(true);
        try {
            const responses = Object.entries(answers).map(([qId, val]) => ({
                question_id: parseInt(qId),
                answer: val,
                time_on_question_ms: timeTracking[parseInt(qId)] || 0
            }));

            await axios.post(`${API_BASE_URL}/api/survey/submit_responses/`,

                { responses },
                {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'X-Session-ID': sessionId || 'unknown'
                    }
                }
            );

            setIsFinished(true);

        } catch (e: any) {
            console.error("Survey submission error", e);
            const errorDetail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || 'Bilinmeyen hata';
            alert(`Hata detayı: ${errorDetail}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalizeAndLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await axios.post(`${API_BASE_URL}/api/users/deactivate_me/`, {}, {

                headers: { 'X-Session-ID': sessionId || '' }
            });
        } catch (e) {
            console.error("Deactivation error", e);
        } finally {
            localStorage.clear();
            window.location.href = '/';
        }
    };

    if (!isOpen) return null;

    if (isFinished) {
        return (
            <div style={modalOverlayStyle}>
                <div style={containerStyle}>
                    <Trophy size={80} color="#00ffff" style={{ marginBottom: '24px', filter: 'drop-shadow(0 0 15px #00ffff)' }} />
                    <h1 style={{ color: '#00ffff', marginBottom: '16px' }}>Teşekkürler!</h1>
                    <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '8px' }}>Sunumunuz başarıyla tamamlandı. 🎉</p>
                    <p style={{ color: '#888' }}>Verileriniz araştırma havuzuna güvenli bir şekilde aktarıldı.</p>
                    <div style={{ marginTop: '40px', border: '1px solid #333', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ margin: 0, color: '#00ffff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Sistem {countdown} saniye içinde kapatılıyor...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const canGoNext = currentQuestion && answers[currentQuestion.id] !== undefined;
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

    return (
        <div style={modalOverlayStyle}>
            <div style={{ ...containerStyle, maxWidth: '800px' }}>
                <div style={{ width: '100%', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#00ffff', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                            ARAŞTIRMA ANKETİ
                        </span>
                        <span style={{ color: '#888', fontSize: '0.9rem' }}>
                            Soru {questions.length > 0 ? currentIndex + 1 : 0} / {questions.length}
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#333', borderRadius: '2px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: '#00ffff', borderRadius: '2px', transition: 'width 0.3s ease', boxShadow: '0 0 10px #00ffff' }}></div>
                    </div>
                </div>

                {currentQuestion ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '40px', lineHeight: '1.4' }}>
                            {currentQuestion.text}
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '50px' }}>
                            {[1, 2, 3, 4, 5].map((val) => {
                                const labels = ["Kesinlikle Katılmıyorum", "Katılmıyorum", "Kararsızım", "Katılıyorum", "Kesinlikle Katılıyorum"];
                                const isSelected = answers[currentQuestion.id] === val;
                                return (
                                    <button
                                        key={val}
                                        onClick={() => handleAnswer(currentQuestion.id, val)}
                                        style={{
                                            flex: 1, padding: '20px 10px',
                                            background: isSelected ? 'rgba(0, 255, 255, 0.1)' : '#1a1a1a',
                                            border: `1px solid ${isSelected ? '#00ffff' : '#333'}`,
                                            borderRadius: '8px',
                                            color: isSelected ? '#00ffff' : '#888',
                                            cursor: 'pointer', transition: 'all 0.2s ease',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                            boxShadow: isSelected ? '0 0 20px rgba(0, 255, 255, 0.2)' : 'none'
                                        }}
                                    >
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${isSelected ? '#00ffff' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ffff' }}></div>}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
                                            {labels[val - 1]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={handleNext}
                            disabled={!canGoNext || isSubmitting}
                            style={{
                                padding: '15px 40px',
                                background: canGoNext ? '#00ffff' : '#333',
                                color: canGoNext ? '#000' : '#666',
                                border: 'none', borderRadius: '30px',
                                fontSize: '1.1rem', fontWeight: 'bold',
                                cursor: canGoNext ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s ease',
                                display: 'inline-flex', alignItems: 'center', gap: '10px',
                                boxShadow: canGoNext ? '0 0 20px rgba(0, 255, 255, 0.4)' : 'none'
                            }}
                        >
                            {isSubmitting ? 'Gönderiliyor...' : (
                                currentIndex === questions.length - 1
                                    ? <><Check size={20} /> Tamamla</>
                                    : <><ArrowRight size={20} /> Sonraki</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div style={{ color: '#666' }}>Anket yükleniyor...</div>
                )}
            </div>
        </div>
    );
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.96)',
    zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
};

const containerStyle: React.CSSProperties = {
    width: '90%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px',
};

export default SurveyModal;