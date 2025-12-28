import React from 'react';

function TestSimple() {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '48px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1>✅ React is Working!</h1>
                <p style={{ fontSize: '24px', marginTop: '20px' }}>
                    If you see this, the basic React setup is fine.
                </p>
                <p style={{ fontSize: '18px', marginTop: '20px', opacity: 0.8 }}>
                    The issue is likely with Three.js or the Avatar component.
                </p>
            </div>
        </div>
    );
}

export default TestSimple;
