import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView';
import BottomNav from '../components/BottomNav';
import { TYPE_MAP, fetchNearby, processElements } from '../utils/places';
import { getStoredLocation } from '../hooks/useLocation';
import { downloadRegion } from '../services/offlineManager';
import { 
  ArrowLeft, Map as MapIcon, List, TriangleAlert, MapPin, Phone, 
  RefreshCw, Globe, Hospital, Ambulance, ShieldAlert, Wrench, 
  Truck, Pill, Fuel, Download, CheckCircle2
} from 'lucide-react';

export default function Nearby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'hospital';
  const info = TYPE_MAP[type] || TYPE_MAP.hospital;

  const [view, setView] = useState('map');
  const [elements, setElements] = useState([]);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [status, setStatus] = useState('loading');
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => { 
    setElements([]); 
    setStatus('loading'); 
    loadServices();
    
    const handleOnline = () => {
      console.log('Internet restored. Refreshing...');
      loadServices();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [type]);

  async function loadServices() {
    try {
      const { lat, lng } = await getStoredLocation();
      setUserLat(lat); setUserLng(lng);
      
      const raw = await fetchNearby(lat, lng, type);
      setElements(processElements(raw, lat, lng));
      setStatus('ok');
    } catch (err) {
      console.error('Load services failed:', err);
      setStatus('error');
    }
  }

  const handleDownload = async () => {
    if (!userLat || downloading) return;
    setDownloading(true);
    try {
      await downloadRegion(userLat, userLng);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      alert('Failed to download offline region. Please check your connection.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="app">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="screen-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <info.icon size={20} /> {info.label}
        </div>
      </div>

      <div className="filter-strip" style={{ 
        display: 'flex', gap: '8px', padding: '12px', overflowX: 'auto', 
        background: '#fff', borderBottom: '1px solid #eee' 
      }}>
        {[
          { id: 'hospital', label: 'Hospitals', icon: Hospital },
          { id: 'ambulance_service', label: 'Ambulance', icon: Ambulance },
          { id: 'police', label: 'Police', icon: ShieldAlert },
          { id: 'repair', label: 'Repair', icon: Wrench },
          { id: 'towing', label: 'Towing', icon: Truck },
          { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
          { id: 'fuel', label: 'Fuel', icon: Fuel },
        ].map(f => (
          <button 
            key={f.id}
            onClick={() => navigate(`/nearby?type=${f.id}`)}
            className={`filter-pill ${type === f.id ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
              borderRadius: '20px', border: type === f.id ? 'none' : '1px solid #ddd',
              background: type === f.id ? '#e53935' : '#fff',
              color: type === f.id ? '#fff' : '#666',
              fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap'
            }}
          >
            <f.icon size={14} /> {f.label}
          </button>
        ))}
      </div>

      <div className="view-toggle">
        <button className={`view-btn ${view==='map'?'active':''}`}
          onClick={() => { setView('map'); setTimeout(()=>window.roadMap?.invalidateSize(),100); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <MapIcon size={16} /> Map View
        </button>
        <button className={`view-btn ${view==='list'?'active':''}`} onClick={() => setView('list')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <List size={16} /> List View
        </button>
      </div>

      {!navigator.onLine && (
        <div className="offline-bar" style={{ 
          background: '#fff3e0', color: '#e65100', padding: '8px 16px', 
          fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
          borderBottom: '1px solid #ffe0b2'
        }}>
          <TriangleAlert size={16} /> Offline Mode Active — showing cached data
        </div>
      )}

      {view === 'map' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {status === 'loading' ? <SkeletonLoader count={1} type="map" />
          : status === 'error' ? <ErrorState onRetry={loadServices} />
          : userLat ? <MapView elements={elements} userLat={userLat} userLng={userLng} info={info} /> : null}

          <div className="service-list">
            {status === 'loading' ? <SkeletonLoader count={3} />
            : elements.length === 0 ? <EmptyState info={info} />
            : elements.map((el,i) => (
              <ServiceCard key={el.id || i} el={el} info={info} userLat={userLat} userLng={userLng} compact />
            ))}
          </div>
        </div>
      ) : (
        <div className="service-list">
          {status==='loading' ? <SkeletonLoader count={5} />
          : status==='error' ? <ErrorState onRetry={loadServices} />
          : elements.length===0 ? <EmptyState info={info} />
          : elements.map((el,i) => <ServiceCard key={el.id || i} el={el} info={info} userLat={userLat} userLng={userLng} />)}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function SkeletonLoader({ count, type }) {
  return (
    <div style={{ padding: '12px' }}>
      {type === 'map' && <div className="skeleton" style={{ height: '250px', borderRadius: '12px', marginBottom: '12px' }} />}
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px', marginBottom: '12px' }} />
      ))}
    </div>
  );
}

function ServiceCard({ el, info, userLat, userLng, compact }) {
  const name  = el.name || 'Unnamed';
  const phone = el.phone;
  const addr  = el.address || 'Location on map';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${el.lat},${el.lon}&travelmode=driving`;
  
  return (
    <div className="service-card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="service-top">
        <div className="service-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <info.icon size={18} color="#e53935" /> {name}
        </div>
        <span className="distance-badge">{el.dist} km</span>
      </div>
      {!compact && <div className="service-addr" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {addr}</div>}
      <div className="service-btns">
        {phone && (
          <a className="btn-call" href={`tel:${phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Phone size={14} /> Call
          </a>
        )}
        <a className="btn-nav" href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <MapIcon size={14} /> {compact?'Go':'Navigate'}
        </a>
      </div>
    </div>
  );
}

function EmptyState({ info }) {
  return <div className="empty"><div className="empty-icon"><info.icon size={48} /></div><div className="empty-text">No {info.label} found within 10km.</div></div>;
}

function ErrorState({ onRetry }) {
  return (
    <div className="empty">
      <div className="empty-icon"><TriangleAlert size={48} color="#e53935" /></div>
      <div className="empty-text">
        Failed to load services.<br /><br />
        <button onClick={onRetry} className="retry-btn">Retry</button>
      </div>
    </div>
  );
}
