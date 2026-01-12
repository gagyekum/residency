import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Pagination,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AppHeader from '~/components/AppHeader';
import {
  ArrowBack,
  Close,
  Home,
  Logout,
  Refresh,
  Send,
  Visibility,
  MailOutline,
} from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';
import {
  getEmailJobs,
  getEmailJob,
  getEmailJobStatus,
  getEmailJobRecipients,
  createEmailJob,
  retryEmailJob,
  getCurrentUser,
  hasPermission,
  PermissionError,
  EMAIL_PERMISSIONS,
  type EmailJob,
  type EmailJobListItem,
  type EmailJobStatus,
  type EmailRecipient,
  type PaginatedResponse,
  type User,
} from '~/lib/api';

export default function Emails() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<EmailJobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Compose dialog state
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [progress, setProgress] = useState<EmailJobStatus | null>(null);

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<EmailJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [hasMoreRecipients, setHasMoreRecipients] = useState(false);
  const [loadingMoreRecipients, setLoadingMoreRecipients] = useState(false);
  const [retryProgress, setRetryProgress] = useState<EmailJobStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Permission helpers
  const canSend = hasPermission(user, EMAIL_PERMISSIONS.add);

  useEffect(() => {
    const tokens = getStoredTokens();
    if (!tokens) {
      navigate('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        if (err instanceof Error && err.message === 'Not authenticated') {
          navigate('/login');
        }
      }
    };

    fetchUser();
  }, [navigate]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<EmailJobListItem> = await getEmailJobs(page);
      setJobs(data.results);
      setTotalPages(Math.ceil(data.count / 10));
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        navigate('/login');
      } else if (err instanceof PermissionError) {
        setError('You do not have permission to view email jobs');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load email jobs');
      }
    } finally {
      setLoading(false);
    }
  }, [page, navigate]);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user, fetchJobs]);

  // Polling for progress (in compose dialog)
  useEffect(() => {
    if (!activeJobId || !composeOpen) return;

    // Don't poll if already complete
    if (progress?.status === 'completed' || progress?.status === 'failed') return;

    const pollStatus = async () => {
      try {
        const status = await getEmailJobStatus(activeJobId);
        setProgress(status);
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval
    const pollInterval = setInterval(pollStatus, 2000);

    return () => clearInterval(pollInterval);
  }, [activeJobId, composeOpen, progress?.status]);

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  const handleOpenCompose = () => {
    setSubject('');
    setBody('');
    setFormError('');
    setActiveJobId(null);
    setProgress(null);
    setComposeOpen(true);
  };

  const handleCloseCompose = () => {
    // Refresh list if we just finished sending
    if (progress) {
      fetchJobs();
    }
    setComposeOpen(false);
    setActiveJobId(null);
    setProgress(null);
  };

  const handleSendEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      setFormError('Subject and body are required');
      return;
    }

    setSending(true);
    setFormError('');

    try {
      const job = await createEmailJob({ subject: subject.trim(), body: body.trim() });
      // Start tracking progress in the same dialog
      setActiveJobId(job.id);
      setProgress({
        id: job.id,
        status: job.status,
        total_recipients: job.total_recipients,
        sent_count: job.sent_count,
        failed_count: job.failed_count,
        progress_percent: job.progress_percent,
      });
    } catch (err) {
      if (err instanceof PermissionError) {
        setFormError('You do not have permission to send emails');
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to send email');
      }
    } finally {
      setSending(false);
    }
  };

  const isProcessing = progress && (progress.status === 'pending' || progress.status === 'processing');
  const isComplete = progress && (progress.status === 'completed' || progress.status === 'failed');

  const handleViewDetail = async (jobId: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setRecipients([]);
    setRecipientsPage(1);
    setHasMoreRecipients(false);
    try {
      const [job, recipientsData] = await Promise.all([
        getEmailJob(jobId),
        getEmailJobRecipients(jobId, 1),
      ]);
      setDetailJob(job);
      setRecipients(recipientsData.results);
      setHasMoreRecipients(recipientsData.next);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load email details', severity: 'error' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLoadMoreRecipients = async () => {
    if (!detailJob || loadingMoreRecipients) return;
    setLoadingMoreRecipients(true);
    try {
      const nextPage = recipientsPage + 1;
      const data = await getEmailJobRecipients(detailJob.id, nextPage);
      setRecipients((prev) => [...prev, ...data.results]);
      setRecipientsPage(nextPage);
      setHasMoreRecipients(data.next);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load more recipients', severity: 'error' });
    } finally {
      setLoadingMoreRecipients(false);
    }
  };

  const handleCloseDetail = () => {
    // Refresh list if we just retried
    if (retryProgress) {
      fetchJobs();
    }
    setDetailOpen(false);
    setDetailJob(null);
    setRecipients([]);
    setRecipientsPage(1);
    setHasMoreRecipients(false);
    setRetryProgress(null);
    setRetrying(false);
  };

  const handleRetryFailed = async () => {
    if (!detailJob || retrying) return;
    setRetrying(true);
    try {
      const status = await retryEmailJob(detailJob.id);
      setRetryProgress(status);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to retry emails', severity: 'error' });
      setRetrying(false);
    }
  };

  // Polling for retry progress (in detail dialog)
  useEffect(() => {
    if (!detailJob || !retryProgress || !detailOpen) return;

    // Don't poll if already complete
    if (retryProgress.status === 'completed' || retryProgress.status === 'failed') {
      setRetrying(false);
      // Refresh recipients to show updated statuses
      getEmailJobRecipients(detailJob.id, 1).then((data) => {
        setRecipients(data.results);
        setRecipientsPage(1);
        setHasMoreRecipients(data.next);
      });
      // Refresh job details
      getEmailJob(detailJob.id).then((job) => {
        setDetailJob(job);
      });
      return;
    }

    const pollStatus = async () => {
      try {
        const status = await getEmailJobStatus(detailJob.id);
        setRetryProgress(status);
      } catch (err) {
        console.error('Failed to poll retry status:', err);
      }
    };

    const pollInterval = setInterval(pollStatus, 2000);
    return () => clearInterval(pollInterval);
  }, [detailJob, retryProgress, detailOpen]);

  const isRetryProcessing = retryProgress && (retryProgress.status === 'pending' || retryProgress.status === 'processing');
  const isRetryComplete = retryProgress && (retryProgress.status === 'completed' || retryProgress.status === 'failed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppHeader>
        <Tooltip title="Back to Home">
          <IconButton color="inherit" onClick={() => navigate('/')} edge="start" sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Email Messaging
        </Typography>
        {canSend && (
          <Button
            color="inherit"
            startIcon={<Send />}
            onClick={handleOpenCompose}
            sx={{ mr: 1, display: { xs: 'none', sm: 'flex' } }}
          >
            Compose
          </Button>
        )}
        {canSend && (
          <Tooltip title="Compose Email">
            <IconButton
              color="inherit"
              onClick={handleOpenCompose}
              sx={{ mr: 1, display: { xs: 'flex', sm: 'none' } }}
            >
              <Send />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Home">
          <IconButton color="inherit" onClick={() => navigate('/')}>
            <Home />
          </IconButton>
        </Tooltip>
        <Tooltip title="Logout">
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Tooltip>
      </AppHeader>

      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
        <Typography variant="h5" sx={{ mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Email History
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : jobs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 } }}>
            <MailOutline sx={{ fontSize: { xs: 48, sm: 64 }, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No emails sent yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {canSend
                ? 'Get started by composing your first email'
                : 'No email history available'}
            </Typography>
            {canSend && (
              <Button variant="contained" startIcon={<Send />} onClick={handleOpenCompose}>
                Compose Email
              </Button>
            )}
          </Box>
        ) : isMobile ? (
          // Mobile card view
          <Stack spacing={2} sx={{ pb: 3 }}>
            {jobs.map((job) => (
              <Card key={job.id} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleViewDetail(job.id)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 1, mr: 1 }} noWrap>
                      {job.subject}
                    </Typography>
                    <Chip
                      label={job.status}
                      size="small"
                      color={getStatusColor(job.status) as any}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {formatDate(job.created_at)}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Typography variant="body2">
                      Recipients: {job.total_recipients}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Sent: {job.sent_count}
                    </Typography>
                    {job.failed_count > 0 && (
                      <Typography variant="body2" color="error.main">
                        Failed: {job.failed_count}
                      </Typography>
                    )}
                  </Stack>
                  {job.status === 'processing' && (
                    <LinearProgress variant="determinate" value={job.progress_percent} sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          // Desktop table view
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Recipients</TableCell>
                  <TableCell align="right">Sent</TableCell>
                  <TableCell align="right">Failed</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.subject}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        color={getStatusColor(job.status) as any}
                      />
                      {job.status === 'processing' && (
                        <LinearProgress
                          variant="determinate"
                          value={job.progress_percent}
                          sx={{ mt: 0.5, width: 60 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">{job.total_recipients}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{job.sent_count}</TableCell>
                    <TableCell align="right" sx={{ color: job.failed_count > 0 ? 'error.main' : 'inherit' }}>
                      {job.failed_count}
                    </TableCell>
                    <TableCell>{formatDate(job.created_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetail(job.id)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Container>

      {/* Compose Dialog */}
      <Dialog
        open={composeOpen}
        onClose={isProcessing ? undefined : handleCloseCompose}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Compose Email</Typography>
            <IconButton onClick={handleCloseCompose} size="small" disabled={!!isProcessing}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ flex: isMobile ? 'none' : undefined }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This email will be sent to all residences with email addresses.
          </Typography>
          <TextField
            autoFocus
            label="Subject"
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mb: 2 }}
            required
            disabled={!!progress}
          />
          <TextField
            label="Message"
            fullWidth
            multiline
            rows={isMobile ? 8 : 10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={!!progress}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: isMobile ? 2 : undefined, justifyContent: 'space-between' }}>
          {/* Progress status on the left */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isProcessing && (
              <>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Sending... {progress.sent_count}/{progress.total_recipients}
                </Typography>
              </>
            )}
            {progress?.status === 'completed' && (
              <Typography variant="body2" color="success.main">
                Sent {progress.sent_count} of {progress.total_recipients} emails
                {progress.failed_count > 0 && ` (${progress.failed_count} failed)`}
              </Typography>
            )}
            {progress?.status === 'failed' && (
              <Typography variant="body2" color="error.main">
                Failed to send emails
              </Typography>
            )}
          </Box>
          {/* Action buttons on the right */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!progress && (
              <>
                <Button variant="outlined" onClick={handleCloseCompose} disabled={sending}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSendEmail}
                  disabled={sending || !subject.trim() || !body.trim()}
                  startIcon={sending ? <CircularProgress size={20} /> : <Send />}
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </Button>
              </>
            )}
            {isComplete && (
              <Button variant="outlined" onClick={handleCloseCompose}>
                Close
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={handleCloseDetail}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" noWrap sx={{ flex: 1, mr: 1 }}>
              {detailJob?.subject || 'Email Details'}
            </Typography>
            <IconButton onClick={handleCloseDetail} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ flex: isMobile ? 'none' : undefined }}>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : detailJob && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={detailJob.status}
                  color={getStatusColor(detailJob.status) as any}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Created: {formatDate(detailJob.created_at)}
                </Typography>
                {detailJob.completed_at && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Completed: {formatDate(detailJob.completed_at)}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Sent by: {detailJob.sender_email}
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Message:</Typography>
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 3, whiteSpace: 'pre-wrap' }}>
                {detailJob.body}
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Recipients ({detailJob.total_recipients}):
              </Typography>

              {isMobile ? (
                <Stack spacing={1}>
                  {recipients.map((recipient) => (
                    <Card key={recipient.id} variant="outlined">
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {recipient.house_number} - {recipient.residence_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {recipient.email_address}
                            </Typography>
                          </Box>
                          <Chip
                            label={recipient.status}
                            size="small"
                            color={getStatusColor(recipient.status) as any}
                          />
                        </Box>
                        {recipient.error_message && (
                          <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                            {recipient.error_message}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>House #</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell>{recipient.house_number}</TableCell>
                          <TableCell>{recipient.residence_name}</TableCell>
                          <TableCell>{recipient.email_address}</TableCell>
                          <TableCell>
                            <Chip
                              label={recipient.status}
                              size="small"
                              color={getStatusColor(recipient.status) as any}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'error.main' }}>
                            {recipient.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {hasMoreRecipients && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleLoadMoreRecipients}
                    disabled={loadingMoreRecipients}
                    startIcon={loadingMoreRecipients ? <CircularProgress size={20} /> : null}
                  >
                    {loadingMoreRecipients ? 'Loading...' : 'Load More'}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: isMobile ? 2 : undefined, justifyContent: 'space-between' }}>
          {/* Retry progress on the left */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isRetryProcessing && (
              <>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Retrying... {retryProgress.sent_count}/{retryProgress.total_recipients}
                </Typography>
              </>
            )}
            {isRetryComplete && retryProgress.status === 'completed' && (
              <Typography variant="body2" color="success.main">
                Retry complete - {retryProgress.sent_count} sent
                {retryProgress.failed_count > 0 && `, ${retryProgress.failed_count} still failed`}
              </Typography>
            )}
          </Box>
          {/* Action buttons on the right */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {detailJob && detailJob.failed_count > 0 && !isRetryProcessing && canSend && (
              <Button
                variant="outlined"
                onClick={handleRetryFailed}
                disabled={retrying}
                startIcon={retrying ? <CircularProgress size={20} /> : <Refresh />}
              >
                {retrying ? 'Starting...' : `Retry Failed (${detailJob.failed_count})`}
              </Button>
            )}
            <Button onClick={handleCloseDetail} variant="contained" disabled={!!isRetryProcessing}>
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
