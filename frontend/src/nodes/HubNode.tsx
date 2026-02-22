import { Handle, Position } from 'reactflow'; // NodeProps sildik, kullanılmıyor
import { Server } from 'lucide-react'; 

const HubNode = () => {
  return (
    <div style={{
        width: 120,
        height: 120,
        background: 'radial-gradient(circle, rgba(0, 243, 255, 0.2) 0%, rgba(0,0,0,0.8) 100%)',
        border: '2px solid #00f3ff',
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 40px rgba(0, 243, 255, 0.4)',
        color: '#00f3ff',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        backdropFilter: 'blur(5px)',
        position: 'relative'
    }}>
      {/* Görsel Süslemeler - Dönen Daire */}
      <div style={{ 
          position: 'absolute', 
          width: '140%', 
          height: '140%', 
          border: '1px dashed rgba(0, 243, 255, 0.3)', 
          borderRadius: '50%', 
          animation: 'spin 10s linear infinite' 
      }} />
      
      <Server size={32} style={{ marginBottom: 5 }} />
      <span style={{letterSpacing: 1}}>Merkez</span>

      {/* Bağlantı Noktaları */}
      <Handle type="source" position={Position.Top} style={{ background: '#00f3ff', opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ background: '#00f3ff', opacity: 0 }} />
      
      <style>{`
        @keyframes spin { 
            from { transform: rotate(0deg); } 
            to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};

export default HubNode;