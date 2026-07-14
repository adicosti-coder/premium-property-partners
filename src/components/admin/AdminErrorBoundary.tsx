import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Reset key — when this changes (e.g. active tab), the boundary resets. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches runtime errors from a lazy-loaded admin tab so a single manager
 * cannot crash the whole /admin surface. Global App-level ErrorBoundary would
 * kick the user out entirely; this one keeps sidebar + shell intact.
 */
export default class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep local — global reporter picks up unhandled rejections separately.
    console.error("[AdminErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              Această secțiune nu a putut fi încărcată
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A apărut o eroare când am afișat acest tab. Restul panoului admin continuă să funcționeze.
            </p>
            {this.state.error?.message && (
              <pre className="mt-3 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[11px] text-muted-foreground border border-border">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={this.handleRetry}>
            <RotateCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Reîncearcă
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Reîncarcă pagina
          </Button>
        </div>
      </div>
    );
  }
}
