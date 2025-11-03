import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog-focal';
import { Input } from '@/components/ui/input';
import { API_BASE_URL, apiFetch } from '@/pages/Official/Reports/api/api';
import { ArrowLeft, Camera, Check, Eye, EyeOff, Loader2, User, X } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFocalAuth } from '../../context/focalAuthContext';
import type { AccountSettingsModalProps } from '../types/accountSettings';
import { isAccountFormDirty, validatePassword } from '../utils/passwordUtils';

export default function AccountSettingsModal({ open, onClose, onSaved, onSaveProfile, center = null, isDirtyRef = null }: AccountSettingsModalProps) {
    // Helper to refresh profile data from backend
    const [refreshHover, setRefreshHover] = useState(false);
    const [closeHover, setCloseHover] = useState(false);

    const refreshProfile = async () => {
        if (!focalId) {
            console.warn('[AccountSettingsModal] Cannot refresh: No focalId available');
            return;
        }
        try {
            const data = await apiFetch<{
                firstName?: string;
                lastName?: string;
                contactNumber?: string;
                email?: string;
                updatedAt?: string;
                approvedBy?: string;
            }>(`/focalperson/${focalId}`);
            setFirstName(data.firstName || '');
            setLastName(data.lastName || '');
            setPhoneNumber(data.contactNumber || '');
            setEmail(data.email || '');
            setLastUpdated(data.updatedAt || null);
            setIsVerified(!!data.approvedBy);
            setInitialProfile((prev) => ({
                ...prev,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phoneNumber: data.contactNumber || '',
                email: data.email || '',
            }));

            // Fetch photo as blob and create object URL using API_BASE_URL (await so we can show toast reliably)
            const token = localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token') || '';
            if (!token) {
                console.warn('[AccountSettingsModal] No auth token for photo refresh');
                setPhotoUrl(null);
                setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
                setPhotoFile(null);
                // Notify dashboard to show bottom-left toast
                try { window.dispatchEvent(new CustomEvent('dashboard:show-saved', { detail: { message: 'Refreshed successfully!', showViewLogs: false } })); } catch { /* Ignore event errors */ }
                return;
            }

            try {
                const resPhoto = await fetch(`${API_BASE_URL}/focalperson/${focalId}/photo`, {
                    credentials: 'include',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!resPhoto.ok) {
                    // No photo available
                    setPhotoUrl(null);
                    setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
                } else {
                    const blob = await resPhoto.blob();
                    if (blob.size > 0) {
                        const url = URL.createObjectURL(blob);
                        setPhotoUrl(url);
                        setInitialProfile((prev) => ({ ...prev, photoUrl: url }));
                    } else {
                        setPhotoUrl(null);
                        setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
                    }
                }
            } catch (err) {
                console.error('[AccountSettingsModal] Failed to refresh photo:', err);
                setPhotoUrl(null);
                setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
            }

            setPhotoFile(null); // reset file input

            // Notify dashboard to show bottom-left toast
            try { window.dispatchEvent(new CustomEvent('dashboard:show-saved', { detail: { message: 'Refreshed successfully!', showViewLogs: false } })); } catch { /* Ignore event errors */ }
        } catch (err) {
            console.error('[AccountSettingsModal] Failed to refresh profile:', err);
            // fallback to empty or previous state
        }
    };
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoError, setPhotoError] = useState('');
    const [photoDeleted, setPhotoDeleted] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    // const [isDragging, setIsDragging] = useState(false); // Removed unused variable
    const { focalId } = useFocalAuth();
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [confirmExitOpen, setConfirmExitOpen] = useState(false);
    // View state - 'profile' or 'password'
    const [view, setView] = useState<'profile' | 'password'>('profile');

    // Profile form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);

    // Validation errors
    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [emailError, setEmailError] = useState('');

    // Validation functions
    const validateFirstName = (value: string): string => {
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'First name can only contain letters';
        return '';
    };

    const validateLastName = (value: string): string => {
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Last name can only contain letters';
        return '';
    };

    const validatePhoneNumber = (value: string): string => {
        if (!value.trim()) return 'Phone number is required';
        // Philippine phone number: must start with 09 and have 11 digits
        const cleaned = value.replace(/\s/g, '');
        if (!/^09\d{9}$/.test(cleaned)) {
            return 'Phone number must be in format: 09XXXXXXXXX (11 digits)';
        }
        return '';
    };

    const validateEmailAddress = (value: string): string => {
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
    };

    // Handle input changes with validation
    const handleFirstNameChange = (value: string) => {
        // Allow only letters and spaces (prevent numbers/symbols)
        const sanitized = value.replace(/[^a-zA-Z\s]/g, '');
        setFirstName(sanitized);
        setFirstNameError(validateFirstName(sanitized));
    };

    const handleLastNameChange = (value: string) => {
        // Allow only letters and spaces (prevent numbers/symbols)
        const sanitized = value.replace(/[^a-zA-Z\s]/g, '');
        setLastName(sanitized);
        setLastNameError(validateLastName(sanitized));
    };

    const handlePhoneNumberChange = (value: string) => {
        // Strip spaces and non-digit characters; keep digits only and limit to 11 digits
        const v = value.replace(/\s+/g, '').replace(/\D+/g, '').slice(0, 11);
        setPhoneNumber(v);
        setPhoneError(validatePhoneNumber(v));
    };

    const handleEmailChange = (value: string) => {
        // Remove accidental spaces from email input
        const v = value.replace(/\s+/g, '');
        setEmail(v);
        setEmailError(validateEmailAddress(v));
    };

    // Profile picture validation
    const validateProfilePicture = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            // Check file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            const minSize = 10 * 1024; // 10KB in bytes

            if (file.size > maxSize) {
                resolve('Image size must be less than 5MB');
                return;
            }

            if (file.size < minSize) {
                resolve('Image size is too small (minimum 10KB)');
                return;
            }

            // Check file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                resolve('Only JPG, PNG, and WebP images are allowed');
                return;
            }

            // Check image dimensions
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                const minDimension = 200;
                const maxDimension = 4096;

                if (img.width < minDimension || img.height < minDimension) {
                    resolve(`Image dimensions must be at least ${minDimension}x${minDimension} pixels`);
                    return;
                }

                if (img.width > maxDimension || img.height > maxDimension) {
                    resolve(`Image dimensions must not exceed ${maxDimension}x${maxDimension} pixels`);
                    return;
                }

                // All validations passed
                resolve('');
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve('Invalid image file');
            };

            img.src = objectUrl;
        });
    };

    // Handle profile picture change
    const handleProfilePictureChange = async (file: File | null) => {
        if (!file) {
            setPhotoFile(null);
            setPhotoError('');
            setPhotoLoading(false);
            return;
        }

        setPhotoLoading(true);
        const error = await validateProfilePicture(file);
        if (error) {
            setPhotoError(error);
            setPhotoFile(null);
            setPhotoLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            setPhotoError('');
            setPhotoFile(file);
            setPhotoLoading(false);
        }
    };

    // Track initial values for dirty check
    const [initialProfile, setInitialProfile] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        photoUrl: null as string | null,
    });

    useEffect(() => {
        if (!open) return;
        if (!focalId) {
            console.warn('[AccountSettingsModal] No focalId available');
            return;
        }

        // Fetch focal person data
        apiFetch<{
            firstName?: string;
            lastName?: string;
            contactNumber?: string;
            email?: string;
            updatedAt?: string;
            approvedBy?: string;
        }>(`/focalperson/${focalId}`)
            .then((data) => {
                setFirstName(data.firstName || '');
                setLastName(data.lastName || '');
                setPhoneNumber(data.contactNumber || '');
                setEmail(data.email || '');
                setLastUpdated(data.updatedAt || null);
                setIsVerified(!!data.approvedBy);
                setInitialProfile((prev) => ({
                    ...prev,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    phoneNumber: data.contactNumber || '',
                    email: data.email || '',
                    // photoUrl will be set after fetch below
                }));
            })
            .catch((err) => {
                console.error('[AccountSettingsModal] Failed to fetch focal person data:', err);
                // fallback to empty or previous state
            });

        // Fetch photo as blob and create object URL using API_BASE_URL
        const token = localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token') || '';
        if (!token) {
            console.warn('[AccountSettingsModal] No auth token available');
            setPhotoUrl(null);
            setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
            return;
        }

        fetch(`${API_BASE_URL}/focalperson/${focalId}/photo`, {
            credentials: 'include',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('No photo');
                const blob = await res.blob();
                if (blob.size > 0) {
                    const url = URL.createObjectURL(blob);
                    setPhotoUrl(url);
                    setInitialProfile((prev) => ({ ...prev, photoUrl: url }));
                } else {
                    setPhotoUrl(null);
                    setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
                }
            })
            .catch((err) => {
                console.error('[AccountSettingsModal] Failed to fetch photo:', err);
                setPhotoUrl(null);
                setInitialProfile((prev) => ({ ...prev, photoUrl: null }));
            });

        setPhotoFile(null); // reset file input
        setPhotoDeleted(false); // reset deletion flag
    }, [open, focalId]);

    // Change password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Validation flags (derived from helper)

    // Error state for password change
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [samePasswordError, setSamePasswordError] = useState<string | null>(null);

    // Change Password handler
    const handleChangePassword = async () => {
        if (!focalId) return;
        setPasswordError(null);
        setSamePasswordError(null);
        if (currentPassword && newPassword && currentPassword === newPassword) {
            setSamePasswordError('New password must be different from the current password.');
            return;
        }
        try {
            const token = localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch(`${API_BASE_URL}/focalperson/me/changePassword`, {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            }).then(async res => {
                if (res.status === 401 || res.status === 403) {
                    const error = await res.text();
                    throw new Error(error || 'Session expired or forbidden.');
                }
                if (!res.ok) {
                    const error = await res.text();
                    throw new Error(error || res.statusText);
                }
                return res.json();
            });
            setConfirmSaveOpen(false);
            setView('profile');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            if (onSaved) onSaved();
        } catch (err: unknown) {
            // Show error below password field if incorrect password
            const error = err as Error;
            if (error.message && error.message.toLowerCase().includes('current password is incorrect')) {
                setPasswordError('Current password is incorrect.');
            } else {
                alert(error.message || 'Failed to change password.');
            }
        }
    };
    const [hasMinLength, setHasMinLength] = useState(false);
    const [hasUpper, setHasUpper] = useState(false);
    const [hasLower, setHasLower] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);
    const [hasSpecial, setHasSpecial] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);

    useEffect(() => {
        const v = validatePassword(newPassword, confirmPassword);
        setHasMinLength(v.hasMinLength);
        setHasUpper(v.hasUpper);
        setHasLower(v.hasLower);
        setHasNumber(v.hasNumber);
        setHasSpecial(v.hasSpecial);
        setPasswordsMatch(v.passwordsMatch);
    }, [newPassword, confirmPassword]);

    // form reset helper (run when fully unmounted)
    const resetForm = () => {
        setView('profile');
        setFirstName('');
        setLastName('');
        setPhoneNumber('');
        setEmail('');
        setFirstNameError('');
        setLastNameError('');
        setPhoneError('');
        setEmailError('');
        setPhotoError('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setHasMinLength(false);
        setHasUpper(false);
        setHasLower(false);
        setHasNumber(false);
        setHasSpecial(false);
        setPasswordsMatch(false);
        setConfirmSaveOpen(false);
        setConfirmExitOpen(false);
        setPasswordError(null);
        setSamePasswordError(null);
    };

    // Helper to check if any field or photo is dirty
    const isAnyDirty = () => {
        // Profile fields
        const profileDirty = firstName !== initialProfile.firstName ||
            lastName !== initialProfile.lastName ||
            phoneNumber !== initialProfile.phoneNumber ||
            email !== initialProfile.email;
        // Password fields
        const passwordDirty = currentPassword !== '' || newPassword !== '' || confirmPassword !== '';
        // Photo dirty: changed, added, removed, or deletion flagged
        const photoDirty = photoFile !== null || photoDeleted || (photoUrl === null && initialProfile.photoUrl !== null);
        return profileDirty || passwordDirty || photoDirty;
    };

    // When user clicks the close button inside the modal, only show confirm if dirty
    const handleClose = () => {
        if (isAnyDirty()) {
            setConfirmExitOpen(true);
        } else {
            if (onClose) onClose();
        }
    };

    // Animation mount/show state
    const ANIM_MS = 220;
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(open);

    useEffect(() => {
        if (open) {
            setMounted(true);
            // next frame to allow CSS transition
            requestAnimationFrame(() => setVisible(true));
        } else {
            // start exit animation
            setVisible(false);
            const t = setTimeout(() => {
                setMounted(false);
                resetForm();
            }, ANIM_MS + 20);
            return () => { clearTimeout(t); };
        }
    }, [open]);

    // Expose dirty-check to parent via optional ref
    useEffect(() => {
        if (!isDirtyRef) return;
        if (view === 'password') {
            isDirtyRef.current = () => isAccountFormDirty(currentPassword, newPassword, confirmPassword);
        } else {
            isDirtyRef.current = () => {
                return (
                    firstName !== initialProfile.firstName ||
                    lastName !== initialProfile.lastName ||
                    phoneNumber !== initialProfile.phoneNumber ||
                    email !== initialProfile.email
                );
            };
        }
    }, [view, currentPassword, newPassword, confirmPassword, firstName, lastName, phoneNumber, email, isDirtyRef, initialProfile]);

    if (!mounted) return null;

    // match History modal sizing: fixed height (85vh) and inner scroll area
    // Dynamic height for Profile Information view, fixed for Change Password
    const baseStyle: React.CSSProperties = {
        width: 'min(780px, 96%)',
        minHeight: 80,
        background: '#0d0d0d',
        color: '#fff',
        borderRadius: 7,
        padding: '62px 75px',
        display: 'flex',
        flexDirection: 'column',
    };

    // If profile view, allow height to grow with content, else use fixed height for password view
    const modalStyle: React.CSSProperties = center
        ? {
            ...baseStyle,
            position: 'fixed',
            left: center.x,
            top: center.y,
            transform: 'translate(-50%, -50%)',
            background: '#171717',
            ...(view === 'profile' ? { height: 'auto', maxHeight: '96vh', overflow: 'visible' } : { height: '75vh', overflow: 'auto' })
        }
        : {
            ...baseStyle,
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#171717',
            ...(view === 'profile' ? { height: 'auto', maxHeight: '96vh', overflow: 'visible' } : { height: '75vh', overflow: 'auto' })
        };

    const allRulesSatisfied = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: 99,
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        transition: `background ${ANIM_MS}ms ease`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    };

    const animatedModalStyle: React.CSSProperties = {
        ...modalStyle,
        zIndex: 99,
        transition: `transform ${ANIM_MS}ms cubic-bezier(.2,.9,.3,1), opacity ${ANIM_MS}ms ease`,
        transform: visible ? modalStyle.transform + ' scale(1)' : (modalStyle.transform + ' translateY(-8px) scale(0.98)'),
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
    } as React.CSSProperties;


    // Helper to format "time ago" for last password change
    function timeAgo(date: Date): string {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 }
        ];
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        return 'just now';
    }

    return (
        <div style={overlayStyle}>
            <div style={animatedModalStyle}>
                {/* Exit and Refresh buttons */}
                <div style={{ position: 'absolute', right: 35, top: 30, display: 'flex', gap: 20 }}>
                    <button
                        onClick={refreshProfile}
                        aria-label="Refresh"
                        onMouseEnter={() => setRefreshHover(true)}
                        onMouseLeave={() => setRefreshHover(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: refreshHover ? '#fff' : '#BABABA',
                            fontSize: 19,
                            cursor: 'pointer',
                            marginRight: 2,
                            transition: 'color 0.18s, transform 0.18s',
                            transform: refreshHover ? 'scale(1.06) rotate(12deg)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                        title="Refresh profile data"
                    >
                        <RefreshCw size={17} />
                    </button>
                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        onMouseEnter={() => setCloseHover(true)}
                        onMouseLeave={() => setCloseHover(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: closeHover ? '#fff' : '#BABABA',
                            fontSize: 18,
                            cursor: 'pointer',
                            transition: 'color 0.18s, transform 0.18s',
                            transform: closeHover ? 'scale(1.06)' : 'none'
                        }}
                    >✕</button>

                    {/* Small inline toast shown after refresh */}
                    {/* no inline toast here; dashboard will show the bottom-left toast */}
                </div>

                {/* Exit confirmation dialog */}
                <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently discard your changes.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setConfirmExitOpen(false)} className="px-4 py-2 mt-3 bg-[#1b1b1b] text-white border border-[#3E3E3E] cursor-pointer transition duration-175 hover:bg-[#222222]" style={{ borderRadius: 8, fontSize: 15 }}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                setConfirmExitOpen(false);
                                try { onClose?.(); } catch { /* Ignore callback errors */ }
                            }} className="px-4 py-2 mt-3 bg-[#fff] text-black hover:bg-[#e2e2e2] rounded cursor-pointer transition duration-175" style={{ borderRadius: 8, fontSize: 15 }}>
                                Continue
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {view === 'profile' ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2 }}>
                            <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: 0.6 }}>Profile Information</h2>
                        </div>

                        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', paddingRight: 6, overflowY: 'auto', maxHeight: 'calc(96vh - 220px)' }}>
                            {/* Profile Image */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative flex flex-col items-center justify-center" style={{ width: 160, height: 160 }}>
                                    <div
                                        className={`w-[160px] h-[160px] rounded-full overflow-hidden cursor-pointer flex items-center justify-center ${photoError ? 'ring-2 ring-red-500' : 'bg-[#232323]'}`}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files[0];
                                            if (file && file.type.startsWith('image/')) {
                                                await handleProfilePictureChange(file);
                                            }
                                        }}
                                        onDragOver={e => { e.preventDefault(); }}
                                        onDragLeave={e => { e.preventDefault(); }}
                                        onClick={() => document.getElementById('profile-photo-upload')?.click()}
                                        style={{ width: 140, height: 140 }}
                                        title="Upload profile picture&#10;Max size: 5MB | Min dimensions: 200x200px&#10;Allowed formats: JPG, PNG, WebP"
                                    >
                                        {photoLoading ? (
                                            <div className="w-full h-full bg-[#262626] rounded-full flex items-center justify-center">
                                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                            </div>
                                        ) : photoFile === null && !photoUrl ? (
                                            <div className="w-full h-full bg-[#262626] rounded-full flex items-center justify-center">
                                                <User className="w-16 h-16 text-[#BABABA] opacity-60" />
                                            </div>
                                        ) : photoFile ? (
                                            <img
                                                src={URL.createObjectURL(photoFile)}
                                                alt="Profile"
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : photoUrl ? (
                                            <img
                                                src={photoUrl || undefined}
                                                alt="Profile"
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : null}
                                    </div>
                                    {/* Remove button if photoFile is set or photoUrl exists */}
                                    {(photoFile || photoUrl) && (
                                        <div
                                            className="absolute bottom-[30px] right-4 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors shadow-lg"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setPhotoFile(null);
                                                setPhotoUrl(null);
                                                setPhotoError('');
                                                setPhotoDeleted(true);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            style={{ transform: 'translateY(50%)' }}
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    {/* Camera button if no photoFile and no photoUrl */}
                                    {!photoFile && !photoUrl && (
                                        <div
                                            className="absolute -bottom-[-30px] right-4 w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
                                            onClick={e => { e.stopPropagation(); document.getElementById('profile-photo-upload')?.click(); }}
                                            style={{ transform: 'translateY(50%)' }}
                                        >
                                            <Camera className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    id="profile-photo-upload"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0] || null;
                                        if (file) {
                                            await handleProfilePictureChange(file);
                                        }
                                    }}
                                    className="hidden"
                                />
                                {/* Photo error message */}
                                {photoError && (
                                    <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                                        {photoError}
                                    </div>
                                )}
                            </div>

                            {/* Name Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ fontSize: 14, color: '#FFFFFF', display: 'block', marginBottom: 8 }}>First Name</label>
                                    <Input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => handleFirstNameChange((e.target as HTMLInputElement).value)}
                                        style={{
                                            padding: '24px 17px',
                                            border: `1px solid ${firstNameError ? '#ef4444' : '#404040'}`,
                                            borderRadius: 6,
                                            background: 'transparent',
                                            color: '#fff',
                                            fontSize: 15,
                                            height: 44
                                        }}
                                        className="bg-input/10 text-white"
                                    />
                                    {firstNameError && (
                                        <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{firstNameError}</div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ fontSize: 14, color: '#FFFFFF', display: 'block', marginBottom: 8 }}>Last Name</label>
                                    <Input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => handleLastNameChange((e.target as HTMLInputElement).value)}
                                        style={{
                                            padding: '24px 17px',
                                            border: `1px solid ${lastNameError ? '#ef4444' : '#404040'}`,
                                            borderRadius: 6,
                                            background: 'transparent',
                                            color: '#fff',
                                            fontSize: 15,
                                            height: 44
                                        }}
                                        className="bg-input/10 text-white"
                                    />
                                    {lastNameError && (
                                        <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{lastNameError}</div>
                                    )}
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 14, color: '#FFFFFF', display: 'block', marginBottom: 8 }}>Phone Number</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span className="flex items-center px-4 py-[12.5px] bg-[#171717] border border-[#404040] rounded-[6px] border: '1px solid #404040'">
                                        <img src="/public/Landing/phFlag.png" alt="PH" className="w-4 h-3 mr-2" />
                                        <span className="text-[#A3A3A3] text-[15px] font-medium">+63</span>
                                    </span>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => handlePhoneNumberChange((e.target as HTMLInputElement).value)}
                                            placeholder="Phone Number"
                                            style={{
                                                padding: '24px 17px',
                                                border: `1px solid ${phoneError ? '#ef4444' : '#404040'}`,
                                                borderRadius: 6,
                                                background: 'transparent',
                                                color: '#fff',
                                                fontSize: 15,
                                                height: 44,
                                                width: '100%'
                                            }}
                                            className="bg-input/10 text-white"
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            right: 15,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: isVerified ? '#3b82f6' : '#e11d48',
                                            fontWeight: 600,
                                            fontSize: 15
                                        }}>{isVerified ? 'VERIFIED' : 'NOT VERIFIED'}</span>
                                    </div>
                                </div>
                                {phoneError && (
                                    <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{phoneError}</div>
                                )}
                            </div>

                            {/* Email */}
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: 14, color: '#FFFFFF', display: 'block', marginBottom: 8 }}>Email</label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => handleEmailChange((e.target as HTMLInputElement).value)}
                                    placeholder="Email"
                                    style={{
                                        padding: '24px 17px',
                                        border: `1px solid ${emailError ? '#ef4444' : '#404040'}`,
                                        borderRadius: 6,
                                        background: 'transparent',
                                        color: '#fff',
                                        fontSize: 15,
                                        height: 44
                                    }}
                                    className="bg-input/10 text-white"
                                />
                                {emailError && (
                                    <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{emailError}</div>
                                )}
                            </div>

                            {/* Save Changes Button */}
                            <button
                                onClick={() => setConfirmSaveOpen(true)}
                                disabled={!isAnyDirty() || firstNameError !== '' || lastNameError !== '' || phoneError !== '' || emailError !== '' || photoError !== ''}
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: 6,
                                    background: (isAnyDirty() && !firstNameError && !lastNameError && !phoneError && !emailError && !photoError) ? '#ffffff' : '#414141',
                                    color: (isAnyDirty() && !firstNameError && !lastNameError && !phoneError && !emailError && !photoError) ? '#000' : '#171717',
                                    border: 'none',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: (isAnyDirty() && !firstNameError && !lastNameError && !phoneError && !emailError && !photoError) ? 'pointer' : 'not-allowed',
                                    transition: 'background 0.15s',
                                    marginBottom: 24,
                                    width: 145,
                                    height: 40,
                                    alignSelf: 'flex-end'
                                }}
                                onMouseEnter={e => { if (isAnyDirty() && !firstNameError && !lastNameError && !phoneError && !emailError && !photoError) e.currentTarget.style.background = '#e5e5e5'; }}
                                onMouseLeave={e => { if (isAnyDirty() && !firstNameError && !lastNameError && !phoneError && !emailError && !photoError) e.currentTarget.style.background = '#ffffff'; }}
                            >
                                Save Changes
                            </button>

                            {/* Save confirmation dialog */}
                            <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Save changes?</AlertDialogTitle>
                                        <AlertDialogDescription>Do you want to save your changes to your profile information? This will update your account data.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setConfirmSaveOpen(false)} className="px-4 py-2 mt-3 bg-[#1b1b1b] text-white border border-[#3E3E3E] cursor-pointer transition duration-175 hover:bg-[#222222]" style={{ borderRadius: 8, fontSize: 15 }}>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={async () => {
                                                try {
                                                    await apiFetch(`/focalperson/${focalId}`, {
                                                        method: 'PUT',
                                                        body: JSON.stringify({
                                                            firstName,
                                                            lastName,
                                                            contactNumber: phoneNumber,
                                                            email
                                                        })
                                                    });
                                                    // Handle photo deletion or update
                                                    let photoUpdated = false;

                                                    // If photo was deleted and no new file, send DELETE request
                                                    if (photoDeleted && !photoFile) {
                                                        await fetch(`${API_BASE_URL}/focalperson/${focalId}/photo`, {
                                                            method: 'DELETE',
                                                            credentials: 'include',
                                                            headers: {
                                                                Authorization: `Bearer ${localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token') || ''}`
                                                            }
                                                        });
                                                        photoUpdated = true;
                                                    }
                                                    // If new photo file, upload it
                                                    else if (photoFile) {
                                                        const formData = new FormData();
                                                        formData.append('photo', photoFile);
                                                        await fetch(`${API_BASE_URL}/focalperson/${focalId}/photos`, {
                                                            method: 'PUT',
                                                            credentials: 'include',
                                                            headers: {
                                                                Authorization: `Bearer ${localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token') || ''}`
                                                            },
                                                            body: formData
                                                        });
                                                        photoUpdated = true;
                                                    }
                                                    setConfirmSaveOpen(false);

                                                    // Call onSaveProfile to update popover instantly with new name
                                                    onSaveProfile?.({ firstName, lastName });

                                                    // Wait for confirmation modal to close before closing parent
                                                    setTimeout(() => {
                                                        if (onClose) onClose();
                                                        try { onSaved?.(); } catch { /* Ignore callback errors */ }
                                                        if (photoFile || photoUpdated) {
                                                            window.dispatchEvent(new Event('focal-profile-photo-updated'));
                                                        }
                                                    }, 200);
                                                } catch {
                                                    alert('Failed to save changes.');
                                                }
                                            }}
                                            className="px-4 py-2 mt-3 bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] text-white hover:from-[#2563eb] hover:to-[#60a5fa] cursor-pointer transition duration-175"
                                            style={{ borderRadius: 8, fontSize: 15 }}
                                        >
                                            Continue
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            {/* Password Section */}
                            <div style={{
                                padding: '20px 0',
                                borderTop: '1px solid #2b2b2b',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 600, marginBottom: 4 }}>Password</div>
                                    <div style={{ fontSize: 13, color: '#9ca3af' }}>
                                        Last changed {lastUpdated ? timeAgo(new Date(lastUpdated)) : 'N/A'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setView('password')}
                                    style={{
                                        padding: '8px 24px',
                                        width: 145,

                                        borderRadius: 6,
                                        background: '#ffffff',
                                        color: '#000',
                                        border: 'none',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                >
                                    Change
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0, zIndex: 2, marginBottom: 24 }}>
                            <button
                                onClick={() => setView('profile')}
                                aria-label="Back"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#BABABA',
                                    fontSize: 18,
                                    cursor: 'pointer',
                                    transition: 'color 0.18s, transform 0.18s',
                                    alignItems: 'center',
                                    height: 44,
                                    width: 44,
                                    justifyContent: 'center'
                                }}
                            >
                                <ArrowLeft size={22} />
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: 0.6, lineHeight: '32px' }}>Change Password</h2>
                                <div style={{ color: '#BABABA', fontSize: 14, fontWeight: 400, marginTop: 6, lineHeight: '22px' }}>
                                    Last Updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 28, display: 'grid', flex: 1, overflowY: 'auto', paddingRight: 6 }}>
                            <label style={{ fontSize: 14, color: '#FFFFFF' }}>Current Password</label>
                            <div style={{ position: 'relative' }}>
                                <Input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => { setCurrentPassword((e.target as HTMLInputElement).value); setPasswordError(null); }} placeholder="" style={{ padding: '24px 46px 24px 17px', border: '1px solid #404040', borderRadius: 6, background: 'transparent', color: '#fff', fontSize: 15 }} className="bg-input/10 text-white" />
                                <button onClick={() => setShowCurrent(s => !s)} aria-label={showCurrent ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 15, top: 0, bottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#8b8b8b', cursor: 'pointer', padding: '0 6px' }}>
                                    {showCurrent ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>
                            </div>
                            {passwordError && (
                                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4, marginBottom: 2 }}>{passwordError}</div>
                            )}

                            <label style={{ fontSize: 14, color: '#FFFFFF', marginTop: 8 }}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <Input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)} placeholder="" style={{ padding: '24px 46px 24px 17px', border: '1px solid #404040', borderRadius: 6, background: 'transparent', color: '#fff', fontSize: 15 }} className="bg-input/10 text-white" />
                                <button onClick={() => setShowNew(s => !s)} aria-label={showNew ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 15, top: 0, bottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#8b8b8b', cursor: 'pointer', padding: '0 6px' }}>
                                    {showNew ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>
                            </div>
                            {samePasswordError && (
                                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4, marginBottom: 2 }}>{samePasswordError}</div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                                <div style={{ color: '#BABABA', fontSize: 13 }}>
                                    <div style={{ marginBottom: 8, color: '#FFFFFF' }}>Your password must contain:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: hasMinLength ? '#fff' : '#A8A8A8' }}><span style={{ width: 18 }}>{hasMinLength ? <Check size={14} color="#22c55e" /> : <X size={14} color="#9ca3af" />}</span> A minimum of 8 characters</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: hasUpper ? '#fff' : '#A8A8A8' }}><span style={{ width: 18 }}>{hasUpper ? <Check size={14} color="#22c55e" /> : <X size={14} color="#9ca3af" />}</span> Atleast one uppercase</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: hasLower ? '#fff' : '#A8A8A8' }}><span style={{ width: 18 }}>{hasLower ? <Check size={14} color="#22c55e" /> : <X size={14} color="#9ca3af" />}</span> Atleast one lowercase</div>
                                    </div>
                                </div>
                                <div style={{ color: '#BABABA', fontSize: 13 }}>
                                    <div style={{ height: 24 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: hasNumber ? '#fff' : '#A8A8A8' }}><span style={{ width: 18 }}>{hasNumber ? <Check size={14} color="#22c55e" /> : <X size={14} color="#9ca3af" />}</span> Atleast one number</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: hasSpecial ? '#fff' : '#A8A8A8' }}><span style={{ width: 18 }}>{hasSpecial ? <Check size={14} color="#22c55e" /> : <X size={14} color="#9ca3af" />}</span> Atleast one special character eg. !@#$%^*_</div>
                                    </div>
                                </div>
                            </div>

                            <label style={{ fontSize: 14, color: '#FFFFFF', marginTop: 12 }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)} placeholder="" style={{ padding: '24px 46px 24px 17px', border: '1px solid #404040', borderRadius: 6, background: 'transparent', color: '#fff', fontSize: 15 }} className="bg-input/10 text-white" />
                                <button onClick={() => setShowConfirm(s => !s)} aria-label={showConfirm ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 15, top: 0, bottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#8b8b8b', cursor: 'pointer', padding: '0 6px' }}>
                                    {showConfirm ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <button
                                    disabled={!allRulesSatisfied || !currentPassword}
                                    onClick={() => setConfirmSaveOpen(true)}
                                    className={
                                        allRulesSatisfied && currentPassword
                                            ? "w-full py-3 px-4 rounded-[6px] bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] transition-colors duration-150 hover:from-[#2563eb] hover:to-[#60a5fa] text-white font-semibold border border-[#2b2b2b]"
                                            : "w-full py-3 px-4 rounded-[6px] bg-[#414141] text-[#9ca3af] font-semibold border border-[#2b2b2b] cursor-not-allowed"
                                    }
                                    style={{ width: '100%' }}
                                >
                                    Update Password
                                </button>
                                {/* Confirm dialog for password change */}
                                <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Change Password?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to change your password?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel
                                                onClick={() => setConfirmSaveOpen(false)}
                                                className="px-4 py-2 mt-3 bg-[#1b1b1b] text-white border border-[#3E3E3E] cursor-pointer transition duration-175 hover:bg-[#222222]"
                                                style={{ borderRadius: 8, fontSize: 15 }}
                                            >
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleChangePassword}
                                                className="px-4 py-2 mt-3 bg-[#fff] text-black hover:bg-[#e2e2e2] rounded cursor-pointer transition duration-175"
                                                style={{ borderRadius: 8, fontSize: 15 }}
                                            >
                                                Confirm
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}