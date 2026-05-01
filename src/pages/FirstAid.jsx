import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { ArrowLeft, AlertOctagon, Activity, Syringe, Bone, HeartPulse, Car, Flame, Phone, Bandage, ChevronDown } from 'lucide-react';

const AID_DATA = [
  {
    title: <><AlertOctagon size={16} /> Scene Safety First</>,
    steps: [
      "1. Don't rush in — check for fire, fuel leaks, traffic",
      '2. Turn on hazard lights of any nearby vehicle',
      '3. Place someone 50m ahead to slow traffic',
      '4. Call 108 (ambulance) and 100 (police) immediately',
    ]
  },
  {
    title: <><Activity size={16} /> Check Breathing</>,
    steps: [
      '1. Tap shoulders — "Are you okay?"',
      '2. Tilt head back, lift chin to open airway',
      '3. Look, listen, feel for breathing — 10 seconds',
      '4. Not breathing? Start CPR immediately',
    ]
  },
  {
    title: <><Syringe size={16} /> Stop Bleeding</>,
    steps: [
      '1. Press firmly with cloth or bare hand',
      '2. Do NOT remove cloth — add more on top',
      '3. Elevate injured limb above heart level',
      '4. Maintain pressure until help arrives',
    ]
  },
  {
    title: <><Bone size={16} /> Suspected Spine Injury</>,
    steps: [
      '1. DO NOT move the person unless fire risk',
      '2. Keep head and neck completely still',
      '3. Support with hands if needed — wait for ambulance',
      '4. Moving wrong = permanent paralysis risk',
    ]
  },
  {
    title: <><HeartPulse size={16} /> CPR Steps</>,
    steps: [
      '1. Lay person flat on their back',
      '2. Place heel of hand on centre of chest',
      '3. Push down 5–6cm, 30 times — hard and fast',
      '4. Give 2 rescue breaths (mouth to mouth)',
      '5. Repeat 30:2 until ambulance arrives',
    ]
  },
  {
    title: <><Car size={16} /> Trapped in Vehicle</>,
    steps: [
      '1. Turn off ignition if reachable',
      "2. Don't force doors — wait for fire dept",
      '3. Break window with headrest metal spike',
      '4. Cut jammed seatbelt with knife or scissors',
    ]
  },
  {
    title: <><Flame size={16} /> Vehicle Fire</>,
    steps: [
      '1. Get everyone at least 100m away immediately',
      '2. Call 101 (Fire) right away',
      '3. Never go back for belongings',
      '4. Fuel tanks can explode — stay far back',
    ]
  },
];

const EMERGENCY_NUMBERS = [
  { num: '112', label: '112 — National Emergency (all services)' },
  { num: '108', label: '108 — Ambulance' },
  { num: '100', label: '100 — Police' },
  { num: '101', label: '101 — Fire' },
  { num: '1033', label: '1033 — Highway Emergency' },
];

function AidCard({ title, steps }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="aid-card">
      <div className="aid-header" onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{title}</div>
        <span className={`chevron ${open ? 'open' : ''}`}><ChevronDown size={16} /></span>
      </div>
      {open && (
        <div className="aid-body">
          {steps.map((step, i) => (
            <div key={i} className="aid-step">{step}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FirstAid() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="screen-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bandage size={20} /> First Aid Guide
        </div>
      </div>

      <div className="content-wrap">
        {AID_DATA.map((item, i) => (
          <AidCard key={i} title={item.title} steps={item.steps} />
        ))}

        <div className="em-section">
          <div className="em-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={16} /> Emergency Numbers</div>
          {EMERGENCY_NUMBERS.map(({ num, label }) => (
            <a key={num} href={`tel:${num}`} className="emnum">{label}</a>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
