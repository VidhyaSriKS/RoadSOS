import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Nearby from './pages/Nearby';
import FirstAid from './pages/FirstAid';
import Contacts from './pages/Contacts';
import { useAutoSync } from './hooks/useAutoSync';

export default function App() {
  useAutoSync(); // Starts the global background offline data tracker

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/nearby" element={<Nearby />} />
      <Route path="/firstaid" element={<FirstAid />} />
      <Route path="/contacts" element={<Contacts />} />
    </Routes>
  );
}
