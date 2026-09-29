-- Only the table trigger should invoke this SECURITY DEFINER function.
revoke execute on function public.queue_spot_feedback_screenshot_cleanup()
  from public, anon, authenticated;
