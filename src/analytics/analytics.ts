export enum NOTIFICATIONS_EVENT_NAMES {
  DRAFTED_PROJECT_ACTIVATED = 'Draft published',
  PROJECT_LISTED = 'Project listed',
  PROJECT_UNLISTED = 'Project unlisted',
  PROJECT_UNLISTED_DONORS = 'Project unlisted - Donors',
  PROJECT_UNLISTED_USERS_WHO_LIKED = 'Project unlisted - Users Who Liked',
  PROJECT_EDITED = 'Project edited',
  PROJECT_BADGE_REVOKED = 'Project badge revoked',
  PROJECT_BADGE_REVOKE_REMINDER = 'Project badge revoke reminder',
  PROJECT_BADGE_REVOKE_WARNING = 'Project badge revoke warning',
  PROJECT_BADGE_REVOKE_LAST_WARNING = 'Project badge revoke last warning',
  PROJECT_BADGE_UP_FOR_REVOKING = 'Project badge up for revoking',
  PROJECT_VERIFIED = 'Project verified',
  PROJECT_VERIFIED_DONORS = 'Project verified - Donors',
  PROJECT_VERIFIED_USERS_WHO_LIKED = 'Project verified - Users Who Liked',

  // https://github.com/Giveth/impact-graph/issues/624#issuecomment-1240364389
  PROJECT_REJECTED = 'Project unverified',

  PROJECT_UNVERIFIED = 'Project unverified',
  PROJECT_UNVERIFIED_USERS_WHO_BOOSTED = 'Project unverified - Users Who Boosted',
  PROJECT_ACTIVATED = 'Project activated',
  PROJECT_ACTIVATED_DONORS = 'Project activated - Donors',
  PROJECT_ACTIVATED_USERS_WHO_LIKED = 'Project activated - Users Who Liked',
  PROJECT_DEACTIVATED = 'Project deactivated',
  PROJECT_DEACTIVATED_DONORS = 'Project deactivated - Donors',
  PROJECT_DEACTIVATED_USERS_WHO_LIKED = 'Project deactivated - Users Who Liked',

  PROJECT_CANCELLED = 'Project cancelled',
  PROJECT_CANCELLED_DONORS = 'Project cancelled - Donors',
  PROJECT_CANCELLED_USERS_WHO_LIKED = 'Project cancelled - Users Who Liked',
  MADE_DONATION = 'Made donation',
  DONATION_RECEIVED = 'Donation received',
  DONATION_GET_PRICE_FAILED = 'Donation get price failed',
  PROJECT_RECEIVED_HEART = 'project liked',
  PROJECT_UPDATED_DONOR = 'Project updated - donor',
  PROJECT_UPDATED_OWNER = 'Project updated - owner',
  PROJECT_UPDATED_USERS_WHO_LIKED = 'Project update - Users Who Liked',
  PROJECT_CREATED = 'The project saved as draft',
  UPDATED_PROFILE = 'Updated profile',
  GET_DONATION_PRICE_FAILED = 'Get Donation Price Failed',
  VERIFICATION_FORM_GOT_DRAFT_BY_ADMIN = 'Verification form got draft by admin',
}
