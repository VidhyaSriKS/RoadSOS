import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation as useLocationHook } from '../hooks/useLocation';
import BottomNav from '../components/BottomNav';
import { Siren, MapPin, Hospital, Ambulance, ShieldAlert, Bandage, Car, TriangleAlert } from 'lucide-react';

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
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef(null);

  function handleAction(type) {
    if (type === 'firstaid') navigate('/firstaid');
    else navigate(`/nearby?type=${type}`);
  }

  function toggleJourney(enabled) {
    setJourneyOn(enabled);
    if (enabled) alert('Journey Mode ON — crash detection is now active.');
  }

  useEffect(() => {
    if (!crashVisible) return;
    setCountdown(10);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          navigate('/nearby?type=all');
          setCrashVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [crashVisible]);

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
            <button className="sos-btn" onClick={() => navigate('/nearby?type=all')}>SOS</button>
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
          <div className="crash-timer">{countdown}</div>
          <button className="btn-cancel" onClick={() => { clearInterval(timerRef.current); setCrashVisible(false); }}>
            I'm OK — Cancel
          </button>
        </div>
      )}
    </>
  );
}
