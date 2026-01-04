import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Pagination,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  Close,
  Delete,
  Email,
  Home,
  Logout,
  Phone,
} from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';
import {
  getResidences,
  createResidence,
  updateResidence,
  deleteResidence,
  getCurrentUser,
  hasPermission,
  PermissionError,
  RESIDENCE_PERMISSIONS,
  type Residence,
  type PaginatedResponse,
  type User,
  type PhoneNumberInput,
  type EmailAddressInput,
} from '~/lib/api';

export default function Residences() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [user, setUser] = useState<User | null>(null);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingResidence, setEditingResidence] = useState<Residence | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingResidence, setDeletingResidence] = useState<Residence | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Permission helpers
  const canAdd = hasPermission(user, RESIDENCE_PERMISSIONS.add);
  const canChange = hasPermission(user, RESIDENCE_PERMISSIONS.change);
  const canDelete = hasPermission(user, RESIDENCE_PERMISSIONS.delete);

  // Form state
  const [houseNumber, setHouseNumber] = useState('');
  const [name, setName] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberInput[]>([
    { number: '', label: '', is_primary: true },
  ]);
  const [emailAddresses, setEmailAddresses] = useState<EmailAddressInput[]>([
    { email: '', label: '', is_primary: true },
  ]);

  useEffect(() => {
    const tokens = getStoredTokens();
    if (!tokens) {
      navigate('/login');
      return;
    }

    // Fetch user permissions on mount
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

  useEffect(() => {
    if (user) {
      fetchResidences();
    }
  }, [page, user]);

  const fetchResidences = async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<Residence> = await getResidences(page);
      setResidences(data.results);
      setTotalPages(Math.ceil(data.count / 10));
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        navigate('/login');
      } else if (err instanceof PermissionError) {
        setError('You do not have permission to view residences');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load residences');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleOpenCreateDialog = () => {
    setEditingResidence(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (residence: Residence) => {
    if (!canChange) {
      setSnackbar({
        open: true,
        message: 'You do not have permission to edit residences',
        severity: 'error',
      });
      return;
    }
    setEditingResidence(residence);
    setHouseNumber(residence.house_number);
    setName(residence.name);
    setPhoneNumbers(
      residence.phone_numbers.length > 0
        ? residence.phone_numbers.map((p) => ({
            number: p.number,
            label: p.label,
            is_primary: p.is_primary,
          }))
        : [{ number: '', label: '', is_primary: true }]
    );
    setEmailAddresses(
      residence.email_addresses.length > 0
        ? residence.email_addresses.map((e) => ({
            email: e.email,
            label: e.label,
            is_primary: e.is_primary,
          }))
        : [{ email: '', label: '', is_primary: true }]
    );
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingResidence(null);
    resetForm();
  };

  const resetForm = () => {
    setHouseNumber('');
    setName('');
    setPhoneNumbers([{ number: '', label: '', is_primary: true }]);
    setEmailAddresses([{ email: '', label: '', is_primary: true }]);
    setFormError('');
  };

  const handleOpenDeleteDialog = (residence: Residence) => {
    setDeletingResidence(residence);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingResidence(null);
  };

  const handleDelete = async () => {
    if (!deletingResidence) return;

    setDeleting(true);
    try {
      await deleteResidence(deletingResidence.id);
      handleCloseDeleteDialog();
      setSnackbar({ open: true, message: 'Residence deleted successfully', severity: 'success' });
      fetchResidences();
    } catch (err) {
      handleCloseDeleteDialog();
      if (err instanceof PermissionError) {
        setSnackbar({
          open: true,
          message: 'You do not have permission to delete residences',
          severity: 'error',
        });
      } else {
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : 'Failed to delete residence',
          severity: 'error',
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleAddPhone = () => {
    setPhoneNumbers([...phoneNumbers, { number: '', label: '', is_primary: false }]);
  };

  const handleRemovePhone = (index: number) => {
    const updated = phoneNumbers.filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated.push({ number: '', label: '', is_primary: true });
    }
    setPhoneNumbers(updated);
  };

  const handlePhoneChange = (
    index: number,
    field: keyof PhoneNumberInput,
    value: string | boolean
  ) => {
    const updated = [...phoneNumbers];
    if (field === 'is_primary' && value === true) {
      updated.forEach((p, i) => (p.is_primary = i === index));
    } else {
      (updated[index] as any)[field] = value;
    }
    setPhoneNumbers(updated);
  };

  const handleAddEmail = () => {
    setEmailAddresses([...emailAddresses, { email: '', label: '', is_primary: false }]);
  };

  const handleRemoveEmail = (index: number) => {
    const updated = emailAddresses.filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated.push({ email: '', label: '', is_primary: true });
    }
    setEmailAddresses(updated);
  };

  const handleEmailChange = (
    index: number,
    field: keyof EmailAddressInput,
    value: string | boolean
  ) => {
    const updated = [...emailAddresses];
    if (field === 'is_primary' && value === true) {
      updated.forEach((e, i) => (e.is_primary = i === index));
    } else {
      (updated[index] as any)[field] = value;
    }
    setEmailAddresses(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const validPhones = phoneNumbers.filter((p) => p.number.trim() !== '');
      const validEmails = emailAddresses.filter((e) => e.email.trim() !== '');

      const data = {
        house_number: houseNumber,
        name,
        phone_numbers: validPhones,
        email_addresses: validEmails,
      };

      if (editingResidence) {
        await updateResidence(editingResidence.id, data);
        setSnackbar({ open: true, message: 'Residence updated successfully', severity: 'success' });
      } else {
        await createResidence(data);
        setSnackbar({ open: true, message: 'Residence created successfully', severity: 'success' });
      }

      handleCloseDialog();
      fetchResidences();
    } catch (err) {
      if (err instanceof PermissionError) {
        handleCloseDialog();
        setSnackbar({
          open: true,
          message: `You do not have permission to ${editingResidence ? 'update' : 'create'} residences`,
          severity: 'error',
        });
      } else {
        setFormError(
          err instanceof Error ? err.message : `Failed to ${editingResidence ? 'update' : 'create'} residence`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => navigate('/')}
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Home sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {isMobile ? 'Residences' : 'Residency Management'}
          </Typography>
          {canAdd && (isMobile ? (
            <IconButton color="inherit" onClick={handleOpenCreateDialog}>
              <Add />
            </IconButton>
          ) : (
            <Button
              color="inherit"
              startIcon={<Add />}
              sx={{ mr: 2 }}
              onClick={handleOpenCreateDialog}
            >
              Add Residence
            </Button>
          ))}
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : residences.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 } }}>
            <Home sx={{ fontSize: { xs: 48, sm: 64 }, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No residences found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {canAdd ? 'Get started by adding your first residence' : 'No residences available'}
            </Typography>
            {canAdd && (
              <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreateDialog}>
                Add Residence
              </Button>
            )}
          </Box>
        ) : isMobile ? (
          /* Mobile List View */
          <Box>
            {residences.map((residence, index) => (
              <Box key={residence.id}>
                <Box
                  onClick={() => handleOpenEditDialog(residence)}
                  sx={{
                    py: 2,
                    cursor: 'pointer',
                    '&:active': { bgcolor: 'grey.50' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={500}>
                        {residence.house_number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {residence.name}
                      </Typography>

                      {residence.phone_numbers.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1.5 }}>
                          {residence.phone_numbers.map((phone) => (
                            <Chip
                              key={phone.id}
                              icon={<Phone />}
                              label={phone.number}
                              size="small"
                              variant={phone.is_primary ? 'filled' : 'outlined'}
                              color={phone.is_primary ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      )}

                      {residence.email_addresses.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                          {residence.email_addresses.map((email) => (
                            <Chip
                              key={email.id}
                              icon={<Email />}
                              label={email.email}
                              size="small"
                              variant={email.is_primary ? 'filled' : 'outlined'}
                              color={email.is_primary ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    {canDelete && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteDialog(residence);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                {index < residences.length - 1 && <Divider />}
              </Box>
            ))}

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </Box>
        ) : (
          /* Desktop Table View */
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>House Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone Numbers</TableCell>
                    <TableCell>Email Addresses</TableCell>
                    {canDelete && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {residences.map((residence) => (
                    <TableRow
                      key={residence.id}
                      hover
                      onClick={() => handleOpenEditDialog(residence)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography fontWeight="medium">{residence.house_number}</Typography>
                      </TableCell>
                      <TableCell>{residence.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {residence.phone_numbers.map((phone) => (
                            <Chip
                              key={phone.id}
                              icon={<Phone />}
                              label={phone.number}
                              size="small"
                              variant={phone.is_primary ? 'filled' : 'outlined'}
                              color={phone.is_primary ? 'primary' : 'default'}
                            />
                          ))}
                          {residence.phone_numbers.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {residence.email_addresses.map((email) => (
                            <Chip
                              key={email.id}
                              icon={<Email />}
                              label={email.email}
                              size="small"
                              variant={email.is_primary ? 'filled' : 'outlined'}
                              color={email.is_primary ? 'primary' : 'default'}
                            />
                          ))}
                          {residence.email_addresses.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      {canDelete && (
                        <TableCell align="right">
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteDialog(residence);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Create/Edit Residence Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isMobile && (
                <IconButton edge="start" onClick={handleCloseDialog} size="small">
                  <ArrowBack />
                </IconButton>
              )}
              {editingResidence ? 'Edit Residence' : 'Add New Residence'}
            </Box>
            {!isMobile && (
              <IconButton onClick={handleCloseDialog} size="small">
                <Close />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <TextField
              autoFocus
              required
              fullWidth
              label="House Number"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              margin="normal"
            />

            <TextField
              required
              fullWidth
              label="Resident Name"
              placeholder="e.g., Mr. & Mrs. Mensah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
            />

            <Divider sx={{ my: 3 }} />

            {/* Phone Numbers */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Phone Numbers
                </Typography>
                <Button size="small" startIcon={<Add />} onClick={handleAddPhone}>
                  Add Phone
                </Button>
              </Box>
              {phoneNumbers.map((phone, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    mb: 2,
                    alignItems: { xs: 'stretch', sm: 'center' },
                    p: { xs: 1.5, sm: 0 },
                    bgcolor: { xs: 'grey.50', sm: 'transparent' },
                    borderRadius: { xs: 1, sm: 0 },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                    <TextField
                      size="small"
                      label="Phone Number"
                      value={phone.number}
                      onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                      sx={{ flex: 2 }}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      label="Label"
                      placeholder="Mobile"
                      value={phone.label}
                      onChange={(e) => handlePhoneChange(index, 'label', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={phone.is_primary}
                          onChange={(e) => handlePhoneChange(index, 'is_primary', e.target.checked)}
                        />
                      }
                      label="Primary"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemovePhone(index)}
                      disabled={phoneNumbers.length === 1 && phone.number === ''}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Email Addresses */}
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Email Addresses
                </Typography>
                <Button size="small" startIcon={<Add />} onClick={handleAddEmail}>
                  Add Email
                </Button>
              </Box>
              {emailAddresses.map((email, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    mb: 2,
                    alignItems: { xs: 'stretch', sm: 'center' },
                    p: { xs: 1.5, sm: 0 },
                    bgcolor: { xs: 'grey.50', sm: 'transparent' },
                    borderRadius: { xs: 1, sm: 0 },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                    <TextField
                      size="small"
                      label="Email Address"
                      type="email"
                      value={email.email}
                      onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                      sx={{ flex: 2 }}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      label="Label"
                      placeholder="Personal"
                      value={email.label}
                      onChange={(e) => handleEmailChange(index, 'label', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={email.is_primary}
                          onChange={(e) => handleEmailChange(index, 'is_primary', e.target.checked)}
                        />
                      }
                      label="Primary"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveEmail(index)}
                      disabled={emailAddresses.length === 1 && email.email === ''}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              pb: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 },
            }}
          >
            <Button
              onClick={handleCloseDialog}
              fullWidth={isMobile}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              fullWidth={isMobile}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {saving ? (
                <CircularProgress size={24} />
              ) : editingResidence ? (
                'Update Residence'
              ) : (
                'Create Residence'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        sx={{
          '& .MuiDialog-paper': {
            mx: { xs: 2, sm: 'auto' },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
          },
        }}
      >
        <DialogTitle>Delete Residence</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete residence{' '}
            <strong>{deletingResidence?.house_number}</strong> ({deletingResidence?.name})? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            px: { xs: 2, sm: 1 },
            pb: { xs: 2, sm: 1 },
          }}
        >
          <Button
            onClick={handleCloseDeleteDialog}
            fullWidth={isMobile}
            sx={{ order: { xs: 2, sm: 1 } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            fullWidth={isMobile}
            sx={{ order: { xs: 1, sm: 2 } }}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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
