/* ==================================================
   HELPY - KONEKTÈ API AMELYORE AK OAUTH
   ================================================== */

// Deteksyon otomatik domèn backend lan
const API_BASE_URL = window.location.hostname.includes("railway.app") 
  ? window.location.origin 
  : "https://helpy-production-c2f2.up.railway.app";

// Helper pou tout apèl API yo
async function apiFetch(endpoint, method = "GET", data = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  const userId = localStorage.getItem("helpy_user_id");
  if (userId) {
    headers["x-user-id"] = userId;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return { 
        error: true, 
        status: response.status, 
        message: result?.message || result?.error || `Erè nan sèvè a (${response.status})` 
      };
    }
    return result;
  } catch (error) {
    console.error(`Erè rezo lè n ap rele ${endpoint}:`, error);
    return { error: true, message: "Li enposib pou nou kontakte sèvè a." };
  }
}

// Fonksyon pou redirection sou Google oswa Facebook OAuth
function loginWithProvider(provider) {
  window.location.href = `${API_BASE_URL}/api/auth/${provider}`;
}

// Rekipere token an si itilizatè a ap tounen soti nan Google/Facebook
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id") || urlParams.get("token");

  if (userId) {
    localStorage.setItem("helpy_user_id", userId);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = "profile.html";
  }
});
