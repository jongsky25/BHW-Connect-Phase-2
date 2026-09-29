# Spot feedback pilot

Spot feedback lets a signed-in user tap a location on the current page and send a comment. A screenshot is optional: capture starts only when the user requests it, and the image is previewed before submission. Page paths exclude query strings and element context excludes form values and arbitrary page text.

## Rollout

1. Apply `20261008000000_spot_feedback.sql` in migration order.
2. In **Admin → Feature flags**, the super admin selects the pilot organization and saves it. Descendant organizations are included. Leaving the pilot area unset blocks field submissions.
3. Turn on `spot_feedback` using its **Available** switch. Role switches can narrow access further. Admins can use the capture flow for testing while the flag is on; admin access to the inbox persists when it is off.
4. Test with accounts inside and outside the pilot area before notifying users.

User submissions are visible only to the submitter and admins whose organization contains the submitting organization. The admin inbox is at `/admin/feedback`; submitters see their history at `/feedback`. Replies are shown in both places. If in-app notifications are enabled, an admin reply also creates a personal notification.

Screenshots are stored in the private `spot-feedback` bucket. The uploader and authorized admins can request short-lived signed URLs. The monthly `spot-feedback-retention.yml` workflow removes feedback and screenshots older than 24 months; its manual dispatch defaults to a dry run. Before enabling the pilot, verify that the workflow has the pilot Supabase URL and service-role key, and run a dry run.
