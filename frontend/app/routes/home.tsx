import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import AppHeader from '~/components/AppHeader';
import Footer from '~/components/Footer';
import PageLoader from '~/components/PageLoader';
import { Email, Logout, NavigateNext, Home as HomeIcon } from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';
import { getDashboard } from '~/lib/api';
import type { DashboardStats } from '~/lib/api';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const tokens = getStoredTokens();
    if (!tokens) {
      navigate('/login');
    } else {
      setLoading(false);
      fetchDashboard();
    }
  }, [navigate]);

  const fetchDashboard = async () => {
    try {
      const data = await getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
        <PageLoader minHeight="100vh" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', minHeight: '100vh', pb: 'env(safe-area-inset-bottom)' }}>
      <AppHeader>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Residency
        </Typography>
        <Tooltip title="Logout">
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Tooltip>
      </AppHeader>

      <Container maxWidth="sm" sx={{ flexGrow: 1, mt: { xs: 6, sm: 10 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, fontWeight: 600 }}
          >
            Welcome to Residency
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: { xs: 4, sm: 5 } }}
          >
            Manage your residences, tenants, and property information
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center', mb: { xs: 4, sm: 6 } }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<NavigateNext />}
              onClick={() => navigate('/residences')}
              sx={{ py: 1.5, px: 4 }}
            >
              Go to Residences
            </Button>
            <Button
              variant="outlined"
              size="large"
              endIcon={<Email />}
              onClick={() => navigate('/emails')}
              sx={{ py: 1.5, px: 4 }}
            >
              Email Messaging
            </Button>
          </Box>

          {/* Dashboard Stats */}
          {statsLoading ? (
            <PageLoader size={32} minHeight={100} />
          ) : stats ? (
            <Grid container spacing={2}>
              {/* Residences Card */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <HomeIcon color="primary" />
                      <Typography variant="h6" component="h2">
                        Residences
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="primary">
                          {stats.residences.total}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {stats.residences.with_email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          With Email
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Emails Card */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Email color="primary" />
                      <Typography variant="h6" component="h2">
                        Email Campaigns
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="primary">
                          {stats.emails.total_jobs}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Jobs
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {stats.emails.total_sent}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sent
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="error.main">
                          {stats.emails.total_failed}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Failed
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}
        </Box>
      </Container>

      <Footer />
    </Box>
  );
}
