import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Home as HomeIcon, Logout, NavigateNext } from '@mui/icons-material';
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
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <HomeIcon sx={{ mr: 2 }} />
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

      <Container maxWidth="md" sx={{ mt: { xs: 4, sm: 8 }, px: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          textAlign="center"
          sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
        >
          Welcome to Residency
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: { xs: 4, sm: 6 } }}
        >
          Manage your residences, tenants, and property information
        </Typography>

        <Card
          sx={{
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
          }}
          onClick={() => navigate('/residences')}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              p: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h6" component="h2">
                Residency Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View, add, edit, and manage residence information
              </Typography>
            </Box>
            <Button
              variant="contained"
              endIcon={<NavigateNext />}
              fullWidth={false}
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/residences');
              }}
            >
              Go to Residences
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
