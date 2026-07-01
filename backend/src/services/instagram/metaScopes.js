/**
 * Meta Instagram scopes (valid from 2025+).
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 */
export const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
];

/** Required for Instagram Business Login — no Facebook Page scopes. */
export const INSTAGRAM_REQUIRED_SCOPES = [...INSTAGRAM_OAUTH_SCOPES];

/**
 * Only used by legacy Facebook Login + Page discovery flows.
 * Instagram Business Login does not return a Facebook Page.
 */
export const FACEBOOK_PAGE_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'public_profile',
];

export const FACEBOOK_REQUIRED_SCOPES = [...FACEBOOK_PAGE_OAUTH_SCOPES];

/** Required on the Page access token for POST /{page-id}/photos (Graph API v21+). */
export const FACEBOOK_PUBLISH_REQUIRED_SCOPES = [
  'pages_read_engagement',
  'pages_manage_posts',
];

export function getMissingFacebookPublishScopes(grantedScopes) {
  const granted = new Set(grantedScopes.map((scope) => scope.toLowerCase()));
  return FACEBOOK_PUBLISH_REQUIRED_SCOPES.filter((scope) => !granted.has(scope.toLowerCase()));
}

export function normalizeGrantedScopes(permissions) {
  if (!permissions) return [];

  if (Array.isArray(permissions)) {
    return permissions
      .flatMap((entry) => {
        if (typeof entry === 'string') return [entry];
        if (entry?.permission) return [entry.permission];
        if (entry?.name) return [entry.name];
        return [];
      })
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  if (typeof permissions === 'string') {
    return permissions
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  return [];
}

export function getMissingInstagramScopes(grantedScopes) {
  const granted = new Set(grantedScopes.map((scope) => scope.toLowerCase()));
  return INSTAGRAM_REQUIRED_SCOPES.filter((scope) => !granted.has(scope.toLowerCase()));
}

export const INSTAGRAM_OAUTH_AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
export const INSTAGRAM_OAUTH_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
export const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com';

/** Official Business Login params (no auth_type / prompt on instagram.com/oauth/authorize). */
export const INSTAGRAM_OAUTH_DEFAULT_OPTIONS = {
  forceReauth: true,
  enableFbLogin: false,
};
