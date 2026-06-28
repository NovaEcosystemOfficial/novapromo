/**
 * Meta Instagram scopes (valid from 2025+).
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 */
export const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
];

export const INSTAGRAM_OAUTH_AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
export const INSTAGRAM_OAUTH_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
export const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com';

/** Official Business Login params (no auth_type / prompt on instagram.com/oauth/authorize). */
export const INSTAGRAM_OAUTH_DEFAULT_OPTIONS = {
  forceReauth: true,
  enableFbLogin: false,
};
