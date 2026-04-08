import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import EducoAssist from './pages/EducoAssist';
import NotesHub from './pages/NotesHub';
import StudyRoom from './pages/StudyRoom';
import GroupTimer from './pages/GroupTimer';
import Whiteboard from './pages/Whiteboard';
import ProductivityTools from './pages/ProductivityTools';
import VisualLabs from './pages/VisualLabs';
import SmartWorkspace from './pages/SmartWorkspace';
import BreakZone from './pages/BreakZone';
import LectureZone from './pages/LectureZone';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import WellwisherDashboard from './pages/WellwisherDashboard';
import { useAuth } from './context/AuthContext';
import './App.css';
import './styles/layout.css';
import './styles/modern.css';
import './styles/home.css';
import './styles/modules.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/decorations.css';
import './styles/login.css';
import './styles/workspace.css';

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'wellwisher') {
    return <Navigate to="/wellwisher" replace />;
  }
  return <Home />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/wellwisher/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/wellwisher/register" element={<Register />} />
        <Route path="/group-timer" element={<Layout><GroupTimer /></Layout>} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<RoleHome />} />
                <Route path="/wellwisher" element={<WellwisherDashboard />} />
                <Route path="/premium" element={<Navigate to="/settings" replace />} />
                <Route path="/educoassist" element={<EducoAssist />} />
                <Route path="/notes" element={<NotesHub />} />
                <Route path="/study-room" element={<StudyRoom />} />
                <Route path="/whiteboard" element={<Whiteboard />} />
                <Route path="/tools" element={<ProductivityTools />} />
                <Route path="/visual-labs" element={<VisualLabs />} />
                <Route path="/workspace" element={<SmartWorkspace />} />
                <Route path="/break" element={<BreakZone />} />
                <Route path="/lectures" element={<LectureZone />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
