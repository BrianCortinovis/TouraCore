-- 00145: convert all auth.users FK in public schema from NO ACTION to ON DELETE SET NULL
-- Reason: deleting an auth user (es. cleanup QA, GDPR erasure) failed with FK violation
-- on audit/created_by columns. Audit must survive user deletion → SET NULL semantics.
-- Idempotent: drops + recreates each constraint.

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.billing_profiles DROP CONSTRAINT IF EXISTS billing_profiles_created_by_user_id_fkey;
ALTER TABLE public.billing_profiles ADD CONSTRAINT billing_profiles_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_created_by_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_tickets DROP CONSTRAINT IF EXISTS maintenance_tickets_reported_by_fkey;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_tickets DROP CONSTRAINT IF EXISTS maintenance_tickets_assigned_to_fkey;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.marketplace_installations DROP CONSTRAINT IF EXISTS marketplace_installations_installed_by_fkey;
ALTER TABLE public.marketplace_installations ADD CONSTRAINT marketplace_installations_installed_by_fkey FOREIGN KEY (installed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_created_by_fkey;
ALTER TABLE public.media ADD CONSTRAINT media_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.module_activation_log DROP CONSTRAINT IF EXISTS module_activation_log_actor_user_id_fkey;
ALTER TABLE public.module_activation_log ADD CONSTRAINT module_activation_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.module_overrides DROP CONSTRAINT IF EXISTS module_overrides_revoked_by_user_id_fkey;
ALTER TABLE public.module_overrides ADD CONSTRAINT module_overrides_revoked_by_user_id_fkey FOREIGN KEY (revoked_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.module_overrides DROP CONSTRAINT IF EXISTS module_overrides_granted_by_user_id_fkey;
ALTER TABLE public.module_overrides ADD CONSTRAINT module_overrides_granted_by_user_id_fkey FOREIGN KEY (granted_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_created_by_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.platform_admins DROP CONSTRAINT IF EXISTS platform_admins_granted_by_fkey;
ALTER TABLE public.platform_admins ADD CONSTRAINT platform_admins_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.public_booking_keys DROP CONSTRAINT IF EXISTS public_booking_keys_created_by_fkey;
ALTER TABLE public.public_booking_keys ADD CONSTRAINT public_booking_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.quick_replies DROP CONSTRAINT IF EXISTS quick_replies_created_by_fkey;
ALTER TABLE public.quick_replies ADD CONSTRAINT quick_replies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_last_modified_by_fkey;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_created_by_fkey;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_response_author_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_response_author_fkey FOREIGN KEY (response_author) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.room_blocks DROP CONSTRAINT IF EXISTS room_blocks_created_by_fkey;
ALTER TABLE public.room_blocks ADD CONSTRAINT room_blocks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.supply_movements DROP CONSTRAINT IF EXISTS supply_movements_user_id_fkey;
ALTER TABLE public.supply_movements ADD CONSTRAINT supply_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.thread_messages DROP CONSTRAINT IF EXISTS thread_messages_sender_user_id_fkey;
ALTER TABLE public.thread_messages ADD CONSTRAINT thread_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
