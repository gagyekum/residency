import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AppHeader from '~/components/AppHeader';
import Footer from '~/components/Footer';
import PageLoader from '~/components/PageLoader';
import { Lock, Logout, NavigateNext, Home as HomeIcon, Message } from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';
import { changePassword, getDashboard } from '~/lib/api';
import type { ChangePasswordErrors, DashboardStats } from '~/lib/api';

export default function Home() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Change password state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_new_password: '' });
  const [passwordErrors, setPasswordErrors] = useState<ChangePasswordErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordGenericError, setPasswordGenericError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

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

  const handleOpenPasswordDialog = () => {
    setPasswordForm({ old_password: '', new_password: '', confirm_new_password: '' });
    setPasswordErrors({});
    setPasswordGenericError('');
    setPasswordDialogOpen(true);
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
  };

  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    setPasswordErrors({});
    setPasswordGenericError('');
    try {
      await changePassword(passwordForm);
      setPasswordDialogOpen(false);
      setSnackbarOpen(true);
    } catch (err: any) {
      if (err.fieldErrors) {
        setPasswordErrors(err.fieldErrors);
        if (err.fieldErrors.non_field_errors) {
          setPasswordGenericError(err.fieldErrors.non_field_errors.join(' '));
        }
      } else {
        setPasswordGenericError(err.message || 'Failed to change password.');
      }
    } finally {
      setPasswordLoading(false);
    }
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
        <Tooltip title="Change Password">
          <IconButton color="inherit" onClick={handleOpenPasswordDialog}>
            <Lock />
          </IconButton>
        </Tooltip>
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
              endIcon={<Message />}
              onClick={() => navigate('/messaging')}
              sx={{ py: 1.5, px: 4 }}
            >
              Messaging
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
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="info.main">
                          {stats.residences.with_phone ?? 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          With Phone
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Messaging Card */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Message color="primary" />
                      <Typography variant="h6" component="h2">
                        Messaging
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="primary">
                          {stats.messaging?.total_jobs ?? stats.emails.total_jobs}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Jobs
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {(stats.messaging?.email_sent ?? stats.emails.total_sent) + (stats.messaging?.sms_sent ?? 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sent
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="error.main">
                          {(stats.messaging?.email_failed ?? stats.emails.total_failed) + (stats.messaging?.sms_failed ?? 0)}
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

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handleClosePasswordDialog}
        fullScreen={isMobile}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordGenericError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordGenericError}
            </Alert>
          )}
          <TextField
            label="Current Password"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.old_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
            error={!!passwordErrors.old_password}
            helperText={passwordErrors.old_password?.[0]}
          />
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            error={!!passwordErrors.new_password}
            helperText={passwordErrors.new_password?.[0]}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.confirm_new_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm_new_password: e.target.value })}
            error={!!passwordErrors.confirm_new_password}
            helperText={passwordErrors.confirm_new_password?.[0]}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClosePasswordDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={passwordLoading || !passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_new_password}
          >
            {passwordLoading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message="Password changed successfully"
      />
    </Box>
  );
}
