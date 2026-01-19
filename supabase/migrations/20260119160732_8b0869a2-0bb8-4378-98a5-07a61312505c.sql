-- Create an admin-only function to detach ratings from guests (preserve historical ratings)
CREATE OR REPLACE FUNCTION public.admin_detach_activity_ratings_guest_ids()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow authenticated gestores
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT public.has_role(auth.uid(), 'gestor'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.activity_ratings
  SET guest_id = NULL
  WHERE guest_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_detach_activity_ratings_guest_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_detach_activity_ratings_guest_ids() TO authenticated;
