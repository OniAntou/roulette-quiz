import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-16 h-16 mx-auto border-2 border-red-theme rounded-full flex items-center justify-center">
              <span className="text-red-theme text-2xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-bold text-text-theme tracking-wider uppercase font-mono">
              SYSTEM ERROR
            </h2>
            <p className="text-sm text-text-theme-muted font-mono">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-theme-bg border border-red-theme-border text-red-theme text-xs font-bold tracking-widest uppercase rounded-lg hover:bg-red-theme-bg-hover transition-all cursor-pointer"
            >
              RELOAD SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
