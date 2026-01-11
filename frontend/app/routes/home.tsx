import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Email, Logout, NavigateNext } from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = getStoredTokens();
    if (!tokens) {
      navigate('/login');
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Residency
          </Typography>
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: { xs: 6, sm: 10 }, px: { xs: 2, sm: 3 } }}>
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

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
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
        </Box>
      </Container>
    </Box>
  );
}
