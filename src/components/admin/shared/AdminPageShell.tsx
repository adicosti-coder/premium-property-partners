import type { ComponentType, ReactNode } from "react";

interface Props {
  /** Optional lucide icon component (rendered inside a soft primary bg). */
  icon?: ComponentType<{ className?: string }>;
  /** Optional main title. If omitted, header row is hidden entirely. */
  title?: ReactNode;
  /** Optional subtitle / description. */
  description?: ReactNode;
  /** Right-aligned action buttons in the header row. */
  actions?: ReactNode;
  /** Optional KPI / stats block — rendered as-is (usually a grid). */
  stats?: ReactNode;
  /** Optional filter bar — rendered as-is. */
  filters?: ReactNode;
  /** Main body (table + pagination, or whatever). */
  children: ReactNode;
  /** Optional wrapper className override. */
  className?: string;
}

/**
 * Thin shared shell for admin panels.
 *
 * Intentionally minimal: every slot is optional and rendered `as-is` so callers
 * keep full control of their own KPI / filter markup. This is NOT an
 * abstraction over table state — see individual `use*` hooks + `AdminPagination`
 * for that.
 *
 * Adopted only where the layout maps cleanly (header + optional stats + optional
 * filters + body). Panels with 2-column grids, sidebar dashboards, dialogs, or
 * bespoke KPI bars keep their own layout.
 */
export function AdminPageShell({
  icon: Icon,
  title,
  description,
  actions,
  stats,
  filters,
  children,
  className,
}: Props) {
  const showHeader = Boolean(title || actions || description);

  return (
    <div className={className ?? "space-y-6"}>
      {showHeader && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-xl font-semibold text-foreground truncate">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}

      {stats && <div>{stats}</div>}
      {filters && <div>{filters}</div>}

      <div>{children}</div>
    </div>
  );
}

export default AdminPageShell;
