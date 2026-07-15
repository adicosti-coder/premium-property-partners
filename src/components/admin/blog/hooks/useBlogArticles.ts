import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { usePaginatedQuery, type PageSize } from "@/hooks/admin/usePaginatedQuery";
import type { BlogAiSnapshotLite } from "../BlogRollbackButton";

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  content: string;
  content_en: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  is_published: boolean;
  is_premium: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  translation_locked: boolean;
  scheduled_for?: string | null;
  faq_items?: unknown;
}

export type BlogStatusFilter = "all" | "published" | "draft" | "scheduled";

// NOTE: explicit column list — never "*". Kept as one string const so the
// select-string type parsing runs once (see query-builder-type-performance).
const BLOG_COLUMNS =
  "id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, created_at, updated_at, translation_locked, scheduled_for, faq_items";

export interface UseBlogArticlesOptions {
  page: number;
  pageSize: PageSize;
  search: string;
  status: BlogStatusFilter;
  category: string; // "all" or a specific DB category value
}

export function useBlogArticles(opts: UseBlogArticlesOptions) {
  const { page, pageSize, search, status, category } = opts;
  const trimmedSearch = search.trim();

  const applyFilters = useCallback(
    (q: any) => {
      if (status === "published") q = q.eq("is_published", true);
      else if (status === "draft")
        q = q.eq("is_published", false).is("scheduled_for", null);
      else if (status === "scheduled") q = q.not("scheduled_for", "is", null);

      if (category && category !== "all") q = q.eq("category", category);

      if (trimmedSearch) {
        const like = `%${trimmedSearch.replace(/[%_]/g, "\\$&")}%`;
        q = q.or(`title.ilike.${like},slug.ilike.${like}`);
      }
      return q;
    },
    [status, category, trimmedSearch],
  );

  const paged = usePaginatedQuery<BlogArticle>({
    queryKey: ["admin-blog-articles", status, category, trimmedSearch],
    table: "blog_articles",
    columns: BLOG_COLUMNS,
    page,
    pageSize,
    order: { column: "updated_at", ascending: false },
    applyFilters,
  });

  // Bulk-load latest active AI snapshot per article for the current page.
  const ids = useMemo(() => paged.rows.map((r) => r.id).sort(), [paged.rows]);
  const idsKey = ids.join(",");

  const snapshotsQuery = useQuery({
    queryKey: ["admin-blog-snapshots", idsKey],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_ai_snapshots" as never)
        .select("id, article_id, confidence_score, ai_model, rationale, created_at")
        .in("article_id", ids as never)
        .is("rolled_back_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, BlogAiSnapshotLite> = {};
      for (const s of ((data as unknown) as BlogAiSnapshotLite[] | null) ?? []) {
        if (!map[s.article_id]) map[s.article_id] = s;
      }
      return map;
    },
  });

  const refetchAll = useCallback(() => {
    paged.refetch();
    snapshotsQuery.refetch();
  }, [paged, snapshotsQuery]);

  return {
    articles: paged.rows,
    total: paged.total,
    page,
    pageSize,
    pageCount: paged.pageCount,
    isLoading: paged.isLoading,
    isFetching: paged.isFetching,
    error: paged.error,
    snapshotByArticle: snapshotsQuery.data ?? {},
    refetch: refetchAll,
  };
}

/** Distinct category list for the filter dropdown (small, cached). */
export function useBlogCategoryOptions() {
  return useQuery({
    queryKey: ["admin-blog-category-options"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("category")
        .not("category", "is", null)
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.category && set.add(r.category));
      return Array.from(set).sort();
    },
  });
}
