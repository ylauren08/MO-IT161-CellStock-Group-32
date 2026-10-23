(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const versionLabel = document.getElementById("app-version");

  fetch("/api/version", { cache: "no-store" }).then(function (response) {
    if (!response.ok) {
      throw new Error("Version information is unavailable.");
    }
    return response.json();
  }).then(function (payload) {
    if (payload.version) {
      versionLabel.textContent = payload.version;
    }
  }).catch(function () {
    // Keep the version written in the page when the backend is unavailable.
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !event.target.matches("input, select, textarea, button")) {
      event.preventDefault();
      document.getElementById("search-model").focus();
    }
  });

  const dashboardActions = {
    inventory: function () {
      document.getElementById("inventory").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    },
    attention: function () {
      document.getElementById("view-low-stock").click();
    },
    suppliers: function () {
      document.getElementById("suppliers").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    },
    reports: function () {
      document.getElementById("reports").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    },
    "stock-in": function () {
      document.querySelector('[data-transaction-filter="stock-in"]').click();
      document.getElementById("transactions").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    },
    "stock-out": function () {
      document.querySelector('[data-transaction-filter="stock-out"]').click();
      document.getElementById("transactions").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    }
  };

  document.querySelectorAll("[data-dashboard-action]").forEach(function (card) {
    const label = card.querySelector(".kpi-label").textContent;
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", "View " + label.toLowerCase());
    card.title = "View " + label.toLowerCase();

    function runAction() {
      dashboardActions[card.dataset.dashboardAction]();
    }

    card.addEventListener("click", runAction);
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        runAction();
      }
    });
  });

  const progress = document.createElement("div");
  progress.className = "app-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.prepend(progress);

  const toastRegion = document.createElement("div");
  toastRegion.className = "toast-region";
  toastRegion.setAttribute("aria-label", "Recent notifications");
  document.body.appendChild(toastRegion);

  const lastMessages = new WeakMap();

  function removeToast(toast) {
    if (!toast.isConnected) {
      return;
    }
    toast.classList.add("is-leaving");
    window.setTimeout(function () { toast.remove(); }, reducedMotion.matches ? 0 : 170);
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = type === "error" ? "!" : "\u2713";

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = message;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "toast-close";
    closeButton.setAttribute("aria-label", "Dismiss notification");
    closeButton.title = "Dismiss";
    closeButton.textContent = "\u00d7";
    closeButton.addEventListener("click", function () { removeToast(toast); });

    toast.append(icon, text, closeButton);
    toastRegion.prepend(toast);
    while (toastRegion.children.length > 3) {
      toastRegion.lastElementChild.remove();
    }
    window.setTimeout(function () { removeToast(toast); }, type === "error" ? 7000 : 4500);
  }

  function processFeedback(element) {
    if (!element || element.hidden || !element.classList.contains("feedback-message")) {
      return;
    }
    const message = element.textContent.trim();
    const type = element.classList.contains("feedback-error") ? "error" :
      element.classList.contains("feedback-success") ? "success" : "";
    if (message === "Product records loaded from the Express backend.") {
      return;
    }
    if (type && message && lastMessages.get(element) !== type + message) {
      lastMessages.set(element, type + message);
      showToast(message, type);
    }
  }

  function syncProgress() {
    progress.classList.toggle("is-active", Boolean(document.querySelector(".feedback-loading:not([hidden])")));
  }

  const feedbackObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      const element = mutation.target.nodeType === Node.TEXT_NODE ? mutation.target.parentElement : mutation.target;
      processFeedback(element.closest ? element.closest(".feedback-message") : null);
    });
    syncProgress();
  });

  feedbackObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "hidden"],
    characterData: true,
    childList: true,
    subtree: true
  });

  document.querySelectorAll(".feedback-message").forEach(processFeedback);
  syncProgress();
}());
