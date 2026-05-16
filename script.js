const targetDate = new Date("2026-08-08T00:00:00-05:00").getTime();

// Supabase público (NO usar service_role key)
const SUPABASE_URL = "https://pzamzvalrudhnaubwzpj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YW16dmFscnVkaG5hdWJ3enBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzMjcsImV4cCI6MjA5NDUxNjMyN30.dWHOm2PSH4pVR9EOCH8iq4pjCFPlt8PIq5lbh7iVrMo";
const SUPABASE_ENDPOINT = "https://pzamzvalrudhnaubwzpj.supabase.co/rest/v1/rsvp_confirmations";
const SUPABASE_AUTHORIZATION = "sb_publishable_AYoDbSs7HdErta6R47tunA_WDB05vlG";

function updateCountdown() {
  const now = Date.now();
  const distance = targetDate - now;

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
    return;
  }

  if (distance <= 0) {
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  daysEl.textContent = String(days).padStart(2, "0");
  hoursEl.textContent = String(hours).padStart(2, "0");
  minutesEl.textContent = String(minutes).padStart(2, "0");
  secondsEl.textContent = String(seconds).padStart(2, "0");
}

function setupRevealAnimations() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  items.forEach((el) => observer.observe(el));
}

function setupMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("main-nav");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setFeedback(message, type) {
  const feedbackEl = document.getElementById("rsvp-feedback");
  if (!feedbackEl) {
    return;
  }

  feedbackEl.textContent = message;
  feedbackEl.classList.remove("success", "error");
  if (type) {
    feedbackEl.classList.add(type);
  }
}

function parseGuestsCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function validateRsvpForm(formData) {
  const fullName = (formData.get("full_name") || "").toString().trim();
  const attendance = (formData.get("attendance") || "").toString().trim();

  if (!fullName) {
    return "Por favor ingresa tu nombre completo.";
  }

  if (!attendance) {
    return "Por favor selecciona si asistirás.";
  }

  return "";
}

async function submitRsvp(payload) {
  const response = await fetch(SUPABASE_ENDPOINT, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: SUPABASE_AUTHORIZATION,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "No se pudo registrar la confirmación.");
  }
}

function setupRsvpForm() {
  const form = document.getElementById("rsvp-form");
  const submitBtn = document.getElementById("rsvp-submit");
  const attendanceSelect = document.getElementById("attendance");
  const guestCountInput = document.getElementById("guests_count");
  const guestNamesInput = document.getElementById("guest_names");

  if (!form || !submitBtn || !attendanceSelect || !guestCountInput || !guestNamesInput) {
    return;
  }

  function updateGuestFieldsState() {
    const canAttend = attendanceSelect.value === "Sí asistiré";
    if (!canAttend) {
      guestCountInput.value = "0";
      guestNamesInput.value = "";
    }
    guestCountInput.disabled = !canAttend;
    guestNamesInput.disabled = !canAttend;
  }

  attendanceSelect.addEventListener("change", updateGuestFieldsState);
  updateGuestFieldsState();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("", "");

    const formData = new FormData(form);
    const validationError = validateRsvpForm(formData);
    if (validationError) {
      setFeedback(validationError, "error");
      return;
    }

    const payload = {
      full_name: (formData.get("full_name") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim() || null,
      phone: (formData.get("phone") || "").toString().trim() || null,
      attendance: (formData.get("attendance") || "").toString().trim(),
      guests_count: parseGuestsCount((formData.get("guests_count") || "0").toString()),
      guest_names: (formData.get("guest_names") || "").toString().trim() || null,
      food_restrictions: (formData.get("food_restrictions") || "").toString().trim() || null,
      message: (formData.get("message") || "").toString().trim() || null
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      await submitRsvp(payload);
      form.reset();
      updateGuestFieldsState();
      setFeedback("Gracias, tu confirmación fue registrada.", "success");
    } catch (error) {
      setFeedback("Ocurrió un error al guardar tu confirmación. Inténtalo nuevamente.", "error");
      console.error(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar confirmación";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCountdown();
  setInterval(updateCountdown, 1000);
  setupRevealAnimations();
  setupMobileMenu();
  setupRsvpForm();
});
