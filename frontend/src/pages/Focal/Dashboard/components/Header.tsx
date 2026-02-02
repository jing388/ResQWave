import { Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from "@/components/ui/popover-focal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { API_BASE_URL } from '@/pages/Official/Reports/api/api';
import { BookOpen, LogOut, User } from "lucide-react";
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocalAuth } from '../../context/focalAuthContext';
import type { HeaderProps } from '../types/header';
import resqwave_logo from '/resqwave_logo.png';

export default function Header({ editBoundaryOpen = false, editAboutOpen = false, canSave = false, onSave, onExit, onAboutClick, onRequestDiscard, onTabChange, activeTab = 'community', onAccountSettingsClick, onActivityLogClick, accountSettingsOpen = false, onRequestCloseAccountSettings }: HeaderProps) {
    const navigate = useNavigate();
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const { logout, focalId } = useFocalAuth();
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");

    // Helper to log out and navigate before clearing tokens
    const handleLogout = () => {
        navigate('/');
        setTimeout(() => {
            logout();
        }, 100);
    };

    // Helper to fetch focal person data
    const fetchFocalData = useCallback(() => {
        if (!focalId) {
            setFirstName("");
            setLastName("");
            return;
        }
        fetch(`${API_BASE_URL}/focalperson/${focalId}`, {
            credentials: 'include',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token') || ''}`
            }
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('Failed to fetch focal data');
                const data = await res.json();
                setFirstName(data.firstName || "");
                setLastName(data.lastName || "");
            })
            .catch(() => {
                setFirstName("");
                setLastName("");
            });
    }, [focalId]);

    // Helper to fetch focal profile photo
    const fetchProfilePhoto = useCallback(() => {
        if (!focalId) {
            setProfileUrl(null);
            return;
        }
        fetch(`${API_BASE_URL}/focalperson/${focalId}/photo`, {
            credentials: 'include',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('focalToken') || localStorage.getItem('resqwave_token') || ''}`
            }
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('No photo');
                const blob = await res.blob();
                if (blob.size > 0) {
                    setProfileUrl(URL.createObjectURL(blob));
                } else {
                    setProfileUrl(null);
                }
            })
            .catch(() => {
                setProfileUrl(null);
            });
    }, [focalId]);

    // Fetch on mount and when focalId changes
    useEffect(() => {
        fetchFocalData();
        fetchProfilePhoto();
    }, [fetchFocalData, fetchProfilePhoto]);

    // Listen for custom event to refresh profile photo
    useEffect(() => {
        const handler = () => {
            fetchFocalData();
            fetchProfilePhoto();
        };
        window.addEventListener('focal-profile-photo-updated', handler);
        return () => window.removeEventListener('focal-profile-photo-updated', handler);
    }, [fetchFocalData, fetchProfilePhoto]);
    // When editing is active, render the editing header UI (previously inline in index.tsx)
    if (editBoundaryOpen) {
        return (
            <header
                style={{
                    width: "100%",
                    background: "#171717",
                    color: "#fff",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    padding: "0 3rem",
                    height: "80px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    position: "relative",
                    zIndex: 100,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
                    <img src={resqwave_logo} alt="ResQWave Logo" onClick={() => navigate('/')} style={{ height: 35, cursor: 'pointer' }} />
                    <span onClick={() => navigate('/')} style={{ fontWeight: 500, fontSize: "1.25rem", cursor: 'pointer' }}>ResQWave</span>
                    <span style={{ fontWeight: 300, fontSize: "1.13rem", color: "#BABABA", marginLeft: 12 }}>
                        Editing Community Boundary ...
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <button
                        disabled={!canSave}
                        onClick={onSave}
                        style={{
                            padding: "8px 18px",
                            borderRadius: 3,
                            background: canSave ? "#fff" : "#222",
                            color: canSave ? "#222" : "#aaa",
                            border: "none",
                            fontWeight: 600,
                            fontSize: "1rem",
                            marginRight: 8,
                            cursor: canSave ? "pointer" : "not-allowed",
                            boxShadow: canSave ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                        }}
                    >
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="9 12 12 15 16 10" />
                            </svg>
                            SAVE
                        </span>
                    </button>
                    <button
                        onClick={onExit}
                        style={{
                            padding: "8px 18px",
                            borderRadius: 3,
                            background: "transparent",
                            color: "#fff",
                            border: "1px solid #fff",
                            fontWeight: 600,
                            fontSize: "1rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        EXIT
                    </button>
                </div>
            </header>
        );
    }

    // Default header (non-editing)
    return (
        <header
            style={{
                width: "100%",
                background: "#171717",
                color: "#fff",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                padding: "0 3rem",
                height: "80px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                position: "relative",
                zIndex: 'var(--z-header)',
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <img src={resqwave_logo} alt="ResQWave Logo" onClick={() => navigate('/')} style={{ height: 32, cursor: 'pointer' }} />
                    <span onClick={() => navigate('/')} style={{ fontWeight: 500, fontSize: "1.25rem", cursor: 'pointer' }}>ResQWave</span>
                </div>
                <Tabs value={activeTab} defaultValue="community" onValueChange={(v) => {
                    // If user is editing, request discard confirmation instead of navigating directly
                    if ((editBoundaryOpen || editAboutOpen) && onRequestDiscard) {
                        onRequestDiscard();
                        return;
                    }
                    // If account settings modal is open, ask parent to confirm/cancel before changing tabs
                    if (accountSettingsOpen && onRequestCloseAccountSettings) {
                        onRequestCloseAccountSettings(() => {
                            onTabChange?.(v);
                            if (v === 'about') onAboutClick?.();
                        });
                        return;
                    }
                    onTabChange?.(v);
                    if (v === 'about') onAboutClick?.();
                }}>
                    <TabsList>
                        <TabsTrigger
                            value="community"
                            style={{
                                color: "#fff",
                                fontSize: "1rem",
                                padding: "0.5rem 1.5rem",
                                borderRadius: 4,
                                transition: "background 0.2s",
                                cursor: 'pointer'
                            }}
                            className="tab-trigger"
                            onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >Community Map</TabsTrigger>
                        <TabsTrigger
                            value="about"
                            style={{
                                color: "#fff",
                                fontSize: "1rem",
                                padding: "0.5rem 1.5rem",
                                borderRadius: 4,
                                transition: "background 0.2s",
                                cursor: 'pointer'
                            }}
                            className="tab-trigger"
                            onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >About Your Community</TabsTrigger>
                        <TabsTrigger
                            value="history"
                            style={{
                                color: "#fff",
                                fontSize: "1rem",
                                padding: "0.5rem 1.5rem",
                                borderRadius: 4,
                                transition: "background 0.2s",
                                cursor: 'pointer'
                            }}
                            className="tab-trigger"
                            onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >History</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        {profileUrl ? (
                            <img
                                src={profileUrl}
                                alt="Profile"
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    cursor: "pointer",
                                    boxShadow: popoverOpen ? "0 0 0 3px rgba(107, 114, 128, 0.4)" : "none",
                                    transition: "box-shadow 0.2s ease",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#4a4a4a",
                                    color: "#e0e0e0",
                                    fontSize: "1.25rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    boxShadow: popoverOpen ? "0 0 0 3px rgba(107, 114, 128, 0.4)" : "none",
                                    transition: "box-shadow 0.2s ease",
                                }}
                            >
                                {firstName && lastName
                                    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
                                    : "?"}
                            </div>
                        )}
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={13}>
                        <PopoverItem icon={<User size={16} />} onClick={() => { setPopoverOpen(false); onAccountSettingsClick?.(); }}>
                            Account Settings
                        </PopoverItem>
                        <PopoverItem
                            icon={<BookOpen size={16} />}
                            onClick={() => { setPopoverOpen(false); onActivityLogClick?.(); }}
                        >
                            Logs
                        </PopoverItem>
                        <PopoverSeparator />
                        <PopoverItem
                            destructive
                            icon={<LogOut size={16} />}
                            onClick={() => {
                                setPopoverOpen(false);
                                handleLogout();
                            }}
                        >
                            Logout
                        </PopoverItem>
                    </PopoverContent>
                </Popover>
                {/* Account modal is rendered by parent (Dashboard) to allow correct centering over map */}

            </div>
        </header>
    );
}
