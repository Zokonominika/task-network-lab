import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';


interface DeadlineTimerProps {
    token: string | null;
}

export default function DeadlineTimer({ token }: DeadlineTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [isWarning, setIsWarning] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const fetchDeadline = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/presentation/current/`, {

                    headers: { 'Authorization': `Token ${token}` }
                });
                const endDate = new Date(res.data.end_date);

                const tick = () => {
                    const now = new Date();
                    const diff = endDate.getTime() - now.getTime();

                    if (diff <= 0) {
                        setIsExpired(true);
                        setTimeLeft('Süre Doldu');
                        return;
                    }

                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                    setIsWarning(diff < 24 * 60 * 60 * 1000);

                    if (days > 0) {
                        setTimeLeft(`${days}g ${hours}s kaldı`);
                    } else if (hours > 0) {
                        setTimeLeft(`${hours}s ${minutes}dk kaldı`);
                    } else {
                        setTimeLeft(`${minutes}dk kaldı`);
                    }
                };

                tick();
                const interval = setInterval(tick, 60000);
                return () => clearInterval(interval);

            } catch {
                setTimeLeft(null);
            }
        };

        if (token) fetchDeadline();
    }, [token]);

    if (!timeLeft) return null;

    return (
        <div style={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            color: isExpired ? '#ff4444' : isWarning ? '#FFD700' : '#4CAF50',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            animation: isWarning && !isExpired ? 'pulse 1.5s infinite' : 'none'
        }}>
            {isExpired ? '⏰' : isWarning ? '⚠️' : '🟢'} {timeLeft}
        </div>
    );
}