-- Curăță notificările duplicate de latență (păstrează doar cea mai recentă necitită per user)
DELETE FROM public.user_notifications
WHERE title = '🚨 Latență Andrei depășită'
  AND is_read = false
  AND id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.user_notifications
    WHERE title = '🚨 Latență Andrei depășită' AND is_read = false
    ORDER BY user_id, created_at DESC
  );
