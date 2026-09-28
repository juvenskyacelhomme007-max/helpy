/* =========================================================
   HELPY — APP.JS
   Global API connector
   ========================================================= */


/* =========================================================
   API BASE URL
   ========================================================= */

const API_BASE_URL =
  window.location.hostname.includes("railway.app")
    ? window.location.origin
    : "";


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiFetch(
  endpoint,
  method = "GET",
  data = null
) {

  const headers = {
    "Content-Type": "application/json"
  };


  /* =======================================================
     UTILISATEUR CONNECTÉ
     ======================================================= */

  const userId =
    localStorage.getItem("helpy_user_id") ||
    localStorage.getItem("user_id") ||
    "";


  if (userId) {
    headers["x-user-id"] = userId;
  }


  const options = {
    method,
    headers
  };


  if (data !== null) {

    options.body =
      JSON.stringify(data);

  }


  try {

    const response =
      await fetch(
        `${API_BASE_URL}${endpoint}`,
        options
      );


    const contentType =
      response.headers.get("content-type") || "";


    let result;


    if (
      contentType.includes(
        "application/json"
      )
    ) {

      result =
        await response.json();

    } else {

      const text =
        await response.text();

      result = {
        message: text
      };

    }


    if (!response.ok) {

      return {
        error: true,
        status: response.status,
        message:
          result.message ||
          result.error ||
          "Une erreur est survenue."
      };

    }


    return result;


  } catch (error) {

    console.error(
      "HELPY API ERROR:",
      error
    );


    return {
      error: true,
      message:
        "Impossible de contacter HELPY. Vérifiez votre connexion Internet."
    };

  }

}


/* =========================================================
   USER STORAGE
   ========================================================= */

function saveUser(user) {

  if (!user) {
    return;
  }


  if (user.id !== undefined) {

    localStorage.setItem(
      "helpy_user_id",
      String(user.id)
    );

    /*
     * Compatibilité avec les anciennes pages.
     */
    localStorage.setItem(
      "user_id",
      String(user.id)
    );

  }


  localStorage.setItem(
    "helpy_user",
    JSON.stringify(user)
  );


  /*
   * Compatibilité avec l'ancien système.
   */
  localStorage.setItem(
    "user",
    JSON.stringify(user)
  );

}


/* =========================================================
   CURRENT USER
   ========================================================= */

function currentUser() {

  try {

    const primaryUser =
      localStorage.getItem(
        "helpy_user"
      );


    if (primaryUser) {

      return JSON.parse(
        primaryUser
      );

    }


    /*
     * Compatibilité avec l'ancien stockage.
     */

    const oldUser =
      localStorage.getItem(
        "user"
      );


    if (oldUser) {

      return JSON.parse(
        oldUser
      );

    }


    return null;


  } catch (error) {

    console.warn(
      "HELPY USER STORAGE ERROR:",
      error
    );

    return null;

  }

}


/* =========================================================
   USER ID
   ========================================================= */

function currentUserId() {

  return (
    localStorage.getItem(
      "helpy_user_id"
    ) ||

    localStorage.getItem(
      "user_id"
    ) ||

    null
  );

}


/* =========================================================
   IS LOGGED IN
   ========================================================= */

function isLoggedIn() {

  return Boolean(
    currentUserId()
  );

}


/* =========================================================
   CLEAR HELPY SESSION
   ========================================================= */

function clearHelpySession() {

  /*
   * Toutes les clés utilisées par HELPY
   * pour conserver la session utilisateur.
   */

  const keysToRemove = [

    "helpy_user_id",
    "helpy_user",

    "user_id",
    "user",

    "helpy_token",
    "token",

    "helpy_access_token",
    "access_token",

    "helpy_refresh_token",
    "refresh_token",

    "helpy_session",
    "session",

    "helpy_auth",
    "auth",

    "helpy_current_user",
    "current_user",

    "helpy_profile_photo_preview"

  ];


  keysToRemove.forEach(
    function(key) {

      try {

        localStorage.removeItem(
          key
        );

      } catch (error) {

        console.warn(
          "HELPY STORAGE REMOVE:",
          key,
          error
        );

      }

    }
  );


  /*
   * Nettoyage de sessionStorage.
   */

  const sessionKeys = [

    "helpy_user_id",
    "helpy_user",

    "user_id",
    "user",

    "helpy_token",
    "token",

    "helpy_access_token",
    "access_token",

    "helpy_refresh_token",
    "refresh_token",

    "helpy_session",
    "session",

    "helpy_auth",
    "auth",

    "helpy_current_user",
    "current_user"

  ];


  sessionKeys.forEach(
    function(key) {

      try {

        sessionStorage.removeItem(
          key
        );

      } catch (error) {

        console.warn(
          "HELPY SESSION REMOVE:",
          key,
          error
        );

      }

    }
  );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutUser() {

  try {

    /*
     * Supprimer toute la session HELPY.
     */

    clearHelpySession();


    /*
     * Informer les autres onglets/pages.
     */

    try {

      window.dispatchEvent(
        new CustomEvent(
          "helpy:logout"
        )
      );

    } catch (eventError) {

      console.warn(
        "HELPY logout event error:",
        eventError
      );

    }


  } catch (error) {

    console.error(
      "HELPY LOGOUT ERROR:",
      error
    );

  }


  /*
   * Redirection forcée vers LOGIN.
   *
   * replace() évite que le bouton
   * précédent du navigateur ramène
   * facilement vers le profil.
   */

  window.location.replace(
    "login.html"
  );

}


/* =========================================================
   REQUIRE LOGIN
   ========================================================= */

function requireLogin(
  redirect = "login.html"
) {

  if (!isLoggedIn()) {

    window.location.replace(
      redirect
    );

    return false;

  }


  return true;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   FORMAT PRICE
   ========================================================= */

function formatPrice(
  price,
  currency = ""
) {

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {

    return "Prix sur demande";

  }


  const number =
    Number(price);


  if (
    Number.isNaN(number)
  ) {

    return `${escapeHTML(price)} ${escapeHTML(currency)}`.trim();

  }


  try {

    const formatted =
      new Intl.NumberFormat(
        undefined,
        {
          maximumFractionDigits: 2
        }
      ).format(number);


    return `${formatted} ${currency || ""}`.trim();


  } catch {

    return `${number} ${currency || ""}`.trim();

  }

}


/* =========================================================
   IMAGE HELPER
   ========================================================= */

function getItemImage(item) {

  if (!item) {
    return "";
  }


  if (
    item.image &&
    typeof item.image === "string"
  ) {

    return item.image;

  }


  if (
    item.image_url &&
    typeof item.image_url === "string"
  ) {

    return item.image_url;

  }


  if (
    item.images &&
    Array.isArray(item.images) &&
    item.images.length
  ) {

    const first =
      item.images[0];


    if (
      typeof first === "string"
    ) {

      return first;

    }


    if (
      first &&
      first.url
    ) {

      return first.url;

    }

  }


  return "";

}


/* =========================================================
   IMAGE HTML
   ========================================================= */

function itemImageHTML(
  item,
  fallback = "🛍️"
) {

  const image =
    getItemImage(item);


  if (!image) {

    return `
      <div class="product-image">
        <span>${fallback}</span>
      </div>
    `;

  }


  return `
    <div class="product-image">
      <img
        src="${escapeHTML(image)}"
        alt="${escapeHTML(
          item.title ||
          item.name ||
          "HELPY"
        )}"
        loading="lazy"
        onerror="this.style.display='none';"
      >
    </div>
  `;

}


/* =========================================================
   API HEALTH
   ========================================================= */

async function checkHelpyAPI() {

  const result =
    await apiFetch(
      "/api/health"
    );


  if (result.error) {

    console.warn(
      "HELPY API unavailable:",
      result.message
    );


    return false;

  }


  return true;

}


/* =========================================================
   UPDATE AUTH UI
   ========================================================= */

function updateAuthUI() {

  const user =
    currentUser();


  const loginLinks =
    document.querySelectorAll(
      '[href="login.html"]'
    );


  if (!user) {
    return;
  }


  loginLinks.forEach(
    function(link) {

      if (
        link.closest(
          ".bottom-nav"
        )
      ) {

        return;

      }


      link.textContent =
        "Mon compte";


      link.href =
        "profile.html";

    }
  );

}


/* =========================================================
   LOGOUT BUTTONS
   ========================================================= */

function setupLogoutButtons() {

  const buttons =
    document.querySelectorAll(
      "[data-helpy-logout]"
    );


  buttons.forEach(
    function(button) {

      /*
       * Evite de brancher le même bouton
       * plusieurs fois.
       */

      if (
        button.dataset.helpyLogoutReady === "true"
      ) {

        return;

      }


      button.dataset.helpyLogoutReady =
        "true";


      button.addEventListener(
        "click",
        function(event) {

          event.preventDefault();
          event.stopPropagation();

          logoutUser();

        }
      );

    }
  );

}


/* =========================================================
   SEARCH HELP
   ========================================================= */

function setupSearchForms() {

  const forms =
    document.querySelectorAll(
      ".search-box"
    );


  forms.forEach(
    function(form) {

      form.addEventListener(
        "submit",
        function(event) {

          const input =
            form.querySelector(
              "input[name='q']"
            );


          if (!input) {
            return;
          }


          const query =
            input.value.trim();


          if (!query) {

            event.preventDefault();

            input.focus();

          }

        }
      );

    }
  );

}


/* =========================================================
   PROTECT PAGES
   ========================================================= */

function setupProtectedPages() {

  const page =
    window.location.pathname
      .split("/")
      .pop();


  const protectedPages = [

    "publish.html",
    "add-product.html",
    "add-service.html",
    "add-business.html",
    "profile.html",
    "messages.html"

  ];


  if (
    protectedPages.includes(page)
  ) {

    requireLogin();

  }

}


/* =========================================================
   GLOBAL INIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function() {

    updateAuthUI();

    setupLogoutButtons();

    setupSearchForms();

    setupProtectedPages();

    await checkHelpyAPI();

  }
);


/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.HELPY = {

  API_BASE_URL,

  apiFetch,

  saveUser,

  currentUser,

  currentUserId,

  isLoggedIn,

  clearHelpySession,

  logoutUser,

  requireLogin,

  escapeHTML,

  formatPrice,

  getItemImage,

  itemImageHTML,

  checkHelpyAPI

};