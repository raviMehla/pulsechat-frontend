import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-textPrimary p-6">
          <div className="text-6xl mb-4" role="img" aria-label="Warning">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-textMuted mb-6 text-center max-w-md">
            The app encountered an unexpected error. Please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accentHover transition-colors shadow-[0_8px_32px_rgba(124,110,247,0.3)] hover:scale-105 transition-transform"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
