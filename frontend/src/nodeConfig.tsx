import CyberNode from './nodes/CyberNode';
import HubNode from './nodes/HubNode';

export const CenterAnchorNode = () => (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <style>{`
            @keyframes pulse-merkez {
                0% { border-color: #00ffff; box-shadow: 0 0 10px rgba(0,255,255,0.4); }
                50% { border-color: #008888; box-shadow: 0 0 20px rgba(0,255,255,0.8); }
                100% { border-color: #00ffff; box-shadow: 0 0 10px rgba(0,255,255,0.4); }
            }
        `}</style>
        <div style={{
            width: 70, height: 70, borderRadius: '50%', background: '#0a0a0a',
            border: '2px solid #00ffff', boxShadow: '0 0 15px rgba(0,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-merkez 3s infinite ease-in-out'
        }} />
        <span style={{ color: '#00ffff', marginTop: 10, fontSize: '0.75rem', textShadow: '0 0 5px #00ffff' }}>Merkez</span>
    </div>
);

export const nodeTypes = { 
    cyber: CyberNode, 
    hub: HubNode, 
    anchor: CenterAnchorNode 
};
