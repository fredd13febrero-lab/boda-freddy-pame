(function () {
  const MAX_FILES = 20;
  const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024;
  const MAX_IMAGE_SIDE = 1600;
  const JPEG_QUALITY = 0.75;
  const EVENT_DATE = "2026-08-08";
  const BUCKET_NAME = "wedding-photos";
  const EVENT_FOLDER = "event";
  const STATUS = {
    pending: "Pendiente",
    processing: "Procesando",
    uploading: "Subiendo",
    registering: "Registrando",
    completed: "Completado",
    error: "Error"
  };

  let supabaseClient = null;
  let selectedPhotos = [];
  let isUploading = false;
  let galleryPhotos = [];
  let lightboxIndex = 0;
  let fallbackCounter = 0;

  function getSupabaseClient() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!window.supabase || typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") {
      throw new Error("No se encontro la configuracion publica de Supabase.");
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    return supabaseClient;
  }

  function formatBytes(bytes) {
    if (!bytes) {
      return "0 KB";
    }

    const units = ["B", "KB", "MB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function setFeedback(message, type, detail) {
    const feedback = document.getElementById("uploadFeedback");
    const feedbackDetail = document.getElementById("uploadFeedbackDetail");
    if (!feedback) {
      return;
    }

    feedback.textContent = message;
    if (feedbackDetail) {
      feedbackDetail.textContent = detail || "";
    }
    feedback.classList.remove("success", "error");
    if (type) {
      feedback.classList.add(type);
    }
  }

  function updateProgress() {
    const finished = selectedPhotos.filter((item) => item.status === STATUS.completed || item.status === STATUS.error).length;
    const total = selectedPhotos.length;
    const percent = total ? Math.round((finished / total) * 100) : 0;
    const fill = document.getElementById("uploadProgressFill");
    const text = document.getElementById("uploadProgressText");

    if (fill) {
      fill.style.width = `${percent}%`;
    }

    if (text) {
      text.textContent = `${finished} de ${total} fotografías finalizadas`;
    }
  }

  function updateSelectedCount() {
    const selectedCount = document.getElementById("selectedCount");
    if (!selectedCount) {
      return;
    }

    selectedCount.textContent = `${selectedPhotos.length} fotografía${selectedPhotos.length === 1 ? "" : "s"} seleccionada${selectedPhotos.length === 1 ? "" : "s"}`;
  }

  function revokePreviewUrls() {
    selectedPhotos.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }

  function renderPreviews() {
    const list = document.getElementById("photoPreviewList");
    if (!list) {
      return;
    }

    list.innerHTML = "";
    selectedPhotos.forEach((item) => {
      const card = document.createElement("article");
      card.className = "photo-preview-card";

      const img = document.createElement("img");
      img.className = "photo-preview-thumb";
      img.src = item.previewUrl;
      img.alt = item.file.name;

      const meta = document.createElement("div");
      meta.className = "photo-preview-meta";

      const name = document.createElement("p");
      name.className = "photo-preview-name";
      name.textContent = item.file.name;

      const details = document.createElement("div");
      details.className = "photo-preview-details";

      const size = document.createElement("span");
      size.textContent = formatBytes(item.file.size);

      const status = document.createElement("span");
      status.className = "photo-preview-status";
      status.textContent = item.status;

      details.append(size, status);
      meta.append(name, details);

      if (item.errorMessage) {
        const errorText = document.createElement("p");
        errorText.className = "photo-preview-details";
        errorText.textContent = item.errorMessage;
        meta.appendChild(errorText);
      }

      const removeButton = document.createElement("button");
      removeButton.className = "photo-remove-button";
      removeButton.type = "button";
      removeButton.textContent = "Retirar";
      removeButton.disabled = isUploading;
      removeButton.addEventListener("click", () => removePhoto(item.id));
      meta.appendChild(removeButton);

      card.append(img, meta);
      list.appendChild(card);
    });

    updateSelectedCount();
    updateProgress();
  }

  function setPhotoStatus(id, status, errorMessage) {
    selectedPhotos = selectedPhotos.map((item) => (
      item.id === id ? { ...item, status, errorMessage: errorMessage || "" } : item
    ));
    renderPreviews();
  }

  function removePhoto(id) {
    if (isUploading) {
      return;
    }

    const item = selectedPhotos.find((photo) => photo.id === id);
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    selectedPhotos = selectedPhotos.filter((photo) => photo.id !== id);
    renderPreviews();
  }

  function validateFiles(files) {
    const accepted = [];

    files.slice(0, MAX_FILES).forEach((file) => {
      console.log("Archivo seleccionado:", file);

      const looksLikeImage = file.type.startsWith("image/") || isImageFileByExtension(file);

      if (!looksLikeImage) {
        return;
      }

      if (file.type.startsWith("video/")) {
        return;
      }

      if (file.size > MAX_ORIGINAL_SIZE) {
        return;
      }

      accepted.push(file);
    });

    if (files.length > MAX_FILES) {
      setFeedback("Solo puedes seleccionar hasta 20 fotografías por envío.", "error");
    } else if (!accepted.length && files.length) {
      setFeedback("Selecciona imágenes de máximo 10 MB. No se permiten videos.", "error");
    } else {
      setFeedback("", "");
    }

    return accepted;
  }

  function handleFileSelection(event) {
    if (isUploading) {
      return;
    }

    revokePreviewUrls();
    const files = Array.from(event.target.files || []);
    const accepted = validateFiles(files);
    selectedPhotos = accepted.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: STATUS.pending,
      errorMessage: ""
    }));
    renderPreviews();
  }

  function createImageBitmapFallback(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudo decodificar la imagen."));
      };
      img.src = objectUrl;
    });
  }

  async function decodeImage(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (error) {
        return createImageBitmapFallback(file);
      }
    }

    return createImageBitmapFallback(file);
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir la imagen."));
          return;
        }

        resolve(blob);
      }, "image/jpeg", JPEG_QUALITY);
    });
  }

  function getCanvasSize(width, height) {
    const longestSide = Math.max(width, height);
    if (longestSide <= MAX_IMAGE_SIDE) {
      return { width, height };
    }

    const scale = MAX_IMAGE_SIDE / longestSide;
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale)
    };
  }

  async function processImage(file) {
    try {
      const image = await decodeImage(file);
      const sourceWidth = image.width || image.naturalWidth;
      const sourceHeight = image.height || image.naturalHeight;
      const size = getCanvasSize(sourceWidth, sourceHeight);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        throw new Error("Canvas no disponible.");
      }

      context.drawImage(image, 0, 0, size.width, size.height);
      if (typeof image.close === "function") {
        image.close();
      }

      const blob = await canvasToBlob(canvas);
      const processedFile = new File([blob], changeExtension(file.name, "jpg"), {
        type: "image/jpeg",
        lastModified: Date.now()
      });
      console.log("Archivo procesado:", processedFile);
      return processedFile;
    } catch (processingError) {
      console.error("Error al procesar:", processingError);

      if (isHeicLike(file) && file.size <= MAX_ORIGINAL_SIZE) {
        console.log("Archivo procesado:", file);
        return file;
      }

      throw processingError;
    }
  }

  function isHeicLike(file) {
    const name = file.name.toLowerCase();
    return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
  }

  function isImageFileByExtension(file) {
    return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  }

  function changeExtension(fileName, extension) {
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    return `${baseName}.${extension}`;
  }

  function getExtension(file) {
    if (file.type === "image/jpeg") {
      return "jpg";
    }
    if (file.type === "image/png") {
      return "png";
    }
    if (file.type === "image/webp") {
      return "webp";
    }
    if (file.type === "image/heic") {
      return "heic";
    }
    if (file.type === "image/heif") {
      return "heif";
    }

    const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "jpg";
  }

  function createUniqueId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    fallbackCounter += 1;
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${fallbackCounter}`;
  }

  function createStoragePath(file) {
    const extension = getExtension(file);
    return `${EVENT_FOLDER}/${EVENT_DATE}/${createUniqueId()}-${Date.now()}.${extension}`;
  }

  async function uploadSinglePhoto(item, uploaderName, message) {
    const client = getSupabaseClient();
    const originalFile = item.file;

    try {
      setPhotoStatus(item.id, STATUS.processing);
      const processedFile = await processImage(originalFile);
      const storagePath = createStoragePath(processedFile);
      console.log("Storage path:", storagePath);

      setPhotoStatus(item.id, STATUS.uploading);
      const { data: storageData, error: storageError } = await client.storage
        .from(BUCKET_NAME)
        .upload(storagePath, processedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: processedFile.type
        });

      console.log("Resultado Storage:", storageData);
      if (storageError) {
        console.error("Error Storage:", storageError);
        throw storageError;
      }

      const { data: publicUrlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);
      const publicUrl = publicUrlData.publicUrl;
      console.log("URL pública:", publicUrl);

      const metadataPayload = {
        storage_path: storagePath,
        public_url: publicUrl,
        uploader_name: uploaderName || null,
        message: message || null,
        original_name: originalFile.name,
        mime_type: processedFile.type,
        file_size: processedFile.size,
        is_approved: false
      };
      console.log("Payload metadatos:", metadataPayload);

      setPhotoStatus(item.id, STATUS.registering);
      const { error: metadataError } = await client
        .from("wedding_photo_uploads")
        .insert(metadataPayload);

      if (metadataError) {
        console.error("Error metadatos:", metadataError);
        console.error("Storage path con metadatos fallidos:", storagePath);
        setPhotoStatus(item.id, STATUS.error, "El archivo se subio, pero no se pudo registrar. Avisanos para revisarlo.");
        return false;
      }

      setPhotoStatus(item.id, STATUS.completed);
      return true;
    } catch (error) {
      const messageText = isHeicLike(originalFile)
        ? "Este formato no pudo procesarse. Intenta compartir una captura o una versión JPG."
        : "No pudimos cargar esta fotografía.";
      setPhotoStatus(item.id, STATUS.error, messageText);
      return false;
    }
  }

  function setUploadDisabled(disabled) {
    const uploadButton = document.getElementById("uploadButton");
    const photoFiles = document.getElementById("photoFiles");

    if (uploadButton) {
      uploadButton.disabled = disabled;
      uploadButton.textContent = disabled ? "Subiendo fotografías..." : "Subir fotografías";
    }

    if (photoFiles) {
      photoFiles.disabled = disabled;
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (isUploading) {
      return;
    }

    if (!selectedPhotos.length) {
      setFeedback("Selecciona al menos una fotografía para subir.", "error");
      return;
    }

    isUploading = true;
    setUploadDisabled(true);
    setFeedback("", "");

    const uploaderName = (document.getElementById("uploaderName").value || "").trim();
    const message = (document.getElementById("photoMessage").value || "").trim();
    let successCount = 0;
    let errorCount = 0;

    for (const item of selectedPhotos) {
      const wasSuccessful = await uploadSinglePhoto(item, uploaderName, message);
      if (wasSuccessful) {
        successCount += 1;
      } else {
        errorCount += 1;
      }
    }

    if (successCount && !errorCount) {
      setFeedback(
        "¡Gracias por compartir estos recuerdos con nosotros!",
        "success",
        "Tus fotografías fueron recibidas y aparecerán en la galería después de ser revisadas."
      );
    } else if (successCount && errorCount) {
      setFeedback("Algunas fotografías se cargaron correctamente, pero otras presentaron un error.", "error");
    } else {
      setFeedback("No pudimos completar la carga. Revisa tu conexion e intentalo nuevamente.", "error");
    }

    await loadGallery();
    isUploading = false;
    setUploadDisabled(false);
    renderPreviews();
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat("es-EC", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  }

  function renderGallery() {
    const gallery = document.getElementById("guestGallery");
    const status = document.getElementById("galleryStatus");
    if (!gallery || !status) {
      return;
    }

    gallery.innerHTML = "";
    status.textContent = "";

    if (!galleryPhotos.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-empty";
      empty.textContent = "Aún no hay fotografías publicadas. ¡Sé de los primeros en compartir!";
      gallery.appendChild(empty);
      return;
    }

    galleryPhotos.forEach((photo, index) => {
      const card = document.createElement("article");
      card.className = "guest-photo-card";

      const imageButton = document.createElement("button");
      imageButton.type = "button";
      imageButton.setAttribute("aria-label", "Abrir fotografía");
      imageButton.addEventListener("click", () => openLightbox(index));

      const image = document.createElement("img");
      image.src = photo.public_url;
      image.alt = photo.uploader_name ? `Fotografia compartida por ${photo.uploader_name}` : "Fotografia compartida por invitados";
      image.loading = "lazy";
      imageButton.appendChild(image);

      const caption = document.createElement("div");
      caption.className = "guest-photo-caption";

      if (photo.uploader_name) {
        const name = document.createElement("p");
        name.className = "guest-photo-name";
        name.textContent = photo.uploader_name;
        caption.appendChild(name);
      }

      if (photo.message) {
        const message = document.createElement("p");
        message.className = "guest-photo-message";
        message.textContent = photo.message;
        caption.appendChild(message);
      }

      const date = document.createElement("p");
      date.className = "guest-photo-date";
      date.textContent = formatDate(photo.created_at);
      caption.appendChild(date);

      card.append(imageButton, caption);
      gallery.appendChild(card);
    });
  }

  async function loadGallery() {
    if (document.hidden) {
      return;
    }

    const refreshButton = document.getElementById("refreshGallery");
    const status = document.getElementById("galleryStatus");
    if (refreshButton) {
      refreshButton.disabled = true;
    }
    if (status) {
      status.textContent = "Cargando galería...";
    }

    try {
      const { data: galleryData, error: galleryError } = await getSupabaseClient()
        .from("wedding_photo_uploads")
        .select("id, public_url, uploader_name, message, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (galleryError) {
        console.error("Error galería:", galleryError);
        if (status) {
          status.textContent = "No pudimos actualizar la galería en este momento.";
        }
        return;
      }

      console.log("Galería aprobada:", galleryData);
      galleryPhotos = galleryData || [];
      renderGallery();
    } catch (error) {
      console.error("Error galería:", error);
      if (status) {
        status.textContent = "No pudimos actualizar la galería en este momento.";
      }
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
      }
    }
  }

  function getLightboxCaption(photo) {
    const parts = [];
    if (photo.uploader_name) {
      parts.push(photo.uploader_name);
    }
    if (photo.message) {
      parts.push(photo.message);
    }
    if (photo.created_at) {
      parts.push(formatDate(photo.created_at));
    }
    return parts.join(" · ");
  }

  function updateLightbox() {
    const photo = galleryPhotos[lightboxIndex];
    const image = document.getElementById("lightboxImage");
    const caption = document.getElementById("lightboxCaption");
    const prev = document.getElementById("lightboxPrev");
    const next = document.getElementById("lightboxNext");

    if (!photo || !image || !caption) {
      return;
    }

    image.src = photo.public_url;
    image.alt = photo.uploader_name ? `Fotografia compartida por ${photo.uploader_name}` : "Fotografia compartida por invitados";
    caption.textContent = getLightboxCaption(photo);

    if (prev && next) {
      const disabled = galleryPhotos.length <= 1;
      prev.disabled = disabled;
      next.disabled = disabled;
    }
  }

  function openLightbox(index) {
    const lightbox = document.getElementById("photoLightbox");
    const closeButton = document.getElementById("lightboxClose");
    if (!lightbox) {
      return;
    }

    lightboxIndex = index;
    updateLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeLightbox() {
    const lightbox = document.getElementById("photoLightbox");
    if (!lightbox) {
      return;
    }

    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  function moveLightbox(direction) {
    if (!galleryPhotos.length) {
      return;
    }

    lightboxIndex = (lightboxIndex + direction + galleryPhotos.length) % galleryPhotos.length;
    updateLightbox();
  }

  function setupLightbox() {
    const lightbox = document.getElementById("photoLightbox");
    const closeButton = document.getElementById("lightboxClose");
    const prevButton = document.getElementById("lightboxPrev");
    const nextButton = document.getElementById("lightboxNext");

    if (!lightbox || !closeButton || !prevButton || !nextButton) {
      return;
    }

    closeButton.addEventListener("click", closeLightbox);
    prevButton.addEventListener("click", () => moveLightbox(-1));
    nextButton.addEventListener("click", () => moveLightbox(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        moveLightbox(-1);
      } else if (event.key === "ArrowRight") {
        moveLightbox(1);
      }
    });
  }

  function setupAutoRefresh() {
    setInterval(() => {
      if (!document.hidden) {
        loadGallery();
      }
    }, 60000);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        loadGallery();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const photoFiles = document.getElementById("photoFiles");
    const form = document.getElementById("photoUploadForm");
    const refreshButton = document.getElementById("refreshGallery");

    if (photoFiles) {
      photoFiles.addEventListener("change", handleFileSelection);
    }
    if (form) {
      form.addEventListener("submit", handleUpload);
    }
    if (refreshButton) {
      refreshButton.addEventListener("click", loadGallery);
    }

    setupLightbox();
    setupAutoRefresh();
    renderPreviews();
    loadGallery();
  });
})();
