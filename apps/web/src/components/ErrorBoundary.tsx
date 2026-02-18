import React, { Component, ErrorInfo, ReactNode } from "react";
import { logClientError } from "../lib/adminApi";
import { captureFrontendException } from "../lib/observability";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    captureFrontendException(error, {
      component: "react_error_boundary",
      extra: {
        componentStack: errorInfo.componentStack || undefined,
      },
    });

    // Log to server
    logClientError({
      errorType: "react_error_boundary",
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h1>Что-то пошло не так</h1>
            <p>
              Произошла непредвиденная ошибка. Мы уже работаем над её
              исправлением.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Подробности ошибки</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
                {this.state.errorInfo?.componentStack && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}

            <div className="error-boundary-actions">
              <button onClick={this.handleReload} className="btn">
                Перезагрузить страницу
              </button>
              <button onClick={this.handleGoHome} className="btn secondary">
                На главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
