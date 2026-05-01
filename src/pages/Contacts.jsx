import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { ArrowLeft, UserRound, Siren, Phone, Trash2, Send } from 'lucide-react';

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState(() =>
    JSON.parse(localStorage.getItem('emergencyContacts') || '[]')
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
  }, [contacts]);

  function addContact() {
    if (!name.trim()) { alert('Please enter a name'); return; }
    if (!/^\d{10}$/.test(phone.trim())) { alert('Enter a valid 10-digit number'); return; }
    setContacts(prev => [...prev, { name: name.trim(), phone: phone.trim() }]);
    setName('');
    setPhone('');
  }

  function deleteContact(i) {
    // Remove confirm to ensure button "just works" as requested
    setContacts(prev => prev.filter((_, idx) => idx !== i));
  }

  function testSOS() {
    if (!contacts.length) { alert('Add at least one contact first!'); return; }
    const lat = localStorage.getItem('userLat') || '11.6643';
    const lng = localStorage.getItem('userLng') || '78.1460';
    const link = `https://maps.google.com/?q=${lat},${lng}`;
    const msg = `🚨 TEST from RoadSoS: I was in an accident here: ${link} — Please come or call 108.`;
    
    // SMS works better in low network areas as requested
    const smsUrl = `sms:${contacts[0].phone}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
  }

  return (
    <div className="app">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="screen-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserRound size={20} /> Emergency Contacts
        </div>
      </div>

      <div className="content-wrap">
        <div className="info-box" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Siren size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>These contacts get an SMS with your GPS location when a crash is detected automatically.</div>
        </div>

        <div className="form-card">
          <div className="section-title">ADD NEW CONTACT</div>
          <input
            type="text"
            placeholder="Name (e.g. Amma, Arun)"
            autoComplete="off"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addContact()}
          />
          <input
            type="tel"
            placeholder="10-digit mobile number"
            maxLength={10}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && addContact()}
          />
          <button className="btn-add" onClick={addContact}>+ Add Contact</button>
        </div>

        <div className="section-title">SAVED CONTACTS</div>

        {contacts.length === 0 ? (
          <div className="empty-contacts">
            <div className="empty-icon"><UserRound size={48} /></div>
            <div className="empty-text">
              No contacts added yet.<br />Add at least one trusted person.
            </div>
          </div>
        ) : (
          contacts.map((c, i) => (
            <div className="contact-card" key={i}>
              <div className="contact-avatar">{c.name[0].toUpperCase()}</div>
              <div className="contact-info">
                <div className="contact-name">{c.name}</div>
                <div className="contact-phone">+91 {c.phone}</div>
              </div>
              <div className="contact-actions">
                <a href={`tel:${c.phone}`} className="btn-call-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={16} /></a>
                <button className="btn-del" onClick={() => deleteContact(i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}

        <button className="test-btn" onClick={testSOS} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Send size={18} /> Test SOS Message
        </button>
        <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 6 }}>
          Opens your SMS app with a test location message to your first contact
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
