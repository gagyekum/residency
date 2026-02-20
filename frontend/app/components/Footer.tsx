import { Box, Link, Typography } from '@mui/material';

/**
 * Shared footer component that sticks to the bottom of the page.
 * Displays copyright with dynamically updating year and contact info.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        textAlign: 'center',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        &copy; {currentYear} High-End Cluster
      </Typography>
    </Box>
  );
}
