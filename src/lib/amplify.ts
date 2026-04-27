import { Amplify } from "aws-amplify";

const region = import.meta.env.VITE_COGNITO_REGION as string;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID as string;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN as string;

// Compute redirect URLs from the current origin so prod, dev, and Lovable
// preview environments all work without code changes. The Cognito App
// Client must list each origin's /callback and / URLs as allowed callback
// and sign-out URLs.
const origin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        oauth: {
          domain: cognitoDomain,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [`${origin}/callback`],
          redirectSignOut: [`${origin}/`],
          responseType: "code",
        },
      },
    },
  },
});

export const cognitoConfig = {
  region,
  userPoolId,
  userPoolClientId,
  cognitoDomain,
};
