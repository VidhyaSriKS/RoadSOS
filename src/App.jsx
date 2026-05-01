import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Nearby from './pages/Nearby';
import FirstAid from './pages/FirstAid';
import Contacts from './pages/Contacts';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/nearby" element={<Nearby />} />
      <Route path="/firstaid" element={<FirstAid />} />
      <Route path="/contacts" element={<Contacts />} />
    </Routes>
  );
}
