
(() => {
  "use strict";

  const STORAGE_KEY = "pheonix_fc_owner_system_v9";
  const DEFAULT_PASSWORD = "phoenix2026";

  const $ = (id) => document.getElementById(id);

  function freshState() {
    return {
      password: DEFAULT_PASSWORD,
      players: [],
      manager: "",
      fixtures: []
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return freshState();

      const parsed = JSON.parse(saved);

      return {
        ...freshState(),
        ...parsed,
        players: Array.isArray(parsed.players) ? parsed.players : [],
        fixtures: Array.isArray(parsed.fixtures) ? parsed.fixtures : [],
        manager: typeof parsed.manager === "string" ? parsed.manager : ""
      };
    } catch (error) {
      console.error("Unable to load saved data:", error);
      return freshState();
    }
  }

  let state = loadState();
  let loggedIn = false;

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function render() {
    $("playerCount").textContent = state.players.length;
    $("managerCount").textContent = state.manager ? 1 : 0;
    $("fixtureCount").textContent = state.fixtures.length;

    $("adminPlayerCount").textContent = state.players.length;
    $("adminManagerStatus").textContent = state.manager || "None";
    $("adminFixtureCount").textContent = state.fixtures.length;

    $("currentManager").textContent =
      "Current manager: " + (state.manager || "None");

    // Public squad
    if (state.players.length === 0) {
      $("publicSquad").innerHTML = `
        <h3>No players registered yet</h3>
        <p>Our squad will be announced soon.</p>
      `;
    } else {
      $("publicSquad").innerHTML = state.players.map((player) => `
        <div class="admin-player">
          <span>
            #${escapeHTML(player.number)}
            ${escapeHTML(player.name)}
            — ${escapeHTML(player.position)}
          </span>
        </div>
      `).join("");
    }

    // Public fixtures
    if (state.fixtures.length === 0) {
      $("publicFixtures").innerHTML = `
        <h3>No fixtures announced</h3>
        <p>Our first fixtures will appear here.</p>
      `;
    } else {
      $("publicFixtures").innerHTML = state.fixtures.map((fixture) => `
        <div class="admin-player">
          <span>
            PHEONIX FC vs ${escapeHTML(fixture.opponent)}
            — ${escapeHTML(fixture.date)}
            (${escapeHTML(fixture.venue)})
          </span>
        </div>
      `).join("");
    }

    // Admin player list
    $("adminPlayerList").innerHTML = state.players.map((player) => `
      <div class="admin-player">
        <span>
          #${escapeHTML(player.number)}
          ${escapeHTML(player.name)}
          (${escapeHTML(player.position)})
        </span>
        <button type="button" data-remove="${escapeHTML(player.id)}">
          REMOVE
        </button>
      </div>
    `).join("");
  }

  // OPEN LOGIN MODAL
  $("ownerLoginButton").addEventListener("click", () => {
    $("loginError").textContent = "";
    $("ownerPassword").value = "";
    $("loginModal").classList.remove("hidden");
    $("ownerPassword").focus();
  });

  // CLOSE LOGIN MODAL
  $("closeLogin").addEventListener("click", () => {
    $("loginModal").classList.add("hidden");
  });

  $("loginModal").addEventListener("click", (event) => {
    if (event.target === $("loginModal")) {
      $("loginModal").classList.add("hidden");
    }
  });

  // LOGIN SUBMISSION
  $("ownerLoginForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const enteredPassword = $("ownerPassword").value;

    if (enteredPassword !== state.password) {
      $("loginError").textContent =
        "Incorrect password. Please try again.";
      return;
    }

    loggedIn = true;

    $("loginModal").classList.add("hidden");
    $("publicWebsite").classList.add("hidden");
    document.querySelector(".header").classList.add("hidden");
    $("adminPanel").classList.remove("hidden");

    window.scrollTo(0, 0);
    render();
  });

  // LOG OUT
  $("logoutButton").addEventListener("click", () => {
    loggedIn = false;

    $("adminPanel").classList.add("hidden");
    $("publicWebsite").classList.remove("hidden");
    document.querySelector(".header").classList.remove("hidden");

    window.scrollTo(0, 0);
  });

  // ADD PLAYER
  $("addPlayerForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!loggedIn) return;

    const name = $("newPlayerName").value.trim();
    const number = Number($("newPlayerNumber").value);
    const position = $("newPlayerPosition").value;

    if (!name || !Number.isInteger(number) || number < 1 || number > 99) {
      alert("Enter a valid player name and shirt number.");
      return;
    }

    if (state.players.some((player) => player.number === number)) {
      alert("This squad number is already taken.");
      return;
    }

    state.players.push({
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      name,
      number,
      position
    });

    $("addPlayerForm").reset();
    save();
  });

  // REMOVE PLAYER
  $("adminPlayerList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");

    if (!button || !loggedIn) return;

    state.players = state.players.filter(
      (player) => player.id !== button.dataset.remove
    );

    save();
  });

  // APPOINT MANAGER
  $("managerForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!loggedIn) return;

    const manager = $("newManagerName").value.trim();

    if (!manager) {
      alert("Please enter the manager's name.");
      return;
    }

    state.manager = manager;

    save();
    alert("Manager appointed successfully.");
  });

  // REMOVE MANAGER
  $("removeManagerButton").addEventListener("click", () => {
    if (!loggedIn) return;

    state.manager = "";
    $("newManagerName").value = "";

    save();
  });

  // ADD FIXTURE
  $("addFixtureForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!loggedIn) return;

    const opponent = $("opponentName").value.trim();
    const date = $("matchDate").value;
    const venue = $("matchVenue").value;

    if (!opponent || !date) {
      alert("Enter opponent and match date.");
      return;
    }

    state.fixtures.push({
      id: Date.now().toString(),
      opponent,
      date,
      venue
    });

    $("addFixtureForm").reset();
    save();

    alert("Fixture added successfully.");
  });

  // CHANGE PASSWORD
  $("changePasswordForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!loggedIn) return;

    const newPassword = $("newOwnerPassword").value;

    if (newPassword.length < 6) {
      alert("Password must have at least 6 characters.");
      return;
    }

    state.password = newPassword;

    $("changePasswordForm").reset();
    save();

    alert("Owner password changed successfully.");
  });

  render();

})();
