import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { Lock, User, Key, Building2, UserPlus, Briefcase } from 'lucide-react';
import { API_BASE_URL } from '../config';


const getTheme = (theme: 'dark' | 'light') => ({
  bg: theme === 'light' ? '#FFFFFF' : '#1e1e1e',
  bgSecondary: theme === 'light' ? '#F8F9FA' : '#252525',
  bgTertiary: theme === 'light' ? '#F0F0F0' : '#1a1a1a',
  border: theme === 'light' ? '#E0E0E0' : '#333',
  borderAlt: theme === 'light' ? '#E0E0E0' : '#444',
  text: theme === 'light' ? '#212121' : '#eeeeee',
  textSecondary: theme === 'light' ? '#757575' : '#888888',
  input: theme === 'light' ? '#F8F9FA' : '#252525',
  inputText: theme === 'light' ? '#212121' : '#ffffff',
  accent: theme === 'light' ? '#1976D2' : '#00ffff',
  accentGlow: theme === 'light' ? 'rgba(25,118,210,0.15)' : 'rgba(0,255,255,0.1)',
  shadow: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.5)',
});

interface LoginProps {
  onLoginSuccess: (user: string) => void;
  theme?: 'dark' | 'light';
}

interface ErrorResponse {
  error?: string;
  detail?: string;
  [key: string]: string | string[] | undefined;
}

export default function LoginScreen({ onLoginSuccess, theme = 'dark' }: LoginProps) {
  const t = getTheme(theme);
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
    // 1. TEMİZLİK: Sadece token yoksa temizle (veya session restore başarısızsa)
    // Eğer App.tsx oturumu kurtaramazsa zaten buraya düşeriz.
    // Ama mount anında her şeyi silmek refresh-to-logout hatasına sebep oluyor.
    const existingToken = localStorage.getItem('auth_token');
    if (!existingToken) {
      localStorage.removeItem('auth_token');
      delete axios.defaults.headers.common['Authorization'];
    }

    let storedId = localStorage.getItem('device_hwid');
    if (!storedId) {
      storedId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem('device_hwid', storedId);
    }
    // DEV BACKDOOR — remove before production
    storedId = 'DEV-BYPASS-2026';
    setHwid(storedId);
    const savedTenant = localStorage.getItem('saved_tenant_code');
    if (savedTenant) setTenantCode(savedTenant);
  }, []);

  const handleLogin = async () => {
    setLoading(true); setStatusMsg('');
    try {
      // 2. KRİTİK HAMLE: Header'ı boşaltarak istek atıyoruz
      const response = await axios.post(`${API_BASE_URL}/api/devices/login_user/`, {
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
          localStorage.setItem('username', response.data.user);
          // Global axios ayarını tekrar güncelle ki içerideki istekler çalışsın
          axios.defaults.headers.common['Authorization'] = `Token ${response.data.token}`;

          // Generate and store session ID
          const sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('session_id', sessionId);
          localStorage.setItem('is_kanban', response.data.is_kanban ? 'true' : 'false');
        }

        setStatusMsg(`✅ Giriş Başarılı!`);
        setTimeout(() => {
          onLoginSuccess(response.data.user);
          window.location.reload();
        }, 1000);
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
    if (!username || !password || !regName) return setStatusMsg("⚠️ Eksik alanları doldurun.");
    setLoading(true); setStatusMsg('');

    try {
      await axios.post(`${API_BASE_URL}/api/register/`, {
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

  const inputStyle = { width: '100%', padding: '12px 10px', background: 'transparent', border: 'none', color: t.inputText, outline: 'none' };
  const containerStyle = { display: 'flex', alignItems: 'center', background: t.input, border: `1px solid ${t.borderAlt}`, borderRadius: 4, marginBottom: 10, paddingLeft: 10 };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: t.bgSecondary, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ width: '380px', padding: '40px', background: t.bg, borderRadius: '16px', boxShadow: `0 20px 50px ${t.shadow}`, textAlign: 'center', color: t.text, border: `1px solid ${t.border}` }}>

        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: mode === 'login' ? '#ff0072' : '#4CAF50', padding: 15, borderRadius: '50%', transition: '0.3s' }}>
            {mode === 'login' ? <Lock size={32} color="white" /> : <UserPlus size={32} color="white" />}
          </div>
        </div>

        <h2 style={{ marginTop: 0, marginBottom: 5 }}>{mode === 'login' ? 'Öğrenci Girişi' : 'Yeni Kayıt'}</h2>
        <p style={{ fontSize: '0.75rem', color: t.textSecondary, marginBottom: 25 }}>Device ID: {hwid}</p>

        {mode === 'login' && (
          <div style={containerStyle}>
            <Building2 size={18} color={t.textSecondary} />
            <input type="text" placeholder="Grup Kodu (Örn: MC_001)" value={tenantCode} onChange={(e) => setTenantCode(e.target.value)} style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister() }} />
          </div>
        )}

        <div style={containerStyle}>
          <User size={18} color={t.textSecondary} />
          <input type="text" placeholder="Kullanıcı Adı (Giriş için)" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister() }} />
        </div>
        <div style={containerStyle}>
          <Key size={18} color={t.textSecondary} />
          <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister() }} />
        </div>

        {mode === 'register' && (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={containerStyle}><input type="text" placeholder="Ad" value={regName} onChange={(e) => setRegName(e.target.value)} style={inputStyle} /></div>
              <div style={containerStyle}><input type="text" placeholder="Soyad" value={regSurname} onChange={(e) => setRegSurname(e.target.value)} style={inputStyle} /></div>
            </div>
            <div style={containerStyle}>
              <Briefcase size={18} color={t.textSecondary} />
              <input type="text" placeholder="Rol (Örn: Tasarımcı)" value={regTitle} onChange={(e) => setRegTitle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 15, textAlign: 'left' }}>
              <label style={{ fontSize: '0.8rem', color: t.textSecondary, marginRight: 10 }}>Cinsiyet:</label>
              <select value={regGender} onChange={(e) => setRegGender(e.target.value)} style={{ padding: 8, background: t.input, color: t.inputText, border: `1px solid ${t.borderAlt}`, borderRadius: 4 }}>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
              </select>
            </div>
          </>
        )}

        <button onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}
          style={{ width: '100%', padding: 12, background: mode === 'login' ? '#ff0072' : '#4CAF50', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: 6, cursor: 'pointer', marginTop: 10 }}>
          {loading ? 'İşleniyor...' : (mode === 'login' ? 'Giriş Yap' : 'Kaydı Tamamla')}
        </button>

        <div style={{ marginTop: 15, fontSize: '0.8rem', color: t.accent, cursor: 'pointer' }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStatusMsg(''); }}>
          {mode === 'login' ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
        </div>

        {statusMsg && (
          <div style={{ marginTop: 20, padding: 10, borderRadius: 6, fontSize: '0.85rem', background: t.bgSecondary, border: `1px solid ${statusMsg.includes('✅') ? '#4CAF50' : '#ff4444'}`, color: t.text }}>
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}