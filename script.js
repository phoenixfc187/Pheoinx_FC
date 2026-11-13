
(() => {
  "use strict";

  // New version: deliberately starts with an empty club.
  const STORAGE_KEY = "pheonix_fc_club_v7";
  const DEFAULT_PASSWORD = "pheonix2026";

  const $ = (id) => document.getElementById(id);

  function freshState() {
    return {
      players: [],
      manager: "",
      fixtures: [],
      password: DEFAULT_PASSWORD,
      stats: {
        played: 0,
        wins: 0
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return freshState();

      const saved = JSON.parse(raw);

      return {
        ...freshState(),
        ...saved,
        players: Array.isArray(saved.players) ? saved.players : [],
        fixtures: Array.isArray(saved.fixtures) ? saved.fixtures : [],
        manager: typeof saved.manager === "string" ? saved.manager : "",
        stats: {
          played: 0,
          wins: 0,
          ...(saved.stats || {})
        },
        password: typeof saved.password === "string"
          ? saved.password
          : DEFAULT_PASSWORD
      };
    } catch (error) {
      console.warn("Could not read saved club data.", error);
      return freshState();
    }
  }

  let state = loadState();
  let ownerUnlocked = false;

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function render() {
    $("statPlayers").textContent = state.players.length;

    $("statStaff").textContent =
      state.manager.trim() ? "1" : "0";

    $("statPlayed").textContent =
      Number(state.stats.played || 0);

    $("statWins").textContent =
      Number(state.stats.wins || 0);

    $("squadCount").textContent =
      `${state.players.length} PLAYER${state.players.length === 1 ? "" : "S"}`;

    $("fixtureCount").textContent =
      `${state.fixtures.length} FIXTURE${state.fixtures.length === 1 ? "" : "S"}`;

    // Public squad section
    const squad = $("squadGrid");

    if (!state.players.length) {
      squad.className = "empty-state";

      squad.innerHTML = `
        <div class="empty-icon">⚽</div>
        <h3>The squad is yet to be formed.</h3>
        <p>PHEONIX FC currently has no registered players.
        Check back as the team takes shape.</p>
      `;
    } else {
      squad.className = "player-grid";

      squad.innerHTML = state.players.map((player) => `
        <article class="player-card">
          <div class="number">#${escapeHTML(player.number)}</div>
          <h3>${escapeHTML(player.name)}</h3>
          <p>${escapeHTML(player.position)}</p>
        </article>
      `).join("");
    }

    // Public fixtures section
    const fixtures = $("fixtureList");

    if (!state.fixtures.length) {
      fixtures.className = "empty-state compact";

      fixtures.innerHTML = `
        <div class="empty-icon">📅</div>
        <h3>No fixtures announced</h3>
        <p>Our first match schedule will appear here.</p>
      `;
    } else {
      fixtures.className = "fixture-grid";

      fixtures.innerHTML = state.fixtures
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((fixture) => `
          <article class="fixture-card">
            <p>${escapeHTML(fixture.date)} · ${escapeHTML(fixture.venue)}</p>
            <h3>
              PHEONIX FC
              <span style="color:#e3343f">vs</span>
              ${escapeHTML(fixture.opponent)}
            </h3>
          </article>
        `).join("");
    }

    // Admin status
    $("adminPlayers").textContent = state.players.length;
    $("adminManager").textContent = state.manager || "None";
    $("adminStaff").textContent = state.manager ? "1" : "0";

    $("adminPlayerList").innerHTML = state.players.map((player) => `
      <div class="admin-list-item">
        <span>
          #${escapeHTML(player.number)} ·
          ${escapeHTML(player.name)}
          (${escapeHTML(player.position)})
        </span>

        <button
          class="small-remove"
          type="button"
          data-remove-player="${escapeHTML(player.id)}">
          Remove
        </button>
      </div>
    `).join("");
  }

  // Login
  function openLogin() {
    $("loginError").textContent = "";
    $("ownerPassword").value = "";
    $("loginModal").classList.remove("hidden");
    $("ownerPassword").focus();
  }

  $("ownerOpen").addEventListener("click", openLogin);

  $("loginClose").addEventListener("click", () => {
    $("loginModal").classList.add("hidden");
  });

  $("loginModal").addEventListener("click", (event) => {
    if (event.target === $("loginModal")) {
      $("loginModal").classList.add("hidden");
    }
  });

  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if ($("ownerPassword").value !== state.password) {
      $("loginError").textContent = "Incorrect password. Try again.";
      return;
    }

    ownerUnlocked = true;

    $("loginModal").classList.add("hidden");
    $("adminPanel").classList.remove("hidden");

    $("adminPanel").scrollIntoView({
      behavior: "smooth"
    });

    render();
  });

  $("logoutBtn").addEventListener("click", () => {
    ownerUnlocked = false;

    $("adminPanel").classList.add("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // Add player
  $("playerForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!ownerUnlocked) return;

    const name = $("playerName").value.trim();
    const number = Number($("playerNumber").value);
    const position = $("playerPosition").value;

    if (!name || !Number.isInteger(number) || number < 1 || number > 99) {
      return;
    }

    if (state.players.some((player) => player.number === number)) {
      alert("That squad number is already in use.");
      return;
    }

    state.players.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      number,
      position
    });

    $("playerForm").reset();
    save();
  });

  // Remove player
  $("adminPlayerList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-player]");

    if (!button || !ownerUnlocked) return;

    state.players = state.players.filter(
      (player) => player.id !== button.dataset.removePlayer
    );

    save();
  });

  // Appoint manager
  $("managerForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!ownerUnlocked) return;

    state.manager = $("managerName").value.trim();

    save();
  });

  // Remove manager
  $("removeManager").addEventListener("click", () => {
    if (!ownerUnlocked) return;

    state.manager = "";
    $("managerName").value = "";

    save();
  });

  // Add fixture
  $("fixtureForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!ownerUnlocked) return;

    const opponent = $("opponentName").value.trim();
    const date = $("fixtureDate").value;

    if (!opponent || !date) return;

    state.fixtures.push({
      id: `${Date.now()}`,
      opponent,
      date,
      venue: $("fixtureVenue").value
    });

    $("fixtureForm").reset();

    save();
  });

  // Change password
  $("passwordForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!ownerUnlocked) return;

    const password = $("newPassword").value;

    if (password.length < 6) {
      alert("Use at least 6 characters.");
      return;
    }

    state.password = password;

    $("passwordForm").reset();

    save();

    alert("Password changed on this browser.");
  });

  // Reset club
  $("resetBtn").addEventListener("click", () => {
    if (!ownerUnlocked) return;

    const confirmed = confirm(
      "Reset the club to zero players, no manager and no fixtures?"
    );

    if (!confirmed) return;

    const keepPassword = state.password;

    state = freshState();
    state.password = keepPassword;

    save();
  });

  // Mobile navigation
  $("menuToggle").addEventListener("click", () => {
    $("mainNav").classList.toggle("open");
  });

  document.querySelectorAll("#mainNav a").forEach((link) => {
    link.addEventListener("click", () => {
      $("mainNav").classList.remove("open");
    });
  });

  $("year").textContent = new Date().getFullYear();

  // Initial page load
  render();

})();
