const targetDate = new Date("2026-08-08T00:00:00-05:00").getTime();

// Supabase público (NO usar service_role key)
const SUPABASE_URL = "https://pzamzvalrudhnaubwzpj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YW16dmFscnVkaG5hdWJ3enBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzMjcsImV4cCI6MjA5NDUxNjMyN30.dWHOm2PSH4pVR9EOCH8iq4pjCFPlt8PIq5lbh7iVrMo";
const SUPABASE_ENDPOINT = "https://pzamzvalrudhnaubwzpj.supabase.co/rest/v1/rsvp_confirmations";
const WEDDING_GUESTS_ENDPOINT = `${SUPABASE_URL}/rest/v1/wedding_guests`;
const RSVP_CONFIRMATIONS_ENDPOINT = `${SUPABASE_URL}/rest/v1/rsvp_confirmations`;
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`
};

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

function setupGalleryCarousel() {
  const carousel = document.querySelector(".gallery-carousel");
  if (!carousel) {
    return;
  }

  const track = carousel.querySelector(".gallery");
  const items = Array.from(carousel.querySelectorAll(".gallery-item"));
  const prevBtn = carousel.querySelector(".gallery-arrow-prev");
  const nextBtn = carousel.querySelector(".gallery-arrow-next");
  let currentIndex = 0;

  if (!track || !prevBtn || !nextBtn || items.length === 0) {
    return;
  }

  function getVisibleItems() {
    return 1;
  }

  function updateCarousel() {
    const visibleItems = getVisibleItems();
    const maxIndex = Math.max(items.length - visibleItems, 0);
    currentIndex = Math.min(currentIndex, maxIndex);

    const itemWidth = items[0].getBoundingClientRect().width;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || "0");
    const offset = currentIndex * (itemWidth + gap);

    track.style.transform = `translateX(-${offset}px)`;
    prevBtn.disabled = items.length <= visibleItems;
    nextBtn.disabled = items.length <= visibleItems;
  }

  prevBtn.addEventListener("click", () => {
    const visibleItems = getVisibleItems();
    const maxIndex = Math.max(items.length - visibleItems, 0);
    currentIndex = currentIndex === 0 ? maxIndex : Math.max(currentIndex - visibleItems, 0);
    updateCarousel();
  });

  nextBtn.addEventListener("click", () => {
    const visibleItems = getVisibleItems();
    const maxIndex = Math.max(items.length - visibleItems, 0);
    currentIndex = currentIndex >= maxIndex ? 0 : Math.min(currentIndex + visibleItems, maxIndex);
    updateCarousel();
  });

  window.addEventListener("resize", updateCarousel);
  updateCarousel();
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

function parseGuestNames(value) {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function validateRsvpForm(formData, selectedGuest) {
  const fullName = (formData.get("full_name") || "").toString().trim();
  const attendance = (formData.get("attendance") || "").toString().trim();
  const guestsCount = parseGuestsCount((formData.get("guests_count") || "0").toString());
  const guestNames = parseGuestNames((formData.get("guest_names") || "").toString());

  if (!fullName) {
    return "Por favor ingresa tu nombre y apellido.";
  }

  if (!selectedGuest || selectedGuest.full_name !== fullName) {
    return "Por favor busca tu nombre antes de confirmar.";
  }

  if (!attendance) {
    return "Por favor selecciona si asistirás.";
  }

  if (guestsCount === 0 && guestNames.length > 0) {
    return "No tienes acompañantes asignados para esta invitación.";
  }

  if (attendance === "Sí asistiré" && guestNames.length > guestsCount) {
    return `Solo puedes registrar ${guestsCount} acompañante${guestsCount === 1 ? "" : "s"}. Separa cada nombre con coma.`;
  }

  return "";
}

async function findWeddingGuest(fullName) {
  const params = new URLSearchParams({
    select: "id,full_name,allowed_guests_count,guest_names,phone,email",
    full_name: `ilike.${fullName}`,
    limit: "1"
  });

  console.log("Buscando invitado en wedding_guests:", fullName);

  const response = await fetch(`${WEDDING_GUESTS_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: SUPABASE_HEADERS
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error Supabase al buscar invitado:", errorText);
    throw new Error(errorText || "No se pudo buscar el invitado.");
  }

  const guests = await response.json();
  console.log("Resultado búsqueda wedding_guests:", guests);
  return guests[0] || null;
}

async function hasExistingConfirmation(weddingGuestId) {
  const params = new URLSearchParams({
    select: "id",
    wedding_guest_id: `eq.${weddingGuestId}`,
    limit: "1"
  });

  console.log("Verificando confirmación existente:", weddingGuestId);

  const response = await fetch(`${RSVP_CONFIRMATIONS_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: SUPABASE_HEADERS
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error Supabase al verificar duplicados:", errorText);
    throw new Error(errorText || "No se pudo verificar la confirmación existente.");
  }

  const confirmations = await response.json();
  console.log("Confirmaciones existentes:", confirmations);
  return confirmations.length > 0;
}

async function submitRsvp(payload) {
  console.log("Insertando confirmación RSVP:", payload);

  const response = await fetch(SUPABASE_ENDPOINT, {
    method: "POST",
    headers: {
      ...SUPABASE_HEADERS,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error Supabase al insertar confirmación:", errorText);
    throw new Error(errorText || "No se pudo registrar la confirmación.");
  }

  console.log("Confirmación RSVP guardada correctamente.");
}

function setupRsvpForm() {
  const form = document.getElementById("rsvp-form");
  const submitBtn = document.getElementById("rsvp-submit");
  const searchBtn = document.getElementById("guest-search");
  const fullNameInput = document.getElementById("full_name");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");
  const attendanceSelect = document.getElementById("attendance");
  const guestCountInput = document.getElementById("guests_count");
  const guestNamesInput = document.getElementById("guest_names");
  let selectedGuest = null;
  let guestNamesLocked = false;

  if (!form || !submitBtn || !searchBtn || !fullNameInput || !phoneInput || !emailInput || !attendanceSelect || !guestCountInput || !guestNamesInput) {
    return;
  }

  function clearGuestLookup() {
    selectedGuest = null;
    guestNamesLocked = false;
    guestCountInput.value = "0";
    guestNamesInput.value = "";
    guestNamesInput.readOnly = false;
    submitBtn.disabled = true;
  }

  function updateGuestFieldsState() {
    const canAttend = attendanceSelect.value === "Sí asistiré";
    const allowedGuestCount = parseGuestsCount(guestCountInput.value);
    guestNamesInput.disabled = !canAttend || allowedGuestCount === 0;
    guestNamesInput.readOnly = canAttend && guestNamesLocked;
    guestNamesInput.placeholder = allowedGuestCount === 0 ? "No aplica" : "Ejemplo: Juan Pérez, María Pérez";
  }

  async function handleGuestSearch() {
    const fullName = fullNameInput.value.trim();
    setFeedback("", "");

    if (!fullName) {
      setFeedback("Ingresa tu nombre y apellido para buscar tu invitación.", "error");
      return;
    }

    searchBtn.disabled = true;
    submitBtn.disabled = true;
    searchBtn.textContent = "Buscando...";

    try {
      const guest = await findWeddingGuest(fullName);
      if (!guest) {
        clearGuestLookup();
        setFeedback("No encontramos tu nombre en la lista de invitados.", "error");
        return;
      }

      const allowedGuestCount = parseGuestsCount(String(guest.allowed_guests_count || "0"));
      const predefinedGuestNames = (guest.guest_names || "").toString().trim();

      selectedGuest = {
        id: guest.id,
        full_name: guest.full_name,
        allowed_guests_count: allowedGuestCount
      };
      guestNamesLocked = Boolean(predefinedGuestNames);
      fullNameInput.value = guest.full_name;
      phoneInput.value = guest.phone || "";
      emailInput.value = guest.email || "";
      guestCountInput.value = String(allowedGuestCount);
      guestNamesInput.value = predefinedGuestNames;
      updateGuestFieldsState();
      setFeedback("Invitación encontrada. Completa el resto de datos para confirmar.", "success");
    } catch (error) {
      setFeedback("Ocurrió un error al buscar tu invitación. Inténtalo nuevamente.", "error");
      console.error(error);
    } finally {
      searchBtn.disabled = false;
      submitBtn.disabled = !selectedGuest;
      searchBtn.textContent = "Buscar";
    }
  }

  fullNameInput.addEventListener("input", clearGuestLookup);
  searchBtn.addEventListener("click", handleGuestSearch);
  attendanceSelect.addEventListener("change", updateGuestFieldsState);
  updateGuestFieldsState();
  submitBtn.disabled = true;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("", "");

    const formData = new FormData(form);
    const validationError = validateRsvpForm(formData, selectedGuest);
    if (validationError) {
      setFeedback(validationError, "error");
      return;
    }

    const attendance = (formData.get("attendance") || "").toString().trim();
    const guestNames = attendance === "Sí asistiré"
      ? parseGuestNames((formData.get("guest_names") || "").toString())
      : [];

    const payload = {
      wedding_guest_id: selectedGuest.id,
      full_name: (formData.get("full_name") || "").toString().trim(),
      phone: (formData.get("phone") || "").toString().trim() || null,
      email: (formData.get("email") || "").toString().trim() || null,
      attendance,
      confirmed_guests_count: attendance === "Sí asistiré" ? guestNames.length : 0,
      confirmed_guest_names: guestNames.length ? guestNames.join(", ") : null,
      food_restrictions: (formData.get("food_restrictions") || "").toString().trim() || null,
      message: (formData.get("message") || "").toString().trim() || null
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const alreadyConfirmed = await hasExistingConfirmation(selectedGuest.id);
      if (alreadyConfirmed) {
        setFeedback("Ya hemos recibido tu confirmación anteriormente.", "error");
        return;
      }

      await submitRsvp(payload);
      form.reset();
      clearGuestLookup();
      updateGuestFieldsState();
      setFeedback("Gracias, tu confirmación fue registrada.", "success");
    } catch (error) {
      setFeedback("Ocurrió un error al guardar tu confirmación. Inténtalo nuevamente.", "error");
      console.error(error);
    } finally {
      submitBtn.disabled = !selectedGuest;
      submitBtn.textContent = "Enviar confirmación";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCountdown();
  setInterval(updateCountdown, 1000);
  setupRevealAnimations();
  setupMobileMenu();
  setupGalleryCarousel();
  setupRsvpForm();
});
