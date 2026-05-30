/**
 * getAvatarUrl — Universal profilePic normalizer
 *
 * The backend toJSON transform returns profilePic as { url: string }.
 * Old cached data in localStorage may still be a plain string.
 * This utility safely extracts the URL from either format.
 *
 * @param {string|{url:string}|null|undefined} pic - The profilePic value
 * @returns {string|null} - A plain URL string, or null if not available
 */
export const getAvatarUrl = (pic) => {
  if (!pic) return null;
  if (typeof pic === "string") return pic || null;
  if (typeof pic === "object" && pic.url) return pic.url || null;
  return null;
};
