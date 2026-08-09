export const getBaseURL = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
}

/**
 * Whether search engines are allowed to index this deployment.
 *
 * Fails safe: unset or any value other than the literal string "true"
 * means "do not index". Only the production Vercel environment should
 * set NEXT_PUBLIC_ALLOW_INDEXING=true — staging, previews, and local all
 * stay noindexed by default with no extra configuration required.
 */
export const isIndexingAllowed = () => {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"
}
