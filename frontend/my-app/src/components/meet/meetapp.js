import { Routes, Route } from 'react-router-dom';
import './meetapp.css';
import LobbyScreen from './screens/Lobby';
import RoomPage from './screens/Room';

export default function MeetApp() {
  return (
    <div className="meet-container">
      <Routes>
        <Route path="/" element={<LobbyScreen />} />  {/* Modifié ici */}
        <Route path="/room/:roomId" element={<RoomPage />} />  {/* Modifié ici */}
      </Routes>
    </div>
  );
}