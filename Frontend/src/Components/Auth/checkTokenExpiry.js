export function isTokenExpired() {
  const tokenCreatedAt = localStorage.getItem("token_created_at");
  if (!tokenCreatedAt) return true;

  const now = Date.now();
  const diffInMinutes = (now - parseInt(tokenCreatedAt, 10)) / (1000 * 60);

  return diffInMinutes > 60; // Token expires in 60 minutes
}
