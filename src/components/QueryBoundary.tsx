import { Component, ReactNode } from "react";
import { reportError } from "@/lib/errorReporting";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface QueryBoundaryProps {
  /** Logical scope reported to monitoring (e.g. "listings:imobiliare") */
  scope: string;
  /** Optional custom fallback. When omitted, a minimal recoverable card renders. */
  fallback?: (reset: () => void, error: Error) => ReactNode;
  children: ReactNode;
}

interface QueryBoundaryState {
  error: Error | null;
}

/**
 * Localized error boundary for data-fetching / filter zones.
 *
 * Differs from a global ErrorBoundary in two ways:
 *  - It fails *quietly* with an inline recoverable UI (no full-page crash)
 *  - It pipes structured payloads through `reportError` so Make.com can
 *    alert on listing/filter outages specifically.
 */
class QueryBoundary extends Component<QueryBoundaryProps, QueryBoundaryState> {
  state: QueryBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): QueryBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    reportError(error, {
      scope: this.props.scope,
      meta: { componentStack: info.componentStack },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div
        role="alert"
        className="my-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center"
      >
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" aria-hidden />
        <h3 className="text-base font-semibold text-foreground mb-1">
          Nu am putut încărca această secțiune
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Echipa a fost notificată. Reîncearcă în câteva momente.
        </p>
        <Button size="sm" variant="outline" onClick={this.reset}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Reîncarcă
        </Button>
      </div>
    );
  }
}

export default QueryBoundary;
