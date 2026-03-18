import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isRecoverableChunkError,
  normalizeRuntimeErrorMessage,
  reloadForRuntimeRecovery,
} from "@/lib/runtimeRecovery";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: normalizeRuntimeErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isRecoverableChunkError(error) && reloadForRuntimeRecovery()) {
      return;
    }

    console.error("AppErrorBoundary caught error:", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  private handleWindowError = (event: ErrorEvent) => {
    const runtimeError = event.error ?? event.message;
    const message = normalizeRuntimeErrorMessage(runtimeError || "Unknown runtime error");

    if (isRecoverableChunkError(runtimeError) && reloadForRuntimeRecovery()) {
      return;
    }

    if (!this.state.hasError) {
      this.setState({ hasError: true, errorMessage: message });
    }
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const message = normalizeRuntimeErrorMessage(event.reason);

    if (isRecoverableChunkError(event.reason) && reloadForRuntimeRecovery()) {
      return;
    }

    if (!this.state.hasError) {
      this.setState({ hasError: true, errorMessage: message });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <AlertTriangle className="h-5 w-5 text-foreground" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Une erreur est survenue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              L’application a rencontré une erreur inattendue. Recharge la page pour reprendre.
            </p>
            {this.state.errorMessage && (
              <p className="mt-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-left text-xs text-muted-foreground">
                {this.state.errorMessage}
              </p>
            )}
            <Button onClick={this.handleReload} className="mt-4 w-full">
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Recharger l’application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
