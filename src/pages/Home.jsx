import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation as useLocationHook, getStoredLocation } from '../hooks/useLocation';
import BottomNav from '../components/BottomNav';
import { Siren, MapPin, Hospital, Ambulance, ShieldAlert, Bandage, Car, TriangleAlert, Phone, Shield, X, AlertCircle } from 'lucide-react';
import { fetchNearestHospital } from '../utils/places';

const ACTIONS = [
  { type:'hospital',         icon: Hospital, label:'Hospitals',  sub:'Trauma centres nearby', bg:'icon-hospital'  },
  { type:'ambulance_service',icon: Ambulance, label:'Ambulance',  sub:'Emergency transport',   bg:'icon-ambulance' },
  { type:'police',           icon: ShieldAlert, label:'Police',     sub:'Nearest station',        bg:'icon-police'    },
  { type:'firstaid',         icon: Bandage, label:'First Aid',  sub:'Step-by-step guide',     bg:'icon-firstaid'  },
];

export default function Home() {
  const navigate = useNavigate();
  const { locationText, showBanner } = useLocationHook();
  const [journeyOn, setJourneyOn] = useState(false);
  const [crashVisible, setCrashVisible] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [nearestHospital, setNearestHospital] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [sosCountdown, setSosCountdown] = useState(10);
  const timerRef = useRef(null);
  const sosTimerRef = useRef(null);

  function handleAction(type) {
    if (type === 'firstaid') navigate('/firstaid');
    else navigate(`/nearby?type=${type}`);
  }

  async function handleSOS() {
    setSosActive(true);
    setCountdown(60);

    // 1. Get nearest hospital immediately
    try {
      const loc = await getStoredLocation();
      const hospital = await fetchNearestHospital(loc.lat, loc.lng);
      setNearestHospital(hospital);

      // 2. Send SMS alert to all contacts
      const contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
      // Use stored coords as fallback if real-time fails (works offline/no signal)
      const lat = loc?.lat || localStorage.getItem('userLat') || '0';
      const lng = loc?.lng || localStorage.getItem('userLng') || '0';
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
      const msg = `🚨 SOS from RoadSoS! I may be in an accident. My last location: ${mapsLink}`;
      
      if (contacts.length > 0) {
        // SMS works even when data is lost
        const smsUrl = `sms:${contacts[0].phone}?body=${encodeURIComponent(msg)}`;
        window.location.href = smsUrl;
      }
    } catch (err) {
      console.error("SOS Error:", err);
    }

    // 3. Start 60-second auto-dial countdown
    if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    sosTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(sosTimerRef.current);
          window.location.href = 'tel:108';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function toggleJourney(enabled) {
    setJourneyOn(enabled);
    if (enabled) alert('Journey Mode ON — crash detection is now active.');
  }

  useEffect(() => {
    if (!crashVisible) return;
    setSosCountdown(10);
    timerRef.current = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSOS();
          setCrashVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [crashVisible]);

  useEffect(() => {
    return () => {
      if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    };
  }, []);

  return (
    <>
      {showBanner && (
        <div className="location-banner" onClick={() => window.location.reload()}>
          ⚠️ Tap here — allow location for RoadSoS to work
        </div>
      )}

      <div className="app">
        {/* Topbar */}
        <div className="topbar">
          <div className="logo"><Siren className="text-red-500" size={24} color="#e53935" /> Road<span>SoS</span></div>
          <div className="location-pill"><MapPin size={14} /> {locationText.replace('📍 ','').replace('⏳ ','').replace('🔒 ','').replace('📡 ','').replace('⏱ ','').replace('❌ ','') || 'Detecting…'}</div>
        </div>

        {/* Hero / SOS */}
        <div className="home-hero">
          <div className="sos-wrapper">
            <div className="sos-ring" />
            <div className="sos-ring" />
            <div className="sos-ring" />
            <button className="sos-btn" onClick={handleSOS}>SOS</button>
          </div>
          <p className="sos-hint">Tap to find emergency help near you</p>
        </div>

        {/* Action grid */}
        <p className="section-label" style={{paddingTop:4}}>Quick Actions</p>
        <div className="action-grid">
          {ACTIONS.map(a => (
            <button key={a.type} className="action-card" onClick={() => handleAction(a.type)}>
              <div className={`action-icon ${a.bg}`}>
                <a.icon size={28} />
              </div>
              <div className="action-label">{a.label}</div>
              <div className="action-sub">{a.sub}</div>
            </button>
          ))}
        </div>

        {/* Journey mode */}
        <div className="journey-bar" style={{marginTop:16}}>
          <div className="journey-left">
            <div className="journey-icon-wrap"><Car size={20} color="#e53935" /></div>
            <div>
              <div className="journey-title">Journey Mode</div>
              <div className="journey-sub">Auto-detects crash while driving</div>
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={journeyOn} onChange={e => toggleJourney(e.target.checked)} />
            <span className="slider" />
          </label>
        </div>

        <BottomNav />
      </div>

      {/* Crash overlay */}
      {crashVisible && (
        <div className="crash-overlay show">
          <div className="crash-title"><TriangleAlert size={32} style={{display: 'inline', marginRight: 8}} /> Crash Detected!</div>
          <div className="crash-sub">Sending SOS in...</div>
          <div className="crash-timer">{sosCountdown}</div>
          <button className="btn-cancel" onClick={() => { clearInterval(timerRef.current); setCrashVisible(false); }}>
            I'm OK — Cancel
          </button>
        </div>
      )}

      {/* NEW SOS OVERLAY */}
      {sosActive && (
        <div className="sos-active-overlay" style={{
          position: 'fixed', inset: 0, 
          background: 'linear-gradient(180deg, #e53935 0%, #b71c1c 100%)',
          zIndex: 2000, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px',
          color: '#fff', textAlign: 'center'
        }}>
          <div className="sos-header" style={{ marginBottom: 30 }}>
            <div className="sos-pulse-icon" style={{ 
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Siren size={40} color="#fff" />
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, letterSpacing: -1 }}>SOS ACTIVATED</h2>
            <div style={{ 
              background: 'rgba(0,0,0,0.15)', padding: '8px 20px', borderRadius: 50,
              fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8
            }}>
              <AlertCircle size={16} /> Auto-dialing 108 in {countdown}s
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Nearest hospital */}
            {nearestHospital ? (
              <a href={`tel:${nearestHospital.phone}`} className="sos-card" style={{
                background: '#fff', borderRadius: 20, padding: 20, textAlign: 'left',
                textDecoration: 'none', display: 'block', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#e53935', letterSpacing: 1, textTransform: 'uppercase' }}>Nearest Hospital</span>
                  <div style={{ background: '#fff0f0', color: '#e53935', padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                    {nearestHospital.dist} km
                  </div>
                </div>
                <div style={{ fontSize: 18, color: '#1a1d27', fontWeight: 800, marginBottom: 12 }}>{nearestHospital.name}</div>
                <div style={{ 
                  background: '#e53935', color: '#fff', padding: '12px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700
                }}>
                  <Phone size={18} /> Call Hospital
                </div>
              </a>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: 20, borderRadius: 20, fontSize: 14 }}>
                Fetching nearest hospital...
              </div>
            )}

            {/* Direct buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a href="tel:108" style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                padding: '20px 10px', borderRadius: 20, color: '#fff', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <Ambulance size={24} />
                <div style={{ fontSize: 12, fontWeight: 800 }}>AMBULANCE (108)</div>
              </a>
              <a href="tel:100" style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                padding: '20px 10px', borderRadius: 20, color: '#fff', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <Shield size={24} />
                <div style={{ fontSize: 12, fontWeight: 800 }}>POLICE (100)</div>
              </a>
            </div>
          </div>

          <button 
            onClick={() => {
              if (sosTimerRef.current) clearInterval(sosTimerRef.current);
              setSosActive(false);
            }} 
            style={{
              marginTop: 40, background: 'none', border: '2px solid rgba(255,255,255,0.4)',
              color: '#fff', padding: '12px 32px', borderRadius: 50, fontSize: 14,
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <X size={18} /> I'm okay — Cancel SOS
          </button>
        </div>
      )}
    </>
  );
}
