import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
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
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AppHeader from '~/components/AppHeader';
import Footer from '~/components/Footer';
import PageLoader from '~/components/PageLoader';
import {
  Add,
  ArrowBack,
  Clear,
  Close,
  Delete,
  Home,
  Logout,
  Search,
} from '@mui/icons-material';
import { getStoredTokens, clearTokens } from '~/lib/auth';
import {
  getResidences,
  searchResidences,
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
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

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
  }, [page, search, user]);

  const fetchResidences = async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<Residence> = search
        ? await searchResidences(search, page)
        : await getResidences(page);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', minHeight: '100vh', pb: 'env(safe-area-inset-bottom)' }}>
      <AppHeader>
        <IconButton
          color="inherit"
          edge="start"
          onClick={() => navigate('/')}
          sx={{ mr: 1 }}
        >
          <ArrowBack />
        </IconButton>
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
      </AppHeader>

      <Container maxWidth="lg" sx={{ flexGrow: 1, mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 3 } }}>
        {/* Search Bar - only show if there are residences or user is searching */}
        {(residences.length > 0 || search) && (
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search by house #, name, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ width: '100%', maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <PageLoader />
        ) : residences.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 } }}>
            <Home sx={{ fontSize: { xs: 48, sm: 64 }, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {search ? 'No results found' : 'No residences found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {search
                ? 'Try a different search term'
                : canAdd
                ? 'Get started by adding your first residence'
                : 'No residences available'}
            </Typography>
            {search ? (
              <Button variant="outlined" onClick={handleClearSearch}>
                Clear Search
              </Button>
            ) : canAdd && (
              <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreateDialog}>
                Add Residence
              </Button>
            )}
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Phones</TableCell>
                    <TableCell>Emails</TableCell>
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
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {residence.house_number}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {residence.name}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {residence.phone_numbers.length > 0
                          ? residence.phone_numbers.map((p) => p.number).join(', ')
                          : ''}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {residence.email_addresses.length > 0
                          ? residence.email_addresses.map((e) => e.email).join(', ')
                          : ''}
                      </TableCell>
                      {canDelete && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
                  size={isMobile ? 'small' : 'medium'}
                />
              </Box>
            )}
          </>
        )}
      </Container>

      <Footer />

      {/* Create/Edit Residence Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        {isMobile ? (
          <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Toolbar>
              <IconButton edge="start" onClick={handleCloseDialog}>
                <Close />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1, ml: 1 }}>
                {editingResidence ? 'Edit Residence' : 'Add Residence'}
              </Typography>
              <Button
                color="primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Toolbar>
          </AppBar>
        ) : (
          <DialogTitle>
            {editingResidence ? 'Edit Residence' : 'Add Residence'}
          </DialogTitle>
        )}
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
              sx={{ mb: 2 }}
            />

            <TextField
              required
              fullWidth
              label="Resident Name"
              placeholder="e.g., Mr. & Mrs. Mensah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 3 }}
            />

            {/* Phone Numbers */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Phone Numbers
                </Typography>
                <Button size="small" onClick={handleAddPhone}>
                  + Add
                </Button>
              </Box>
              {phoneNumbers.map((phone, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  sx={{ mb: 1, alignItems: 'center' }}
                >
                  <TextField
                    size="small"
                    placeholder="Phone number"
                    value={phone.number}
                    onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    placeholder="Label"
                    value={phone.label}
                    onChange={(e) => handlePhoneChange(index, 'label', e.target.value)}
                    sx={{ width: 100 }}
                  />
                  <Checkbox
                    size="small"
                    checked={phone.is_primary}
                    onChange={(e) => handlePhoneChange(index, 'is_primary', e.target.checked)}
                    title="Primary"
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemovePhone(index)}
                    disabled={phoneNumbers.length === 1 && phone.number === ''}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Box>

            {/* Email Addresses */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Email Addresses
                </Typography>
                <Button size="small" onClick={handleAddEmail}>
                  + Add
                </Button>
              </Box>
              {emailAddresses.map((email, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  sx={{ mb: 1, alignItems: 'center' }}
                >
                  <TextField
                    size="small"
                    placeholder="Email address"
                    type="email"
                    value={email.email}
                    onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    placeholder="Label"
                    value={email.label}
                    onChange={(e) => handleEmailChange(index, 'label', e.target.value)}
                    sx={{ width: 100 }}
                  />
                  <Checkbox
                    size="small"
                    checked={email.is_primary}
                    onChange={(e) => handleEmailChange(index, 'is_primary', e.target.checked)}
                    title="Primary"
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveEmail(index)}
                    disabled={emailAddresses.length === 1 && email.email === ''}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Box>
          </DialogContent>
          {!isMobile && (
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="outlined" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                sx={{ minWidth: 100 }}
              >
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </DialogActions>
          )}
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
      >
        <DialogTitle>Delete Residence</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deletingResidence?.house_number}</strong> ({deletingResidence?.name})?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={handleCloseDeleteDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            sx={{ minWidth: 100 }}
          >
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
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
