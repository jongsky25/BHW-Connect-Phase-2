# Spot feedback

Spot feedback lets a signed-in user tap a location on the current page and send a comment. A screenshot is optional: capture starts only when the user requests it, and the image is previewed before submission. Page paths exclude query strings and element context excludes form values and arbitrary page text.

## DOH-wide rollout

1. Apply `20261008000000_spot_feedback.sql` in migration order.
2. Deploy the app. The migration enables `spot_feedback` for every active signed-in user regardless of organization or role. The super admin can pause collection using the **Available** switch in **Admin → Feature flags**.
3. Test submission from BHW, assessor, designer, and admin accounts in different organizations before notifying users.

User submissions are visible only to the submitter and admins whose organization contains the submitting organization. The admin inbox is at `/admin/feedback`; submitters see their history at `/feedback`. Replies are shown in both places. If in-app notifications are enabled, an admin reply also creates a personal notification.

Screenshots are stored in the private `spot-feedback` bucket. The uploader and authorized admins can request short-lived signed URLs. The monthly `spot-feedback-retention.yml` workflow removes feedback older than 24 months and drains the screenshot cleanup queue. Account deletion also queues any associated screenshots for this workflow. Its manual dispatch defaults to a dry run. Configure the Supabase URL and service-role key for the workflow and run a dry run after deployment.
