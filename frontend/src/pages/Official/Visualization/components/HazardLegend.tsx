export function HazardLegend() {
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 24,
                right: 90, // Position to the left of MapControls (which is at right: 21)
                zIndex: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.65)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(2,6,23,0.21)',
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
            }}
        >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                Hazard Level:
            </div>
            {/* Low */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                    style={{
                        width: 20,
                        height: 12,
                        backgroundColor: '#fbbf24',
                        borderRadius: 4,
                    }}
                />
                <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 500 }}>Low</span>
            </div>

            {/* Medium */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                    style={{
                        width: 20,
                        height: 12,
                        backgroundColor: '#fb923c',
                        borderRadius: 4,
                    }}
                />
                <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 500 }}>Medium</span>
            </div>

            {/* High */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                    style={{
                        width: 20,
                        height: 12,
                        backgroundColor: '#f43f5e',
                        borderRadius: 4,
                    }}
                />
                <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 500 }}>High</span>
            </div>
        </div>
    );
}
