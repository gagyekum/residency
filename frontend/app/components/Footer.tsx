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
        &copy; {currentYear} Agyekum Software Solutions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        <Link href="mailto:gide2005@gmail.com" color="inherit" underline="hover">
          gide2005@gmail.com
        </Link>
        {' | '}
        <Link href="tel:+233242152408" color="inherit" underline="hover">
          +233 24 215 2408
        </Link>
        {' / '}
        <Link href="tel:+233548427946" color="inherit" underline="hover">
          +233 54 842 7946
        </Link>
      </Typography>
    </Box>
  );
}
