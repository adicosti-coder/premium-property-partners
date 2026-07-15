import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Eye,
  EyeOff,
  Globe,
  Languages,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { BlogRollbackButton, type BlogAiSnapshotLite } from "../BlogRollbackButton";
import type { BlogArticle } from "../hooks/useBlogArticles";

export type TranslationStatus = "translated" | "manual" | "missing" | "failed";

export const getTranslationStatus = (
  a: BlogArticle,
  failures: Record<string, string>,
): TranslationStatus => {
  if (failures[a.id]) return "failed";
  if (a.translation_locked) return "manual";
  if (a.title_en && a.excerpt_en && a.content_en) return "translated";
  return "missing";
};

interface RowLabels {
  premiumLabel: string;
  publicLabel: string;
  publishedLabel: string;
  draft: string;
  badgeTranslated: string;
  badgeManual: string;
  badgeMissing: string;
  badgeFailed: string;
  retry: string;
}

interface Props {
  article: BlogArticle;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  snapshot: BlogAiSnapshotLite | null;
  translationFailure?: string;
  isRetrying: boolean;
  onRetryTranslation: (id: string) => void;
  onEdit: (a: BlogArticle) => void;
  onDelete: (a: BlogArticle) => void;
  onRolledBack: () => void;
  language: "ro" | "en";
  labels: RowLabels;
}

export const BlogArticleRow = ({
  article,
  selected,
  onToggleSelect,
  snapshot,
  translationFailure,
  isRetrying,
  onRetryTranslation,
  onEdit,
  onDelete,
  onRolledBack,
  language,
  labels: t,
}: Props) => {
  const dateLocale = language === "ro" ? ro : enUS;
  const status = getTranslationStatus(article, translationFailure ? { [article.id]: translationFailure } : {});

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(article.id)}
          aria-label={`Selectează ${article.title}`}
        />
      </TableCell>
      <TableCell className="font-medium max-w-[250px] truncate">{article.title}</TableCell>
      <TableCell>
        <Badge variant="secondary">{article.category}</Badge>
      </TableCell>
      <TableCell>
        {article.is_premium ? (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            {t.premiumLabel}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-green-500 border-green-500/30">
            {t.publicLabel}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          {status === "translated" && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <Globe className="w-3 h-3 mr-1" />
              {t.badgeTranslated}
            </Badge>
          )}
          {status === "manual" && (
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              {t.badgeManual}
            </Badge>
          )}
          {status === "missing" && (
            <Badge variant="outline" className="text-muted-foreground">
              <Languages className="w-3 h-3 mr-1" />
              {t.badgeMissing}
            </Badge>
          )}
          {status === "failed" && (
            <>
              <Badge
                variant="outline"
                className="text-destructive border-destructive/40"
                title={translationFailure}
              >
                <Languages className="w-3 h-3 mr-1" />
                {t.badgeFailed}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                disabled={isRetrying || article.translation_locked}
                onClick={() => onRetryTranslation(article.id)}
              >
                {isRetrying ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                {t.retry}
              </Button>
            </>
          )}
        </div>
      </TableCell>
      <TableCell>
        {article.is_published ? (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <Eye className="w-3 h-3 mr-1" />
            {t.publishedLabel}
          </Badge>
        ) : (
          <Badge variant="outline">
            <EyeOff className="w-3 h-3 mr-1" />
            {t.draft}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(article.updated_at), "d MMM yyyy", { locale: dateLocale })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          <BlogRollbackButton snapshot={snapshot} onRolledBack={onRolledBack} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(article)}
            aria-label={`Editează articolul ${article.title}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(article)}
            aria-label={`Șterge articolul ${article.title}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default BlogArticleRow;
