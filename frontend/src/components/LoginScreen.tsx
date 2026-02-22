import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { Lock, User, Key, Building2, UserPlus, Briefcase } from 'lucide-react'; 

interface LoginProps {
  onLoginSuccess: (user: string) => void;
}

interface ErrorResponse {
    error?: string;
    detail?: string;
    [key: string]: string | string[] | undefined; 
}

export default function LoginScreen({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login'); 
  
  const [tenantCode, setTenantCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regSurname, setRegSurname] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regGender, setRegGender] = useState('male');
  
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [hwid, setHwid] = useState('');

  useEffect(() => {
    // 1. TEMİZLİK: Giriş ekranındaysak eski token'ları temizle
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common['Authorization']; 

    let storedId = localStorage.getItem('device_hwid');
    if (!storedId) {
      storedId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem('device_hwid', storedId);
    }
    setHwid(storedId);
    const savedTenant = localStorage.getItem('saved_tenant_code');
    if (savedTenant) setTenantCode(savedTenant);
  }, []);

  const handleLogin = async () => {
    setLoading(true); setStatusMsg('');
    try {
      // 2. KRİTİK HAMLE: Header'ı boşaltarak istek atıyoruz
      const response = await axios.post('http://127.0.0.1:8000/api/devices/login_user/', {
        tenant_code: tenantCode, username, password, hwid
      }, {
          headers: {
              'Authorization': '' // Bozuk token gitmesin
          }
      });

      if (response.data.status === 'approved') {
        localStorage.setItem('saved_tenant_code', tenantCode);
        if (response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
            // Global axios ayarını tekrar güncelle ki içerideki istekler çalışsın
            axios.defaults.headers.common['Authorization'] = `Token ${response.data.token}`;
        }
        
        setStatusMsg(`✅ Giriş Başarılı!`);
        setTimeout(() => { onLoginSuccess(response.data.user); }, 1000);
      } else {
        setStatusMsg('⚠️ ' + response.data.message);
      }
    } catch (error) {
      const err = error as AxiosError<ErrorResponse>;
      if (err.response && err.response.data) {
          const errorMsg = err.response.data.error || err.response.data.detail;
          if (errorMsg) setStatusMsg('❌ ' + errorMsg);
          else setStatusMsg('❌ ' + JSON.stringify(err.response.data));
      } else {
        setStatusMsg('❌ Bağlantı hatası veya sunucu kapalı.');
      }
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
      if(!username || !password || !regName) return setStatusMsg("⚠️ Eksik alanları doldurun.");
      setLoading(true); setStatusMsg('');
      
      try {
          await axios.post('http://127.0.0.1:8000/api/register/', {
              username, password, 
              first_name: regName, last_name: regSurname,
              title: regTitle, gender: regGender
          }, {
              headers: { 'Authorization': '' } // Token gitmesin
          });

          setStatusMsg("✅ Kayıt Başarılı! Şimdi IT'nin onaylamasını bekleyin, sonra giriş yapın.");
          setTimeout(() => { setMode('login'); setStatusMsg(''); }, 3000);
      } catch (error) {
          const err = error as AxiosError<ErrorResponse>;
          let msg = "Kayıt hatası.";
          if (err.response?.data) msg = JSON.stringify(err.response.data);
          else if (err.message) msg = err.message;
          setStatusMsg('❌ ' + msg);
      } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '12px 10px', background: 'transparent', border:'none', color:'white', outline: 'none' };
  const containerStyle = { display: 'flex', alignItems: 'center', background: '#252525', border: '1px solid #444', borderRadius: 4, marginBottom: 10, paddingLeft: 10 };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#111', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ width: '380px', padding: '40px', background: '#1e1e1e', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', textAlign: 'center', color: 'white', border: '1px solid #333' }}>
        
        <div style={{marginBottom: 20, display:'flex', justifyContent:'center'}}>
            <div style={{background: mode==='login'?'#ff0072':'#4CAF50', padding: 15, borderRadius: '50%', transition:'0.3s'}}>
                {mode==='login' ? <Lock size={32} color="white" /> : <UserPlus size={32} color="white" />}
            </div>
        </div>
        
        <h2 style={{marginTop: 0, marginBottom: 5}}>{mode==='login' ? 'Personel Girişi' : 'Yeni Personel Kaydı'}</h2>
        <p style={{fontSize: '0.75rem', color: '#666', marginBottom: 25}}>Device ID: {hwid}</p>

        {mode === 'login' && (
            <div style={containerStyle}>
                <Building2 size={18} color="#888" />
                <input type="text" placeholder="Şirket Kodu (Örn: MC_001)" value={tenantCode} onChange={(e) => setTenantCode(e.target.value)} style={inputStyle} />
            </div>
        )}

        <div style={containerStyle}>
            <User size={18} color="#888" />
            <input type="text" placeholder="Kullanıcı Adı (Giriş için)" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        </div>
        <div style={containerStyle}>
            <Key size={18} color="#888" />
            <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>

        {mode === 'register' && (
            <>
                <div style={{display:'flex', gap:10}}>
                    <div style={containerStyle}><input type="text" placeholder="Ad" value={regName} onChange={(e) => setRegName(e.target.value)} style={inputStyle} /></div>
                    <div style={containerStyle}><input type="text" placeholder="Soyad" value={regSurname} onChange={(e) => setRegSurname(e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={containerStyle}>
                    <Briefcase size={18} color="#888" />
                    <input type="text" placeholder="Unvan (Örn: Tasarımcı)" value={regTitle} onChange={(e) => setRegTitle(e.target.value)} style={inputStyle} />
                </div>
                <div style={{marginBottom:15, textAlign:'left'}}>
                    <label style={{fontSize:'0.8rem', color:'#aaa', marginRight:10}}>Cinsiyet:</label>
                    <select value={regGender} onChange={(e) => setRegGender(e.target.value)} style={{padding:8, background:'#333', color:'white', border:'1px solid #555', borderRadius:4}}>
                        <option value="male">Erkek</option>
                        <option value="female">Kadın</option>
                    </select>
                </div>
            </>
        )}

        <button onClick={mode==='login' ? handleLogin : handleRegister} disabled={loading} 
            style={{ width: '100%', padding: 12, background: mode==='login'?'#ff0072':'#4CAF50', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: 6, cursor: 'pointer', marginTop: 10 }}>
          {loading ? 'İşleniyor...' : (mode==='login' ? 'Giriş Yap' : 'Kaydı Tamamla')}
        </button>

        <div style={{marginTop: 15, fontSize: '0.8rem', color: '#aaa', cursor:'pointer'}} onClick={() => { setMode(mode==='login'?'register':'login'); setStatusMsg(''); }}>
            {mode==='login' ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
        </div>

        {statusMsg && (
          <div style={{ marginTop: 20, padding: 10, borderRadius: 6, fontSize: '0.85rem', background: '#333', border: `1px solid ${statusMsg.includes('✅') ? '#4CAF50' : '#ff4444'}`, color:'white' }}>
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}