import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, Bandage, UserRound } from 'lucide-react';

const NAV_ITEMS = [
  { path:'/',          icon: Home, label:'Home'      },
  { path:'/nearby',   icon: MapPin, label:'Nearby'    },
  { path:'/firstaid', icon: Bandage, label:'First Aid' },
  { path:'/contacts', icon: UserRound, label:'Contacts'  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div className="nav-icon-wrap">
              <item.icon className="nav-icon" size={22} />
            </div>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
