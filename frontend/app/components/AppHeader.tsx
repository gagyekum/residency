import { AppBar, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import type { AppBarProps } from '@mui/material';
import type { ReactNode } from 'react';

interface AppHeaderProps extends Omit<AppBarProps, 'position'> {
  children: ReactNode;
}

/**
 * Shared AppBar component with mobile-optimized behavior:
 * - Fixed position on mobile with safe-area padding for notched devices
 * - Static position on desktop
 * - Includes spacer for fixed positioning
 */
export default function AppHeader({ children, sx, ...props }: AppHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      <AppBar
        position={isMobile ? 'fixed' : 'static'}
        sx={{
          pt: isMobile ? 'env(safe-area-inset-top)' : 0,
          ...sx,
        }}
        {...props}
      >
        <Toolbar>{children}</Toolbar>
      </AppBar>

      {/* Spacer for fixed AppBar on mobile */}
      {isMobile && <Toolbar sx={{ mt: 'env(safe-area-inset-top)' }} />}
    </>
  );
}
