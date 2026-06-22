const targetDate = new Date("2026-08-08T00:00:00-05:00").getTime();

// Supabase público (NO usar service_role key)
const SUPABASE_URL = "https://pzamzvalrudhnaubwzpj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YW16dmFscnVkaG5hdWJ3enBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzMjcsImV4cCI6MjA5NDUxNjMyN30.dWHOm2PSH4pVR9EOCH8iq4pjCFPlt8PIq5lbh7iVrMo";
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
    return window.matchMedia("(min-width: 760px)").matches ? 2 : 1;
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

function normalizeName(value) {
  return value.trim().toLocaleLowerCase("es");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function logSupabasePolicyHint(response, bodyText) {
  if (response.status === 401 || response.status === 403 || bodyText.toLowerCase().includes("row-level security")) {
    console.error("Posible error de permisos/RLS en Supabase. Revisa las policies anon de SELECT/INSERT para wedding_guests y rsvp_confirmations.");
  }
}

function validateRsvpForm(formData, selectedGuest, selectedCompanionNames, missingGenericNames) {
  const fullName = (formData.get("full_name") || "").toString().trim();
  const phone = (formData.get("phone") || "").toString().trim();
  const attendance = (formData.get("attendance") || "").toString().trim();
  const guestsCount = parseGuestsCount((formData.get("guests_count") || "0").toString());

  if (!fullName) {
    return "Por favor ingresa tu nombre y apellido.";
  }

  if (!selectedGuest || selectedGuest.full_name !== fullName) {
    return "Por favor busca tu nombre antes de confirmar.";
  }

  if (!attendance) {
    return "Por favor selecciona si asistirás.";
  }

  if (!phone) {
    return "Por favor confirma tu teléfono / WhatsApp.";
  }

  if (missingGenericNames.length > 0) {
    return "Por favor escribe el nombre de cada acompañante seleccionado.";
  }

  if (attendance === "Sí asistiré" && selectedCompanionNames.length > guestsCount) {
    return `Solo puedes registrar ${guestsCount} acompañante${guestsCount === 1 ? "" : "s"}.`;
  }

  return "";
}

async function findWeddingGuest(fullName) {
  const params = new URLSearchParams({
    select: "id,full_name,allowed_guests_count,guest_names,phone,email",
    full_name: `ilike.${fullName}`,
    limit: "1"
  });

  const url = `${WEDDING_GUESTS_ENDPOINT}?${params.toString()}`;
  console.log("URL búsqueda wedding_guests.full_name:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: SUPABASE_HEADERS
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error Supabase al buscar invitado:", response.status, response.statusText, errorText);
    logSupabasePolicyHint(response, errorText);
    throw new Error(errorText || "No se pudo buscar el invitado.");
  }

  const guests = await response.json();
  console.log("Resultado búsqueda invitado principal:", guests);
  return guests.find((guest) => normalizeName(guest.full_name || "") === normalizeName(fullName)) || null;
}

async function findWeddingGuestByCompanionName(fullName) {
  const params = new URLSearchParams({
    select: "id,full_name,guest_names",
    guest_names: `ilike.%${fullName}%`,
    limit: "10"
  });

  const url = `${WEDDING_GUESTS_ENDPOINT}?${params.toString()}`;
  console.log("URL búsqueda wedding_guests.guest_names:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: SUPABASE_HEADERS
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error Supabase al buscar acompañante:", response.status, response.statusText, errorText);
    logSupabasePolicyHint(response, errorText);
    throw new Error(errorText || "No se pudo buscar el acompañante.");
  }

  const guests = await response.json();
  console.log("Resultado búsqueda en guest_names:", guests);
  return guests.find((guest) =>
    parseGuestNames((guest.guest_names || "").toString())
      .some((guestName) => normalizeName(guestName) === normalizeName(fullName))
  ) || null;
}

async function hasExistingConfirmation(fullName) {
  const url = `${SUPABASE_URL}/rest/v1/rsvp_confirmations?select=id,full_name&full_name=eq.${encodeURIComponent(fullName)}&limit=1`;
  console.log("Verificando confirmación existente:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Error Supabase:", data);
    logSupabasePolicyHint(response, JSON.stringify(data));
    throw new Error(JSON.stringify(data));
  }

  const existingConfirmation = data[0] || null;
  console.log("Confirmación existente:", existingConfirmation);
  return existingConfirmation;
}

async function submitRsvp(payload) {
  console.log("Payload insert:", payload);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rsvp_confirmations`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Error Supabase:", errorBody);
    logSupabasePolicyHint(response, JSON.stringify(errorBody));
    throw new Error(errorBody.message || "No se pudo registrar la confirmación.");
  }

  console.log("Confirmación RSVP guardada correctamente.");
}

async function updateRsvp(confirmationId, payload) {
  console.log("Payload update:", payload);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rsvp_confirmations?id=eq.${encodeURIComponent(confirmationId)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Error Supabase:", errorBody);
    logSupabasePolicyHint(response, JSON.stringify(errorBody));
    throw new Error(errorBody.message || "No se pudo actualizar la confirmación.");
  }

  console.log("Confirmación RSVP actualizada correctamente.");
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
  const guestNamesList = document.getElementById("guest_names");
  let selectedGuest = null;

  if (!form || !submitBtn || !searchBtn || !fullNameInput || !phoneInput || !emailInput || !attendanceSelect || !guestCountInput || !guestNamesList) {
    return;
  }

  function getSelectedCompanionData() {
    const checkedCompanions = Array.from(guestNamesList.querySelectorAll('input[name="confirmed_companions"]:checked'));
    const names = [];
    const missingGenericNames = [];

    checkedCompanions.forEach((checkbox) => {
      if (checkbox.dataset.generic === "true") {
        const textInput = document.getElementById(checkbox.dataset.inputId);
        const genericName = textInput ? textInput.value.trim() : "";
        if (!genericName) {
          missingGenericNames.push(checkbox.value);
          return;
        }
        names.push(genericName);
        return;
      }

      names.push(checkbox.value.trim());
    });

    return {
      names: names.filter(Boolean),
      missingGenericNames
    };
  }

  function setCompanionCheckboxesDisabled(disabled) {
    guestNamesList.querySelectorAll('input[name="confirmed_companions"]').forEach((input) => {
      input.disabled = disabled;
    });
    guestNamesList.querySelectorAll(".companion-name-input").forEach((input) => {
      const checkbox = document.getElementById(input.dataset.checkboxId);
      input.disabled = disabled || !checkbox || !checkbox.checked;
    });
  }

  function renderCompanions(guestNames, allowedGuestCount) {
    guestNamesList.innerHTML = "";
    console.log("Renderizando acompañantes:", { guestNames, allowedGuestCount });

    if (allowedGuestCount === 0) {
      guestNamesList.innerHTML = '<p class="companion-empty">No tienes acompañantes asignados.</p>';
      return;
    }

    if (guestNames.length) {
      guestNamesList.innerHTML = guestNames.map((name, index) => {
        const safeName = escapeHtml(name);

        return `
          <label class="companion-option" for="companion_${index + 1}">
            <input type="checkbox" id="companion_${index + 1}" name="confirmed_companions" value="${safeName}">
            <span>${safeName}</span>
          </label>
        `;
      }).join("");
      return;
    }

    guestNamesList.innerHTML = Array.from({ length: allowedGuestCount }, (_, index) => {
      const number = index + 1;
      return `
        <label class="companion-option companion-option-generic" for="companion_${number}">
          <input type="checkbox" id="companion_${number}" name="confirmed_companions" value="Acompañante ${number}" data-generic="true" data-input-id="companion_name_${number}">
          <span>Acompañante ${number}:</span>
          <input class="companion-name-input" id="companion_name_${number}" data-checkbox-id="companion_${number}" type="text" placeholder="Nombre y apellido" disabled>
        </label>
      `;
    }).join("");

    guestNamesList.querySelectorAll('input[name="confirmed_companions"][data-generic="true"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const textInput = document.getElementById(checkbox.dataset.inputId);
        if (!textInput) {
          return;
        }
        textInput.disabled = !checkbox.checked || attendanceSelect.value === "No podré asistir";
        if (!checkbox.checked) {
          textInput.value = "";
        }
      });
    });
  }

  function clearGuestLookup() {
    selectedGuest = null;
    guestCountInput.value = "0";
    guestNamesList.innerHTML = '<p class="companion-empty">Busca tu invitación para ver tus acompañantes.</p>';
    submitBtn.disabled = true;
  }

  function updateGuestFieldsState() {
    const cannotAttend = attendanceSelect.value === "No podré asistir";
    const allowedGuestCount = parseGuestsCount(guestCountInput.value);
    setCompanionCheckboxesDisabled(cannotAttend || allowedGuestCount === 0);
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
        const companionGuest = await findWeddingGuestByCompanionName(fullName);
        if (companionGuest) {
          clearGuestLookup();
          alert(`Usted está asignado al invitado ${companionGuest.full_name}, por favor buscar con ese nombre para confirmar.`);
          setFeedback(`Usted está asignado al invitado ${companionGuest.full_name}, por favor buscar con ese nombre para confirmar.`, "error");
          return;
        }

        clearGuestLookup();
        setFeedback("No encontramos tu nombre en la lista de invitados, prueba de otra manera, escríbelo como está en tú invitación.", "error");
        return;
      }

      const allowedGuestCount = parseGuestsCount(String(guest.allowed_guests_count || "0"));
      const predefinedGuestNames = parseGuestNames((guest.guest_names || "").toString());

      selectedGuest = {
        id: guest.id,
        full_name: guest.full_name,
        allowed_guests_count: allowedGuestCount
      };
      fullNameInput.value = guest.full_name;
      phoneInput.value = guest.phone || "";
      emailInput.value = guest.email || "";
      guestCountInput.value = String(allowedGuestCount);
      renderCompanions(predefinedGuestNames, allowedGuestCount);
      updateGuestFieldsState();
      setFeedback("Completa los datos faltantes para confirmar.", "success");
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
    const attendance = (formData.get("attendance") || "").toString().trim();
    const selectedCompanionData = attendance === "Sí asistiré"
      ? getSelectedCompanionData()
      : { names: [], missingGenericNames: [] };
    const guestNames = selectedCompanionData.names;
    const validationError = validateRsvpForm(formData, selectedGuest, guestNames, selectedCompanionData.missingGenericNames);
    if (validationError) {
      setFeedback(validationError, "error");
      return;
    }

    const selectedGuestCount = attendance === "Sí asistiré" ? guestNames.length : 0;
    const selectedGuestNames = selectedGuestCount > 0 ? guestNames.join(", ") : null;
    const updatePayload = {
      email: (formData.get("email") || "").toString().trim() || null,
      phone: (formData.get("phone") || "").toString().trim() || null,
      attendance,
      guests_count: selectedGuestCount,
      guest_names: selectedGuestNames,
      food_restrictions: (formData.get("food_restrictions") || "").toString().trim() || null,
      message: (formData.get("message") || "").toString().trim() || null
    };
    const insertPayload = {
      full_name: selectedGuest.full_name,
      ...updatePayload
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
    let confirmationWasUpdated = false;

    try {
      const existingConfirmation = await hasExistingConfirmation(selectedGuest.full_name);
      if (existingConfirmation) {
        setFeedback("Ya hemos recibido una confirmación para este pase.", "error");
        const shouldOverwrite = window.confirm("Ya hemos recibido una confirmación para este pase. ¿Deseas actualizarla con la nueva información?");
        if (!shouldOverwrite) {
          setFeedback("No se realizaron cambios.", "");
          return;
        }

        await updateRsvp(existingConfirmation.id, updatePayload);
        confirmationWasUpdated = true;
      } else {
        await submitRsvp(insertPayload);
      }

      const allowedGuestCount = selectedGuest.allowed_guests_count;
      form.reset();
      clearGuestLookup();
      updateGuestFieldsState();
      const updatedGuestCountMessage = attendance === "Sí asistiré" && selectedGuestCount < allowedGuestCount
        ? ` Se ha actualizado su número de acompañantes a: ${selectedGuestCount}`
        : "";
      const successMessage = confirmationWasUpdated
        ? "Gracias, tu confirmación fue actualizada."
        : "Gracias, tu confirmación fue registrada.";
      setFeedback(`${successMessage}${updatedGuestCountMessage}`, "success");
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
