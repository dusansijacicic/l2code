-- Ako si već pokrenuo staru šemu bez PayPal kolona:
alter table public.enrollments
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;
