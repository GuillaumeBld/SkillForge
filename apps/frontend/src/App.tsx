import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHealth } from './api/client';
import { setHealth } from './store/slices/healthSlice';
import type { RootState } from './store/store';

function App() {
  const dispatch = useDispatch();
  const health = useSelector((state: RootState) => state.health);

  useEffect(() => {
    fetchHealth().then((data) => {
      dispatch(setHealth(data));
    });
  }, [dispatch]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>SkillForge Platform Shell</h1>
      <p>
        Backend status: <strong>{health.status ?? 'checking...'}</strong>
      </p>
      {health.lastChecked ? <p>Last checked at: {new Date(health.lastChecked).toLocaleString()}</p> : null}
      <p>
        This React shell is wired to the shared OpenAPI contract to ensure compile-time safety across the
        stack.
      </p>
    </main>
  );
}

export default App;
