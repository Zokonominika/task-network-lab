import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

import { CheckCircle, Lock, Rocket } from 'lucide-react';
import type { PipelineStage } from '../types';

interface PipelinePanelProps {
    token: string | null;
    currentUser: string;
    onSurveyTrigger: () => void;
}

const PipelinePanel: React.FC<PipelinePanelProps> = ({ token, onSurveyTrigger }) => {
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeStageId, setActiveStageId] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const timedStagesRef = useRef<Set<number>>(new Set());
    const isFirstStageRef = useRef(true);

    const fetchStages = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/pipeline/my_stages/`);

            const fetchedStages = res.data as PipelineStage[];
            setStages(fetchedStages);

            // Detect current active stage
            const current = fetchedStages.find(s => s.unlocked && !s.is_completed);
            if (current && current.id !== activeStageId) {
                setActiveStageId(current.id);
                // Skip timer for first stage, apply for all subsequent ones
                if (isFirstStageRef.current) {
                    isFirstStageRef.current = false;
                } else if (!timedStagesRef.current.has(current.id)) {
                    timedStagesRef.current.add(current.id);
                    setTimeLeft(30);
                }
            }
        } catch (e) {
            console.error("Pipeline fetch error", e);
        } finally {
            setLoading(false);
        }
    }, [token, activeStageId]);

    useEffect(() => {
        fetchStages();
    }, [fetchStages]);

    useEffect(() => {
        if (timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft]);

    const completeStage = async (taskId: number, isFinal: boolean) => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/pipeline/complete_stage/`, { task_id: taskId });

            if (isFinal) {
                onSurveyTrigger();
            }
            fetchStages();
        } catch (e) {
            console.error("Complete stage error", e);
        } finally {
            setLoading(false);
        }
    };

    const completedCount = stages.filter(s => s.is_completed).length;
    const progressPercent = stages.length > 0 ? (completedCount / stages.length) * 100 : 0;
    const allCompleted = stages.length > 0 && completedCount === stages.length;

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: '#1e1e1e', color: '#eee', padding: '20px',
            overflow: 'hidden'
        }}>
            <style>{`
                .stage-card {
                    background: #252525;
                    border: 1px solid #333;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }
                .stage-card.current {
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
                    border-color: #00ffff;
                    background: #1a2a2a;
                }
                .glow-btn {
                    background: transparent;
                    border: 1px solid #00ffff;
                    color: #00ffff;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s;
                    margin-top: 10px;
                    width: 100%;
                }
                .glow-btn:hover:not(:disabled) {
                    background: rgba(0, 255, 255, 0.1);
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
                }
                .glow-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .progress-bar-container {
                    width: 100%;
                    height: 6px;
                    background: #333;
                    border-radius: 3px;
                    margin: 10px 0 20px 0;
                    overflow: hidden;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: #00ffff;
                    transition: width 0.5s ease-out;
                    box-shadow: 0 0 10px #00ffff;
                }
            `}</style>

            {/* Header */}
            <div style={{ flexShrink: 0, marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#00ffff', fontWeight: 600 }}>Tamamlama Durumu</h2>
                    <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold' }}>%{Math.round(progressPercent)}</span>
                </div>
                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            {/* Stages — no scroll */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                {allCompleted ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Rocket size={48} color="#00ffff" style={{ marginBottom: '20px', filter: 'drop-shadow(0 0 8px #00ffff)' }} />
                        <h3 style={{ color: '#00ffff', marginBottom: '10px' }}>Sunumunuz tamamlandı! 🎉</h3>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>Tüm adımları başarıyla geçtiniz.</p>
                    </div>
                ) : (
                    stages.map((stage) => {
                        const isLocked = !stage.unlocked && !stage.is_completed;
                        const isCurrent = stage.unlocked && !stage.is_completed;

                        return (
                            <div key={stage.id}>
                                {/* Kilitli label OUTSIDE the card */}
                                {isLocked && (
                                    <div style={{
                                        fontSize: '0.6rem', color: '#444', fontWeight: 'bold',
                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                        marginBottom: '2px', paddingLeft: '4px',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <Lock size={9} color="#444" /> Kilitli
                                    </div>
                                )}

                                <div className={`stage-card ${isCurrent ? 'current' : ''}`} style={{
                                    padding: isLocked ? '18px 24px' : '24px',
                                    opacity: isLocked ? 0.35 : 1,
                                    filter: isLocked ? 'grayscale(0.5)' : 'none',
                                }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        {/* Icon */}
                                        <div style={{ flexShrink: 0 }}>
                                            {stage.is_completed ? (
                                                <CheckCircle size={18} color="#4caf50" />
                                            ) : isLocked ? (
                                                <Lock size={16} color="#444" />
                                            ) : (
                                                <div style={{
                                                    width: '18px', height: '18px', borderRadius: '50%',
                                                    border: '2px solid #00ffff', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <div style={{
                                                        width: '6px', height: '6px', borderRadius: '50%',
                                                        background: '#00ffff', boxShadow: '0 0 6px #00ffff'
                                                    }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{
                                                    margin: 0,
                                                    fontSize: isLocked ? '0.8rem' : '0.95rem',
                                                    color: isCurrent ? '#fff' : isLocked ? '#555' : '#ddd'
                                                }}>
                                                    {stage.title}
                                                </h4>
                                                {/* Status badge — only for completed and current */}
                                                {!isLocked && (
                                                    <span style={{
                                                        fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px',
                                                        background: stage.is_completed ? 'rgba(76,175,80,0.1)' : 'rgba(0,255,255,0.1)',
                                                        color: stage.is_completed ? '#4caf50' : '#00ffff',
                                                        border: `1px solid ${stage.is_completed ? 'rgba(76,175,80,0.3)' : 'rgba(0,255,255,0.3)'}`,
                                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                                        fontWeight: 'bold', flexShrink: 0, marginLeft: '8px'
                                                    }}>
                                                        {stage.is_completed ? 'Tamamlandı' : 'Devam Ediyor'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Description — hide for locked */}
                                            {!isLocked && stage.description && (
                                                <p style={{
                                                    margin: '4px 0 0 0', fontSize: '0.78rem',
                                                    color: '#777', lineHeight: '1.4'
                                                }}>
                                                    {stage.description}
                                                </p>
                                            )}

                                            {isCurrent && (
                                                <button
                                                    className="glow-btn"
                                                    onClick={() => completeStage(stage.task_id, stage.is_final_stage)}
                                                    disabled={loading || timeLeft > 0}
                                                >
                                                    {loading ? 'İşleniyor...' :
                                                        timeLeft > 0 ? `⏳ ${timeLeft}s` :
                                                            stage.is_final_stage ? '📋 Sunumu Tamamla' : 'Aşamayı Tamamla'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PipelinePanel;