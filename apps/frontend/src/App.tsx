import { NavLink, Route, Routes } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  CircularProgress,
  Container,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import { useHealthQuery } from './api/hooks';
import {
  AdvisorPortalPage,
  OnboardingWizardPage,
  PartnerAutomationPage,
  StudentDashboardPage
} from './pages';

const navigationLinks = [
  { label: 'Onboarding', to: '/' },
  { label: 'Student dashboard', to: '/dashboard' },
  { label: 'Advisor portal', to: '/advisor' },
  { label: 'Partner automation', to: '/partners' }
];

function App() {
  const healthQuery = useHealthQuery();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar sx={{ gap: 3 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            SkillForge experience shell
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} aria-live="polite">
            <Typography variant="body2" component="span">
              API health:
            </Typography>
            {healthQuery.isLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Typography
                variant="body2"
                component="span"
                color={healthQuery.data?.status === 'ok' ? 'success.light' : 'warning.light'}
              >
                {healthQuery.data?.status ?? 'unknown'}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} role="navigation" aria-label="Primary">
            {navigationLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#0b5cff' : '#1f2933',
                  textDecoration: 'none'
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </Stack>

          {healthQuery.isError ? (
            <Alert severity="warning">{healthQuery.error?.message ?? 'Health check failed.'}</Alert>
          ) : null}

          <Routes>
            <Route path="/" element={<OnboardingWizardPage />} />
            <Route path="/dashboard" element={<StudentDashboardPage />} />
            <Route path="/advisor" element={<AdvisorPortalPage />} />
            <Route path="/partners" element={<PartnerAutomationPage />} />
          </Routes>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
