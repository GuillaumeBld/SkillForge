import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import './styles/tailwind.css';
import { fetchHealth } from './api/client';
import { setHealth, setHealthError } from './store/slices/healthSlice';
import type { RootState, AppDispatch } from './store/store';
import { AppLayout, AdvisorConsole, LearnerDashboard, MarketingLanding, PartnerOnboarding } from './pages';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const health = useSelector((state: RootState) => state.health);

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        dispatch(setHealth(data));
      })
      .catch(() => {
        dispatch(setHealthError('Backend unreachable'));
      });
  }, [dispatch]);

  return (
    <Routes>
      <Route element={<AppLayout health={health} />}>
        <Route index element={<Navigate to="/learners/dashboard" replace />} />
        <Route path="/learners/dashboard" element={<LearnerDashboard />} />
        <Route path="/advisors/console" element={<AdvisorConsole />} />
        <Route path="/partners/onboarding" element={<PartnerOnboarding />} />
        <Route path="/marketing/landing" element={<MarketingLanding />} />
        <Route path="*" element={<Navigate to="/learners/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
