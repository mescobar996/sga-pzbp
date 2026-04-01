import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'Unknown error';
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch (e) {
        // Not a JSON string, keep original message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] p-4">
          <div className="bg-white p-8 border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_#1a1a1a] max-w-2xl w-full">
            <h1 className="text-3xl font-black uppercase mb-4 font-['Space_Grotesk'] text-[#e63b2e]">
              Algo salió mal
            </h1>
            <p className="text-[#1a1a1a] mb-4 font-['Inter']">
              Se ha producido un error inesperado. Por favor, intenta recargar la página o contacta al soporte si el problema persiste.
            </p>
            <div className="bg-gray-100 p-4 border-2 border-[#1a1a1a] overflow-auto max-h-64">
              <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap">
                {errorMessage}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-[#1a1a1a] text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-[#333] transition-colors border-2 border-transparent hover:border-[#1a1a1a] active:translate-y-1 active:shadow-none"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
