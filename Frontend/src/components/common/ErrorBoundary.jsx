import React from "react";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You could log this to an external service like Sentry here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
          <div className="max-w-md w-full glass-panel p-10 shadow-xl rounded-[2.5rem] border-white/60 bg-white/80">
            <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-6 shadow-soft">
              <FaExclamationTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              Something went wrong
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              The application encountered an unexpected error. Don&apos;t worry, your data is safe.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-2xl shadow-soft"
              >
                <FaRedo className="text-xs" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="w-full text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors py-2"
              >
                Return to Home
              </button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <div className="mt-8 pt-6 border-t border-slate-100 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Debug Info</p>
                <div className="bg-slate-900 text-pink-400 p-4 rounded-xl text-xs overflow-auto max-h-40 font-mono">
                  {this.state.error?.toString()}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
