ALTER TABLE public.investor_alert_subscribers ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS investor_alert_subscribers_user_idx ON public.investor_alert_subscribers(user_id);
GRANT SELECT ON public.investor_alert_subscribers TO authenticated;
GRANT SELECT ON public.investor_alert_deliveries TO authenticated;
CREATE POLICY "Investors read own subscription" ON public.investor_alert_subscribers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Investors read own deliveries" ON public.investor_alert_deliveries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.investor_alert_subscribers s WHERE s.id = investor_alert_deliveries.subscriber_id AND s.user_id = auth.uid()));
CREATE POLICY "Investors read prospects in their alerts" ON public.prospect_listings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.investor_alert_deliveries d JOIN public.investor_alert_subscribers s ON s.id = d.subscriber_id WHERE d.prospect_listing_id = prospect_listings.id AND s.user_id = auth.uid()));