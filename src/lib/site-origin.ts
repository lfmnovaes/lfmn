export function getSiteOrigin(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const configured =
    env.NEXT_PUBLIC_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  if (!configured) return undefined;
  const url = new URL(configured);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'The site URL must be an HTTP(S) origin without credentials, a path, or a query.',
    );
  }
  return url.origin;
}
