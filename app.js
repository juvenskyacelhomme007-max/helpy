/* ==================================================
   HELPY - APP & API CONNECTOR
   ================================================== */

const API_BASE_URL = "https://helpy-production-c2f2.up.railway.app";

// Helper pour effectuer des appels API
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
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors de la requête vers ${endpoint}:`, error);
    return null;
  }
}

// Vérifier l'état de l'API
async function checkApiHealth() {
  const health = await apiFetch("/api/health");
  console.log("Statut Backend Railway:", health);
}

document.addEventListener("DOMContentLoaded", () => {
  checkApiHealth();
});
