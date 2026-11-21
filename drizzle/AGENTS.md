# Database migration rules
- Admin market/rejection report RPCs are same-named plpgsql wrappers that require admin/super_admin or service_role and call service-only `*_unguarded` bodies; inner report helpers have no direct user EXECUTE — security-definer reports otherwise leak scraped listing data to any signed-up account.
