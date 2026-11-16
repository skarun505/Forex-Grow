import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center bg-[#121620] text-gray-100 rounded-2xl border border-rose-500/30 m-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {this.props.fallbackTitle || 'An error occurred in this view'}
          </h3>
          <p className="text-xs text-gray-400 max-w-md mb-4">
            {this.state.error?.message || 'Something went wrong while rendering this section.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Terminal</span>
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('forexgrow_auth_token');
                  localStorage.removeItem('forexgrow_tab_token');
                  localStorage.removeItem('quotex_admin_user');
                  localStorage.removeItem('quotex_manager_user');
                  localStorage.removeItem('quotex_trader_user');
                  localStorage.removeItem('quotex_current_user');
                  localStorage.removeItem('forexgrow_favorites');
                  localStorage.removeItem('quotex_favorites');
                  sessionStorage.clear();
                } catch {}
                window.location.reload();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20"
            >
              <span>Clear Session & Refresh</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
