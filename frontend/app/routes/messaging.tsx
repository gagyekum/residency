import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Pagination,
  Snackbar,
  Stack,
  Tab,
  Tabs,
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
import Footer from '~/components/Footer';
import PageLoader from '~/components/PageLoader';
import {
  ArrowBack,
  Close,
  Email,
  Home,
  Logout,
  Message,
  Refresh,
  Send,
  Sms,
  Visibility,
} from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';
import {
  getMessageJobs,
  getMessageJob,
  getMessageJobStatus,
  getMessageJobEmailRecipients,
  getMessageJobSMSRecipients,
  createMessageJob,
  retryMessageJob,
  getCurrentUser,
  hasPermission,
  PermissionError,
  MESSAGING_PERMISSIONS,
  type Channel,
  type MessageJob,
  type MessageJobListItem,
  type MessageJobStatus,
  type EmailRecipient,
  type SMSRecipient,
  type PaginatedResponse,
  type User,
} from '~/lib/api';

export default function Messaging() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<MessageJobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Compose dialog state
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [useSameBody, setUseSameBody] = useState(true);
  const [channels, setChannels] = useState<Channel[]>(['email', 'sms']);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [progress, setProgress] = useState<MessageJobStatus | null>(null);

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<MessageJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [smsRecipients, setSmsRecipients] = useState<SMSRecipient[]>([]);
  const [emailRecipientsPage, setEmailRecipientsPage] = useState(1);
  const [smsRecipientsPage, setSmsRecipientsPage] = useState(1);
  const [hasMoreEmailRecipients, setHasMoreEmailRecipients] = useState(false);
  const [hasMoreSmsRecipients, setHasMoreSmsRecipients] = useState(false);
  const [loadingMoreRecipients, setLoadingMoreRecipients] = useState(false);
  const [retryProgress, setRetryProgress] = useState<MessageJobStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Permission helpers
  const canSend = hasPermission(user, MESSAGING_PERMISSIONS.add);

  // SMS character count helper
  const effectiveSmsBody = useSameBody ? body : smsBody;
  const smsCharCount = effectiveSmsBody.length;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  useEffect(() => {
    const tokens = getStoredTokens();
    if (!tokens) {
      navigate('/login');
      return;
    }

    // Set initial loading to false immediately after token check
    // so the navbar can render while user data loads
    setInitialLoading(false);

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
      const data: PaginatedResponse<MessageJobListItem> = await getMessageJobs(page);
      setJobs(data.results);
      setTotalPages(Math.ceil(data.count / 10));
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        navigate('/login');
      } else if (err instanceof PermissionError) {
        setError('You do not have permission to view message jobs');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load message jobs');
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
        const status = await getMessageJobStatus(activeJobId);
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
    setSmsBody('');
    setUseSameBody(true);
    setChannels(['email', 'sms']);
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

  const handleToggleChannel = (channel: Channel) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSendMessage = async () => {
    // Validate based on selected channels
    if (channels.length === 0) {
      setFormError('Please select at least one channel');
      return;
    }
    if (channels.includes('email') && !subject.trim()) {
      setFormError('Subject is required for email');
      return;
    }
    if (!body.trim()) {
      setFormError('Message body is required');
      return;
    }

    setSending(true);
    setFormError('');

    try {
      const job = await createMessageJob({
        subject: subject.trim(),
        body: body.trim(),
        sms_body: useSameBody ? '' : smsBody.trim(),
        channels,
      });
      // Start tracking progress in the same dialog
      setActiveJobId(job.id);
      setProgress({
        id: job.id,
        status: job.status,
        channels: job.channels,
        email_total_recipients: job.email_total_recipients,
        email_sent_count: job.email_sent_count,
        email_failed_count: job.email_failed_count,
        email_progress_percent: job.email_progress_percent,
        sms_total_recipients: job.sms_total_recipients,
        sms_sent_count: job.sms_sent_count,
        sms_failed_count: job.sms_failed_count,
        sms_progress_percent: job.sms_progress_percent,
        overall_progress_percent: job.overall_progress_percent,
        total_recipients: job.total_recipients,
        sent_count: job.sent_count,
        failed_count: job.failed_count,
        progress_percent: job.progress_percent,
      });
    } catch (err) {
      if (err instanceof PermissionError) {
        setFormError('You do not have permission to send messages');
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to send message');
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
    setDetailTab(0);
    setEmailRecipients([]);
    setSmsRecipients([]);
    setEmailRecipientsPage(1);
    setSmsRecipientsPage(1);
    setHasMoreEmailRecipients(false);
    setHasMoreSmsRecipients(false);
    try {
      const job = await getMessageJob(jobId);
      setDetailJob(job);

      // Load recipients based on channels
      const promises: Promise<void>[] = [];
      if (job.channels.includes('email')) {
        promises.push(
          getMessageJobEmailRecipients(jobId, 1).then(data => {
            setEmailRecipients(data.results);
            setHasMoreEmailRecipients(data.next);
          })
        );
      }
      if (job.channels.includes('sms')) {
        promises.push(
          getMessageJobSMSRecipients(jobId, 1).then(data => {
            setSmsRecipients(data.results);
            setHasMoreSmsRecipients(data.next);
          })
        );
      }
      await Promise.all(promises);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load message details', severity: 'error' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLoadMoreEmailRecipients = async () => {
    if (!detailJob || loadingMoreRecipients) return;
    setLoadingMoreRecipients(true);
    try {
      const nextPage = emailRecipientsPage + 1;
      const data = await getMessageJobEmailRecipients(detailJob.id, nextPage);
      setEmailRecipients((prev) => [...prev, ...data.results]);
      setEmailRecipientsPage(nextPage);
      setHasMoreEmailRecipients(data.next);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load more recipients', severity: 'error' });
    } finally {
      setLoadingMoreRecipients(false);
    }
  };

  const handleLoadMoreSmsRecipients = async () => {
    if (!detailJob || loadingMoreRecipients) return;
    setLoadingMoreRecipients(true);
    try {
      const nextPage = smsRecipientsPage + 1;
      const data = await getMessageJobSMSRecipients(detailJob.id, nextPage);
      setSmsRecipients((prev) => [...prev, ...data.results]);
      setSmsRecipientsPage(nextPage);
      setHasMoreSmsRecipients(data.next);
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
    setEmailRecipients([]);
    setSmsRecipients([]);
    setEmailRecipientsPage(1);
    setSmsRecipientsPage(1);
    setHasMoreEmailRecipients(false);
    setHasMoreSmsRecipients(false);
    setRetryProgress(null);
    setRetrying(false);
  };

  const handleRetryFailed = async () => {
    if (!detailJob || retrying) return;
    setRetrying(true);
    try {
      const status = await retryMessageJob(detailJob.id);
      setRetryProgress(status);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to retry messages', severity: 'error' });
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
      if (detailJob.channels.includes('email')) {
        getMessageJobEmailRecipients(detailJob.id, 1).then((data) => {
          setEmailRecipients(data.results);
          setEmailRecipientsPage(1);
          setHasMoreEmailRecipients(data.next);
        });
      }
      if (detailJob.channels.includes('sms')) {
        getMessageJobSMSRecipients(detailJob.id, 1).then((data) => {
          setSmsRecipients(data.results);
          setSmsRecipientsPage(1);
          setHasMoreSmsRecipients(data.next);
        });
      }
      // Refresh job details
      getMessageJob(detailJob.id).then((job) => {
        setDetailJob(job);
      });
      return;
    }

    const pollStatus = async () => {
      try {
        const status = await getMessageJobStatus(detailJob.id);
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

  if (initialLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
        <PageLoader minHeight="100vh" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', minHeight: '100vh', pb: 'env(safe-area-inset-bottom)' }}>
      <AppHeader>
        <Tooltip title="Back to Home">
          <IconButton color="inherit" onClick={() => navigate('/')} edge="start" sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Messaging
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
          <Tooltip title="Compose Message">
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

      <Container maxWidth="lg" sx={{ flexGrow: 1, mt: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <PageLoader />
        ) : jobs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 } }}>
            <Message sx={{ fontSize: { xs: 48, sm: 64 }, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No messages sent yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {canSend
                ? 'Get started by composing your first message'
                : 'No message history available'}
            </Typography>
            {canSend && (
              <Button variant="contained" startIcon={<Send />} onClick={handleOpenCompose}>
                Compose Message
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
                      {job.subject || '(No subject)'}
                    </Typography>
                    <Chip
                      label={job.status}
                      size="small"
                      color={getStatusColor(job.status) as any}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    {job.channels?.includes('email') && (
                      <Chip icon={<Email sx={{ fontSize: 14 }} />} label="Email" size="small" variant="outlined" />
                    )}
                    {job.channels?.includes('sms') && (
                      <Chip icon={<Sms sx={{ fontSize: 14 }} />} label="SMS" size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {formatDate(job.created_at)}
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    {job.channels?.includes('email') && (
                      <Typography variant="body2">
                        Email: {job.email_sent_count}/{job.email_total_recipients}
                      </Typography>
                    )}
                    {job.channels?.includes('sms') && (
                      <Typography variant="body2">
                        SMS: {job.sms_sent_count}/{job.sms_total_recipients}
                      </Typography>
                    )}
                    {(job.email_failed_count > 0 || job.sms_failed_count > 0) && (
                      <Typography variant="body2" color="error.main">
                        Failed: {job.email_failed_count + job.sms_failed_count}
                      </Typography>
                    )}
                  </Stack>
                  {job.status === 'processing' && (
                    <LinearProgress variant="determinate" value={job.overall_progress_percent} sx={{ mt: 1 }} />
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
                  <TableCell>Channels</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Email</TableCell>
                  <TableCell align="right">SMS</TableCell>
                  <TableCell align="right">Failed</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.subject || '(No subject)'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {job.channels?.includes('email') && (
                          <Tooltip title="Email"><Email fontSize="small" color="action" /></Tooltip>
                        )}
                        {job.channels?.includes('sms') && (
                          <Tooltip title="SMS"><Sms fontSize="small" color="action" /></Tooltip>
                        )}
                      </Box>
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
                          value={job.overall_progress_percent}
                          sx={{ mt: 0.5, width: 60 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {job.channels?.includes('email') ? `${job.email_sent_count}/${job.email_total_recipients}` : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {job.channels?.includes('sms') ? `${job.sms_sent_count}/${job.sms_total_recipients}` : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: (job.email_failed_count + job.sms_failed_count) > 0 ? 'error.main' : 'inherit' }}>
                      {job.email_failed_count + job.sms_failed_count}
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

      <Footer />

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
            <Typography variant="h6">Compose Message</Typography>
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

          {/* Channel Selection */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Send via:</Typography>
          <FormGroup row sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={channels.includes('email')}
                  onChange={() => handleToggleChannel('email')}
                  disabled={!!progress}
                />
              }
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Email fontSize="small" /> Email</Box>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={channels.includes('sms')}
                  onChange={() => handleToggleChannel('sms')}
                  disabled={!!progress}
                />
              }
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Sms fontSize="small" /> SMS</Box>}
            />
          </FormGroup>

          {channels.includes('email') && (
            <TextField
              autoFocus
              label="Email Subject"
              fullWidth
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 2 }}
              required
              disabled={!!progress}
            />
          )}

          <TextField
            label="Message Body"
            fullWidth
            multiline
            rows={isMobile ? 6 : 8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={!!progress}
            helperText={channels.includes('sms') && useSameBody ? `SMS: ${smsCharCount} characters (${smsSegments} segment${smsSegments > 1 ? 's' : ''})` : undefined}
          />

          {channels.includes('sms') && (
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useSameBody}
                    onChange={(e) => setUseSameBody(e.target.checked)}
                    disabled={!!progress}
                  />
                }
                label="Use same message for SMS"
              />
              {!useSameBody && (
                <TextField
                  label="SMS Message"
                  fullWidth
                  multiline
                  rows={3}
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  disabled={!!progress}
                  helperText={`${smsBody.length} characters (${Math.ceil(smsBody.length / 160) || 1} segment${Math.ceil(smsBody.length / 160) > 1 ? 's' : ''})`}
                  sx={{ mt: 1 }}
                />
              )}
              {smsCharCount > 160 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  SMS will be sent as {smsSegments} segments
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: isMobile ? 2 : undefined, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          {/* Progress status on the left */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {isProcessing && progress && (
              <>
                <CircularProgress size={20} />
                <Box>
                  {progress.channels?.includes('email') && (
                    <Typography variant="body2" color="text.secondary">
                      Email: {progress.email_sent_count}/{progress.email_total_recipients}
                    </Typography>
                  )}
                  {progress.channels?.includes('sms') && (
                    <Typography variant="body2" color="text.secondary">
                      SMS: {progress.sms_sent_count}/{progress.sms_total_recipients}
                    </Typography>
                  )}
                </Box>
              </>
            )}
            {progress?.status === 'completed' && (
              <Box>
                {progress.channels?.includes('email') && (
                  <Typography variant="body2" color="success.main">
                    Email: {progress.email_sent_count} sent{progress.email_failed_count > 0 && `, ${progress.email_failed_count} failed`}
                  </Typography>
                )}
                {progress.channels?.includes('sms') && (
                  <Typography variant="body2" color="success.main">
                    SMS: {progress.sms_sent_count} sent{progress.sms_failed_count > 0 && `, ${progress.sms_failed_count} failed`}
                  </Typography>
                )}
              </Box>
            )}
            {progress?.status === 'failed' && (
              <Typography variant="body2" color="error.main">
                Failed to send messages
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
                  onClick={handleSendMessage}
                  disabled={sending || channels.length === 0 || !body.trim() || (channels.includes('email') && !subject.trim())}
                  startIcon={sending ? <CircularProgress size={20} /> : <Send />}
                >
                  {sending ? 'Sending...' : 'Send Message'}
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
              {detailJob?.subject || 'Message Details'}
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
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={detailJob.status}
                    color={getStatusColor(detailJob.status) as any}
                  />
                  {detailJob.channels?.includes('email') && (
                    <Chip icon={<Email sx={{ fontSize: 14 }} />} label={`Email: ${detailJob.email_sent_count}/${detailJob.email_total_recipients}`} size="small" variant="outlined" />
                  )}
                  {detailJob.channels?.includes('sms') && (
                    <Chip icon={<Sms sx={{ fontSize: 14 }} />} label={`SMS: ${detailJob.sms_sent_count}/${detailJob.sms_total_recipients}`} size="small" variant="outlined" />
                  )}
                </Box>
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
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2, whiteSpace: 'pre-wrap' }}>
                {detailJob.body}
              </Box>
              {detailJob.sms_body && detailJob.sms_body !== detailJob.body && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>SMS Message:</Typography>
                  <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2, whiteSpace: 'pre-wrap' }}>
                    {detailJob.sms_body}
                  </Box>
                </>
              )}

              {/* Recipients Tabs */}
              {(detailJob.channels?.length ?? 0) > 1 && (
                <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                  {detailJob.channels?.includes('email') && <Tab icon={<Email />} label="Email" iconPosition="start" />}
                  {detailJob.channels?.includes('sms') && <Tab icon={<Sms />} label="SMS" iconPosition="start" />}
                </Tabs>
              )}

              {/* Email Recipients Tab */}
              {((detailJob.channels?.length === 1 && detailJob.channels.includes('email')) ||
                (detailJob.channels?.length > 1 && detailTab === 0 && detailJob.channels?.includes('email'))) && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Email Recipients ({detailJob.email_total_recipients}):
                  </Typography>
                  {isMobile ? (
                    <Stack spacing={1}>
                      {emailRecipients.map((recipient) => (
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
                              <Chip label={recipient.status} size="small" color={getStatusColor(recipient.status) as any} />
                            </Box>
                            {recipient.error_message && (
                              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{recipient.error_message}</Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <TableContainer sx={{ maxHeight: 250 }}>
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
                          {emailRecipients.map((recipient) => (
                            <TableRow key={recipient.id}>
                              <TableCell>{recipient.house_number}</TableCell>
                              <TableCell>{recipient.residence_name}</TableCell>
                              <TableCell>{recipient.email_address}</TableCell>
                              <TableCell><Chip label={recipient.status} size="small" color={getStatusColor(recipient.status) as any} /></TableCell>
                              <TableCell sx={{ color: 'error.main' }}>{recipient.error_message || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  {hasMoreEmailRecipients && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Button variant="outlined" onClick={handleLoadMoreEmailRecipients} disabled={loadingMoreRecipients} startIcon={loadingMoreRecipients ? <CircularProgress size={20} /> : null}>
                        {loadingMoreRecipients ? 'Loading...' : 'Load More'}
                      </Button>
                    </Box>
                  )}
                </>
              )}

              {/* SMS Recipients Tab */}
              {((detailJob.channels?.length === 1 && detailJob.channels.includes('sms')) ||
                (detailJob.channels?.length > 1 && ((detailTab === 1 && detailJob.channels?.includes('email')) || (detailTab === 0 && !detailJob.channels?.includes('email'))))) && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    SMS Recipients ({detailJob.sms_total_recipients}):
                  </Typography>
                  {isMobile ? (
                    <Stack spacing={1}>
                      {smsRecipients.map((recipient) => (
                        <Card key={recipient.id} variant="outlined">
                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {recipient.house_number} - {recipient.residence_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {recipient.phone_number}
                                </Typography>
                              </Box>
                              <Chip label={recipient.status} size="small" color={getStatusColor(recipient.status) as any} />
                            </Box>
                            {recipient.error_message && (
                              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{recipient.error_message}</Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <TableContainer sx={{ maxHeight: 250 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>House #</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {smsRecipients.map((recipient) => (
                            <TableRow key={recipient.id}>
                              <TableCell>{recipient.house_number}</TableCell>
                              <TableCell>{recipient.residence_name}</TableCell>
                              <TableCell>{recipient.phone_number}</TableCell>
                              <TableCell><Chip label={recipient.status} size="small" color={getStatusColor(recipient.status) as any} /></TableCell>
                              <TableCell sx={{ color: 'error.main' }}>{recipient.error_message || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  {hasMoreSmsRecipients && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Button variant="outlined" onClick={handleLoadMoreSmsRecipients} disabled={loadingMoreRecipients} startIcon={loadingMoreRecipients ? <CircularProgress size={20} /> : null}>
                        {loadingMoreRecipients ? 'Loading...' : 'Load More'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: isMobile ? 2 : undefined, justifyContent: 'space-between' }}>
          {/* Retry progress on the left */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isRetryProcessing && retryProgress && (
              <>
                <CircularProgress size={20} />
                <Box>
                  {retryProgress.channels?.includes('email') && (
                    <Typography variant="body2" color="text.secondary">
                      Email: {retryProgress.email_sent_count}/{retryProgress.email_total_recipients}
                    </Typography>
                  )}
                  {retryProgress.channels?.includes('sms') && (
                    <Typography variant="body2" color="text.secondary">
                      SMS: {retryProgress.sms_sent_count}/{retryProgress.sms_total_recipients}
                    </Typography>
                  )}
                </Box>
              </>
            )}
            {isRetryComplete && retryProgress?.status === 'completed' && (
              <Typography variant="body2" color="success.main">
                Retry complete
              </Typography>
            )}
          </Box>
          {/* Action buttons on the right */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {detailJob && (detailJob.email_failed_count + detailJob.sms_failed_count) > 0 && !isRetryProcessing && canSend && (
              <Button
                variant="outlined"
                onClick={handleRetryFailed}
                disabled={retrying}
                startIcon={retrying ? <CircularProgress size={20} /> : <Refresh />}
              >
                {retrying ? 'Starting...' : `Retry Failed (${detailJob.email_failed_count + detailJob.sms_failed_count})`}
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
