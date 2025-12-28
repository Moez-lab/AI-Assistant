import React, { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    background: 'rgba(255, 0, 0, 0.8)',
                    padding: '20px',
                    borderRadius: '10px',
                    maxWidth: '500px',
                    zIndex: 1000
                }}>
                    <h2>⚠️ Error Loading Avatar</h2>
                    <p>{this.state.error?.message || 'Unknown error'}</p>
                    <button onClick={() => window.location.reload()} style={{
                        padding: '10px 20px',
                        marginTop: '10px',
                        cursor: 'pointer'
                    }}>
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
