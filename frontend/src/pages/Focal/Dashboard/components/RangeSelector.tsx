import { ChevronDown, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { RANGE_OPTIONS, type RangeValue } from '../utils/distanceUtils';

interface RangeSelectorProps {
    value: RangeValue;
    onChange: (value: RangeValue) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const selectedOption = RANGE_OPTIONS.find(opt => opt.value === value) || RANGE_OPTIONS[2];

    return (
        <div ref={containerRef} style={{ position: 'relative', zIndex: 10 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#252525';
                    e.currentTarget.style.borderColor = '#444';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#1a1a1a';
                    e.currentTarget.style.borderColor = '#333';
                }}
            >
                <MapPin size={18} style={{ color: '#888' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#888', lineHeight: 1 }}>Nearby Terminals</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1 }}>{selectedOption.label}</span>
                </div>
                <ChevronDown
                    size={16}
                    style={{
                        marginLeft: '4px',
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        minWidth: '220px',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        animation: 'slideDown 0.2s ease-out',
                    }}
                >
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={String(option.value)}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: value === option.value ? '#252525' : 'transparent',
                                border: 'none',
                                color: '#fff',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                borderBottom: '1px solid #222',
                            }}
                            onMouseEnter={(e) => {
                                if (value !== option.value) {
                                    e.currentTarget.style.background = '#2a2a2a';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== option.value) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{option.label}</span>
                                {value === option.value && (
                                    <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span>
                                )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#888' }}>{option.description}</span>
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
