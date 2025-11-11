import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  useMediaQuery,
  Alert
} from '@mui/material';
import clsx from 'clsx';
import { ANALYTICS_EVENTS, trackEvent, type Persona } from '../analytics/events';
import type { HealthState } from '../store/slices/healthSlice';

interface AppLayoutProps {
  health: HealthState;
}

interface NavItem {
  label: string;
  to: string;
  persona: Persona;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: 'Learner Dashboard',
    to: '/learners/dashboard',
    persona: 'student',
    description: 'Navigate to the learner dashboard overview'
  },
  {
    label: 'Advisor Console',
    to: '/advisors/console',
    persona: 'advisor',
    description: 'Review advisee health and interventions'
  },
  {
    label: 'Partner Onboarding',
    to: '/partners/onboarding',
    persona: 'partner_admin',
    description: 'Configure integrations and import cadences'
  },
  {
    label: 'Marketing Landing',
    to: '/marketing/landing',
    persona: 'marketing',
    description: 'Explore growth stories and activation campaigns'
  }
];

export const AppLayout = ({ health }: AppLayoutProps) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const location = useLocation();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: '#2563eb'
          },
          secondary: {
            main: '#0ea5e9'
          },
          background: {
            default: prefersDarkMode ? '#0f172a' : '#f8fafc'
          }
        },
        typography: {
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }
      }),
    [prefersDarkMode]
  );

  const handleNavClick = (item: NavItem) => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.navigationItemSelected,
      persona: item.persona,
      contextPage: item.to,
      label: item.label
    });
  };

  const formattedTimestamp = health.lastChecked
    ? new Date(health.lastChecked).toLocaleString()
    : undefined;

  const statusVariant = health.status === 'ok' ? 'success' : 'warning';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900"
        >
          Skip to main content
        </a>
        <AppBar position="sticky" color="transparent" elevation={0} component="header" role="banner">
          <Toolbar className="flex flex-col gap-4 border-b border-slate-200 bg-white/80 py-6 backdrop-blur-lg dark:border-slate-700 dark:bg-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
            <Box className="flex w-full flex-col gap-2 lg:w-auto">
              <Typography variant="h6" component="p" className="font-semibold tracking-tight">
                SkillForge Platform Shell
              </Typography>
              <Typography variant="body2" color="text.secondary" component="p">
                Guided experiences for learners, advisors, partners, and growth teams.
              </Typography>
            </Box>
            <Box component="nav" aria-label="Primary" className="flex w-full flex-wrap gap-2 lg:w-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={item.description}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-primary-600 text-white focus-visible:ring-primary-400'
                        : 'bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-primary-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
                    )
                  }
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </NavLink>
              ))}
            </Box>
            <Box className="flex w-full flex-col gap-2 lg:w-auto lg:items-end" role="status" aria-live="polite">
              {health.error ? (
                <Chip color="error" label={health.error} size="small" />
              ) : (
                <Chip
                  color={health.status ? statusVariant : 'default'}
                  label={health.status ? `Backend: ${health.status}` : 'Backend: checking...'}
                  size="small"
                  variant="filled"
                />
              )}
              {formattedTimestamp ? (
                <Typography variant="caption" color="text.secondary">
                  Checked at {formattedTimestamp}
                </Typography>
              ) : null}
            </Box>
          </Toolbar>
        </AppBar>
        {health.error ? (
          <Box component="section" aria-label="System status" className="bg-rose-50 px-4 py-4 dark:bg-rose-900/30">
            <Container maxWidth="lg">
              <Alert severity="error" variant="outlined" className="rounded-2xl">
                We are unable to reach backend services. Real-time data may be stale. Please retry shortly.
              </Alert>
            </Container>
          </Box>
        ) : null}
        <Box component="main" id="main-content" role="main" className="flex flex-1 flex-col pb-16">
          <Container maxWidth="lg" className="flex-1 py-10">
            <Outlet />
          </Container>
        </Box>
        <Box component="footer" role="contentinfo" className="border-t border-slate-200 bg-white/80 py-6 dark:border-slate-700 dark:bg-slate-800/80">
          <Container maxWidth="lg" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} SkillForge. Accessibility and privacy evaluated quarterly.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Currently viewing: {location.pathname}
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AppLayout;
