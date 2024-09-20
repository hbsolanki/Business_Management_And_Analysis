function getCSRFToken() {
  let cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    let cookiePair = cookie.trim().split("=");
    if (cookiePair[0] === "csrftoken") {
      return cookiePair[1];
    }
  }
  return null;
}

// Example of sending a POST request with the CSRF token
const csrfToken = getCSRFToken();

export default csrfToken;
