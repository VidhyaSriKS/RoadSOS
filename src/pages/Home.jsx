import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation as useLocationHook, getStoredLocation } from '../hooks/useLocation';
import BottomNav from '../components/BottomNav';
import LocationGuard from '../components/LocationGuard';
import { Siren, MapPin, Hospital, Ambulance, ShieldAlert, Bandage, Car, TriangleAlert, Phone, Shield, X, AlertCircle, DownloadCloud, Wrench, Truck, Pill, Fuel } from 'lucide-react';
import { fetchNearestHospital, getEmergencyContact } from '../utils/places';
import { downloadRegion } from '../services/offlineManager';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const ACTIONS = [
  { type:'hospital',         icon: Hospital, label:'Hospitals',  sub:'Trauma centres nearby', bg:'icon-hospital'  },
  { type:'ambulance_service',icon: Ambulance, label:'Ambulance',  sub:'Emergency transport',   bg:'icon-ambulance' },
  { type:'police',           icon: ShieldAlert, label:'Police',     sub:'Nearest station',        bg:'icon-police'    },
  { type:'repair',           icon: Wrench,     label:'Repair',     sub:'Vehicle help',           bg:'icon-hospital'  },
  { type:'towing',           icon: Truck,      label:'Towing',     sub:'Recovery service',       bg:'icon-police'    },
  { type:'pharmacy',         icon: Pill,       label:'Pharmacy',   sub:'Medicines nearby',      bg:'icon-firstaid'  },
  { type:'fuel',             icon: Fuel,       label:'Fuel',       sub:'Gas stations',           bg:'icon-ambulance' },
  { type:'firstaid',         icon: Bandage,    label:'First Aid',  sub:'Step-by-step guide',     bg:'icon-firstaid'  },
];

export default function Home() {
  const navigate = useNavigate();
  const { locationText, permissionStatus, isUsingCachedLocation, refreshLocation, forceRefetch } = useLocationHook();
  const [journeyOn, setJourneyOn] = useState(false);
  const [crashVisible, setCrashVisible] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [nearestHospital, setNearestHospital] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [sosCountdown, setSosCountdown] = useState(15);
  const [isDownloading, setIsDownloading] = useState(false);
  const timerRef = useRef(null);
  const sosTimerRef = useRef(null);

  const speak = async (text) => {
    try {
      // Native plugin works much better on Android/iOS
      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: text,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
      } else if ('speechSynthesis' in window) {
        // Fallback for browser testing
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(msg);
      }
    } catch (e) {
      console.error("Speech Error:", e);
    }
  };

  const countryCode = localStorage.getItem('countryCode') || 'IN';
  const emContacts = getEmergencyContact(countryCode);

  async function handleDownloadOffline() {
    setIsDownloading(true);
    try {
      const loc = await getStoredLocation();
      await downloadRegion(loc.lat, loc.lng);
      alert(`Successfully downloaded 50km regional map for offline use!`);
    } catch (e) {
      alert("Failed to download offline data. Please check your internet connection.");
    } finally {
      setIsDownloading(false);
    }
  }

  function handleAction(type) {
    if (type === 'firstaid') navigate('/firstaid');
    else navigate(`/nearby?type=${type}`);
  }

  async function handleSOS() {
    setSosActive(true);
    setCountdown(60);

    // Voice Alert
    await speak("SOS Activated. Emergency services will be contacted.");

    try {
      const loc = await getStoredLocation();
      const hospital = await fetchNearestHospital(loc.lat, loc.lng);
      setNearestHospital(hospital);

      const contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
      const lat = loc?.lat || localStorage.getItem('userLat') || '0';
      const lng = loc?.lng || localStorage.getItem('userLng') || '0';
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
      const msg = `🚨 SOS from RoadSoS! I may be in an accident. My last location: ${mapsLink}`;
      
      if (contacts.length > 0) {
        // Concatenate all numbers. Android uses comma, iOS uses semicolon.
        const separator = Capacitor.getPlatform() === 'ios' ? ';' : ',';
        const phoneNumbers = contacts.map(c => c.phone).join(separator);
        const smsUrl = `sms:${phoneNumbers}${Capacitor.getPlatform() === 'ios' ? '&' : '?'}body=${encodeURIComponent(msg)}`;
        window.location.href = smsUrl;
      }
    } catch (err) {
      console.error("SOS Error:", err);
      // Location failed — still send SMS using last cached coords
      const contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
      const lat = localStorage.getItem('userLat') || '0';
      const lng = localStorage.getItem('userLng') || '0';
      if (contacts.length > 0) {
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        const msg = `🚨 SOS from RoadSoS! I may be in an accident. My last known location: ${mapsLink}`;
        const separator = Capacitor.getPlatform() === 'ios' ? ';' : ',';
        const phoneNumbers = contacts.map(c => c.phone).join(separator);
        const smsUrl = `sms:${phoneNumbers}${Capacitor.getPlatform() === 'ios' ? '&' : '?'}body=${encodeURIComponent(msg)}`;
        window.location.href = smsUrl;
      }
    }

    if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    sosTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(sosTimerRef.current);
          window.location.href = `tel:${emContacts.sos}`;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function toggleJourney(enabled) {
    setJourneyOn(enabled);
    if (enabled) alert('Journey Mode ON — simulating accelerometer monitoring.');
  }

  // CRASH DETECTION SIMULATION
  useEffect(() => {
    if (!journeyOn) return;

    let spikeCount = 0;
    const interval = setInterval(() => {
      const gForce = 1 + (Math.random() > 0.99 ? (Math.random() * 5) : (Math.random() * 0.5));
      if (gForce > 2.5) {
        spikeCount++;
        if (spikeCount >= 2) {
          setCrashVisible(true);
          spikeCount = 0;
        }
      } else {
        spikeCount = 0;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [journeyOn]);

  useEffect(() => {
    if (!crashVisible) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    speak("Accident detected. Emergency services will be contacted.");

    setSosCountdown(15);
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
      {permissionStatus === 'denied' && (
        <LocationGuard onRetry={forceRefetch} />
      )}

      <div className="app">
        <div className="topbar">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/logo.jpg" alt="RoadSoS" style={{ height: 45, width: 'auto', marginRight: 4 }} />
            Road<span>SoS</span>
          </div>
          <div
            className={`location-pill ${isUsingCachedLocation ? 'location-pill-warn' : ''}`}
            style={{ cursor: isUsingCachedLocation ? 'pointer' : 'default' }}
            onClick={isUsingCachedLocation ? forceRefetch : undefined}
            title={isUsingCachedLocation ? 'Tap to retry GPS lock' : ''}
          >
            <MapPin size={14} />
            {locationText.replace('📍 ','').replace('⏳ ','').replace('🔒 ','').replace('📡 ','').replace('⏱ ','').replace('❌ ','') || 'Detecting…'}
            {isUsingCachedLocation && <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 2 }}>(cached)</span>}
          </div>
        </div>

        <div className="home-hero">
          <div className="sos-wrapper">
            <div className="sos-ring" />
            <div className="sos-ring" />
            <div className="sos-ring" />
            <button className="sos-btn" onClick={handleSOS}>SOS</button>
          </div>
          <p className="sos-hint">Tap for emergency help</p>
        </div>

        <p className="section-label" style={{paddingTop:4}}>Nearby Assistance</p>
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

        <div className="journey-bar" style={{marginTop:12, marginBottom: 80, cursor: 'pointer', opacity: isDownloading ? 0.7 : 1}} onClick={!isDownloading ? handleDownloadOffline : undefined}>
          <div className="journey-left">
            <div className="journey-icon-wrap" style={{background: '#e3f2fd'}}>
              <DownloadCloud size={20} color="#1976d2" className={isDownloading ? 'spin' : ''} />
            </div>
            <div>
              <div className="journey-title">Download Offline Area</div>
              <div className="journey-sub">
                {isDownloading ? 'Caching 50km region...' : 'Save map & help for offline use'}
              </div>
            </div>
          </div>
        </div>

        {/* GPS Signal Lost — non-blocking soft banner */}
        {permissionStatus === 'error' && (
          <div className="gps-lost-banner">
            <div className="gps-lost-left">
              <span className="gps-lost-dot" />
              <span>
                {isUsingCachedLocation
                  ? '⚠️ Weak GPS — using last known location'
                  : '⚠️ GPS signal lost — move to open area'}
              </span>
            </div>
            <button className="gps-retry-btn" onClick={forceRefetch}>Retry</button>
          </div>
        )}

        <BottomNav />
      </div>

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
              <AlertCircle size={16} /> Auto-dialing {emContacts.sos} in {countdown}s
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {nearestHospital ? (
              <a href={`tel:${nearestHospital.phone || emContacts.hospital}`} className="sos-card" style={{
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a href={`tel:${emContacts.hospital}`} style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                padding: '20px 10px', borderRadius: 20, color: '#fff', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <Ambulance size={24} />
                <div style={{ fontSize: 12, fontWeight: 800 }}>AMBULANCE ({emContacts.hospital})</div>
              </a>
              <a href={`tel:${emContacts.police}`} style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                padding: '20px 10px', borderRadius: 20, color: '#fff', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <Shield size={24} />
                <div style={{ fontSize: 12, fontWeight: 800 }}>POLICE ({emContacts.police})</div>
              </a>
            </div>
          </div>

          <button 
            onClick={() => {
              if (sosTimerRef.current) clearInterval(sosTimerRef.current);
              setSosActive(false);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
