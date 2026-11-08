// Cloudflare Pages compatibility route for existing Studio RC API URLs.
// Uses the same Supabase backend as the prior Netlify deployment.
import handler from '../../../netlify/functions/api.mjs';
export async function onRequest(context) {
  return handler(context.request, context.env);
}
