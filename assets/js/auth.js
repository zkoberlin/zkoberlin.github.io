(() => {
  const CLIENT_ID = "272507955688-7s4g9anuhiimmooisg0iqlk940r2a0jt.apps.googleusercontent.com";
  const AUTH_ENDPOINT = "https://kalender-proxy.paul-bendzko.workers.dev/auth/me";
  const BASE_SCOPES = "openid email";
  const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

  let accessToken = "";
  let expiresAt = 0;
  let profile = null;
  let calendarAccess = false;

  function isSignedIn() {
    return Boolean(accessToken) && Date.now() < expiresAt;
  }

  function render() {
    document.querySelectorAll("[data-auth-button]").forEach((button) => {
      button.textContent = isSignedIn() ? "✓ Angemeldet" : "Mit Google anmelden";
      button.classList.toggle("is-authenticated", isSignedIn());
      button.title = profile?.email || "Private Daten freischalten";
    });
  }

  async function waitForGoogle() {
    const deadline = Date.now() + 10_000;
    while (!window.google?.accounts?.oauth2) {
      if (Date.now() > deadline) throw new Error("Google-Anmeldung konnte nicht geladen werden");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async function verify(token) {
    const response = await fetch(AUTH_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Dieses Google-Konto ist nicht freigegeben");
    return response.json();
  }

  async function signIn({ calendar = false } = {}) {
    if (isSignedIn() && (!calendar || calendarAccess)) {
      return { accessToken, expiresAt, profile };
    }
    await waitForGoogle();

    const tokenResponse = await new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: calendar ? `${BASE_SCOPES} ${CALENDAR_SCOPE}` : BASE_SCOPES,
        hint: "paul.bendzko@gmail.com",
        callback: (response) => response.error ? reject(new Error(response.error)) : resolve(response),
        error_callback: () => reject(new Error("Google-Anmeldung wurde abgebrochen")),
      });
      client.requestAccessToken({ prompt: "consent" });
    });

    const verification = await verify(tokenResponse.access_token);
    accessToken = tokenResponse.access_token;
    expiresAt = Date.now() + Math.max(0, tokenResponse.expires_in - 60) * 1000;
    calendarAccess = String(tokenResponse.scope || "").includes(CALENDAR_SCOPE);
    profile = verification.user;
    render();
    window.dispatchEvent(new CustomEvent("hub-auth-change", { detail: { profile } }));
    return { accessToken, expiresAt, profile };
  }

  async function authorizedFetch(input, init = {}) {
    if (!isSignedIn()) throw new Error("Google-Anmeldung erforderlich");
    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
  }

  async function handleButton(button) {
    button.disabled = true;
    button.textContent = "Anmeldung…";
    try {
      await signIn({ calendar: button.dataset.authCalendar === "true" });
    } catch (error) {
      console.error("Authentication failed", error);
      button.textContent = "Anmeldung fehlgeschlagen";
      button.title = error.message;
      setTimeout(render, 2500);
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-button]");
    if (button) handleButton(button);
  });
  document.addEventListener("DOMContentLoaded", render);

  window.HubAuth = {
    signIn,
    authorizedFetch,
    isSignedIn,
    getAccessToken: () => isSignedIn() ? accessToken : "",
  };
})();
