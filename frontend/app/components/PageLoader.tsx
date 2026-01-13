import { Box, CircularProgress } from '@mui/material';

interface PageLoaderProps {
  /** Size of the CircularProgress spinner. Defaults to 40 */
  size?: number;
  /** Minimum height of the loader container. Defaults to 300 */
  minHeight?: number | string;
}

/**
 * Shared loading spinner component for pages.
 * Centers a CircularProgress spinner within a flexible container.
 */
export default function PageLoader({ size = 40, minHeight = 300 }: PageLoaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        minHeight,
      }}
    >
      <CircularProgress size={size} />
    </Box>
  );
}
