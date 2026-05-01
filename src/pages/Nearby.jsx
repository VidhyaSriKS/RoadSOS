import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView';
import BottomNav from '../components/BottomNav';
import { TYPE_MAP, fetchNearby, processElements } from '../utils/places';
import { getStoredLocation } from '../hooks/useLocation';
import { ArrowLeft, Map as MapIcon, List, TriangleAlert, MapPin, Phone } from 'lucide-react';

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

  useEffect(() => { setElements([]); setStatus('loading'); loadServices(); }, [type]);

  async function loadServices() {
    try {
      const { lat, lng } = await getStoredLocation();
      setUserLat(lat); setUserLng(lng);
      let raw = [];
      try {
        if (type === 'all') {
          const [h, p] = await Promise.all([
            fetchNearby(lat, lng, 'amenity', 'hospital', 5),
            fetchNearby(lat, lng, 'amenity', 'police', 5),
          ]);
          raw = [...h, ...p];
        } else {
          raw = await fetchNearby(lat, lng, info.tag, info.value);
        }
        localStorage.setItem('cache_' + type, JSON.stringify({ elements: raw, lat, lng }));
        setStatus('ok');
      } catch {
        const cached = localStorage.getItem('cache_' + type);
        if (cached) { raw = JSON.parse(cached).elements; setStatus('offline'); }
        else setStatus('ok');
      }
      setElements(processElements(raw, lat, lng));
    } catch { setStatus('error'); }
  }

  return (
    <div className="app">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="screen-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <info.icon size={20} /> {info.label}
        </div>
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

      {status === 'offline' && <div className="offline-bar">⚠️ No internet — showing saved data</div>}

      {view === 'map' ? (
        <div>
          {status === 'loading' ? <div className="loading">⏳ Finding {info.label} near you…</div>
          : status === 'error' ? <ErrorState onRetry={loadServices} />
          : userLat ? <MapView elements={elements} userLat={userLat} userLng={userLng} info={info} /> : null}

          <div className="service-list">
            {(status==='ok'||status==='offline') && elements.length === 0 ? <EmptyState info={info} />
            : elements.slice(0,3).map((el,i) => (
              <ServiceCard key={i} el={el} info={info} userLat={userLat} userLng={userLng} compact />
            ))}
          </div>
        </div>
      ) : (
        <div className="service-list">
          {status==='loading' ? <div className="loading">⏳ Finding {info.label} near you…</div>
          : status==='error' ? <ErrorState onRetry={loadServices} />
          : elements.length===0 ? <EmptyState info={info} />
          : elements.map((el,i) => <ServiceCard key={i} el={el} info={info} userLat={userLat} userLng={userLng} />)}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function ServiceCard({ el, info, userLat, userLng, compact }) {
  const name  = el.tags?.name || el.tags?.['name:en'] || 'Unnamed';
  const phone = el.tags?.phone || el.tags?.['contact:phone'] || info.call;
  const addr  = el.tags?.['addr:street'] || el.tags?.['addr:full'] || el.tags?.['addr:city'] || 'See on map';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${el.elLat},${el.elLng}&travelmode=driving`;
  return (
    <div className="service-card">
      <div className="service-top">
        <div className="service-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><info.icon size={18} /> {name}</div>
        <span className="distance-badge">{el.dist} km</span>
      </div>
      {!compact && <div className="service-addr" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {addr}</div>}
      <div className="service-btns">
        <a className="btn-call" href={`tel:${phone||info.call||112}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Phone size={14} /> Call {!compact && (phone||info.call||'112')}
        </a>
        {el.elLat && el.elLng
          ? <a className="btn-nav" href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><MapIcon size={14} /> {compact?'Go':'Navigate'}</a>
          : <span className="btn-nav-disabled" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><MapIcon size={14} /> No location</span>}
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
        Allow location access and retry.<br /><br />
        <button onClick={onRetry} style={{padding:'10px 28px',background:'#e53935',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontSize:14,fontFamily:'inherit',fontWeight:700,boxShadow:'0 4px 14px rgba(229,57,53,0.3)'}}>Retry</button>
      </div>
    </div>
  );
}
