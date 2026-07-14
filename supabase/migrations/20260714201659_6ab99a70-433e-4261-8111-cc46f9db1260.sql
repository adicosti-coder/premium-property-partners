-- Tighten newsletter self-unsubscribe: require the caller's email to be verified
-- (email_confirmed_at IS NOT NULL) so unverified/spoofed accounts cannot delete
-- other people's newsletter records by claiming a matching email.
DROP POLICY IF EXISTS "Users can unsubscribe themselves safely" ON public.newsletter_subscribers;

CREATE POLICY "Users can unsubscribe themselves safely"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (
  email = (
    SELECT u.email::text
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
  )
);