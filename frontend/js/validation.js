(function () {
  "use strict";

  function validateRequiredFields(form, feedbackElement, showFeedback) {
    const requiredControls = Array.from(form.querySelectorAll("[required]"));
    requiredControls.forEach(function (control) {
      control.removeAttribute("aria-invalid");
    });
    const invalidControls = requiredControls.filter(function (control) {
      return !control.checkValidity();
    });
    if (invalidControls.length === 0) {
      return true;
    }
    const invalidLabels = invalidControls.map(function (control) {
      const label = form.querySelector("label[for=\"" + control.id + "\"]");
      control.setAttribute("aria-invalid", "true");
      return label ? label.textContent : control.name;
    });
    showFeedback(feedbackElement, "Please review the highlighted fields: " + invalidLabels.join(", ") + ".", "error");
    invalidControls[0].focus();
    return false;
  }

  function enableRecovery(form) {
    ["input", "change"].forEach(function (eventName) {
      form.addEventListener(eventName, function (event) {
        if (event.target.checkValidity()) {
          event.target.removeAttribute("aria-invalid");
        }
      });
    });
  }

  window.CellStockValidation = {
    enableRecovery: enableRecovery,
    validateRequiredFields: validateRequiredFields
  };
}());
