/* ===================================================
   CASHGAME – script.js
   =================================================== */

'use strict';

// ── HELPERS ───────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── NAV SCROLL ────────────────────────────────────
(function navScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── BURGER MENU ───────────────────────────────────
(function burger() {
  const btn = $('navBurger');
  const mobile = $('navMobile');
  if (!btn || !mobile) return;
  btn.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    // animate spans
    const spans = btn.querySelectorAll('span');
    if (open) {
      spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
  // close on nav link click
  mobile.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobile.classList.remove('open');
      const spans = btn.querySelectorAll('span');
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
})();

// ── SCROLL REVEAL ─────────────────────────────────
(function scrollReveal() {
  const reveals = $$('.reveal');
  if (!reveals.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );
  reveals.forEach(el => io.observe(el));
})();

// ── SMOOTH SCROLL for anchors ─────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ═══════════════════════════════════════════════════
//  FORM PAGE LOGIC
// ═══════════════════════════════════════════════════
const sellForm = $('sellForm');
if (sellForm) {

  const emailInput    = $('email');
  const confirmInput  = $('confirm_email');
  const controllerSel = $('controller');
  const descTextarea  = $('description');
  const photoInput    = $('photos');
  const uploadArea    = $('uploadArea');
  const previews      = $('photoPreviews');
  const priceCalc     = $('priceCalc');
  const priceValue    = $('priceValue');
  const priceBarFill  = $('priceBarFill');
  const charCount     = $('charCount');
  const submitBtn     = $('submitBtn');
  const btnLoader     = $('btnLoader');
  const formSuccess   = $('formSuccess');
  const emailMatchIco = $('emailMatchIcon');

  const PRICES = {
    'DualSense PS5':   { label: '180 zł', pct: 100 },
    'DualShock 4 PS4': { label: '120 zł', pct: 67  },
    'Xbox Series':     { label: '150 zł', pct: 83  },
    'Xbox One':        { label: '110 zł', pct: 61  },
  };

  let uploadedFiles = [];

  // ── Price calculator ─────────────────────────────
  controllerSel.addEventListener('change', () => {
    const val = controllerSel.value;
    if (val && PRICES[val]) {
      priceValue.textContent = 'do ' + PRICES[val].label;
      priceBarFill.style.width = PRICES[val].pct + '%';
      priceCalc.classList.add('visible');
    } else {
      priceCalc.classList.remove('visible');
    }
    clearError('controllerError');
  });

  // ── Character counter ─────────────────────────────
  descTextarea.addEventListener('input', () => {
    const len = descTextarea.value.length;
    charCount.textContent = Math.min(len, 500);
    if (len > 500) descTextarea.value = descTextarea.value.slice(0, 500);
    if (len > 0) clearError('descriptionError');
  });

  // ── Email validation ──────────────────────────────
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  emailInput.addEventListener('input', () => {
    if (emailInput.value.length > 0) clearError('emailError');
    checkEmailMatch();
  });
  emailInput.addEventListener('blur', () => {
    if (!isValidEmail(emailInput.value)) {
      showError('emailError', 'Podaj poprawny adres email');
      emailInput.classList.add('error');
    } else {
      emailInput.classList.remove('error');
      emailInput.classList.add('valid');
    }
  });

  confirmInput.addEventListener('input', () => {
    checkEmailMatch();
    if (confirmInput.value.length > 0) clearError('confirmEmailError');
  });

  function checkEmailMatch() {
    const a = emailInput.value.trim();
    const b = confirmInput.value.trim();
    if (!b) { emailMatchIco.textContent = ''; return; }
    if (a === b && isValidEmail(a)) {
      emailMatchIco.textContent = '✓';
      emailMatchIco.style.color = '#22c55e';
      confirmInput.classList.add('valid');
      confirmInput.classList.remove('error');
    } else {
      emailMatchIco.textContent = '✕';
      emailMatchIco.style.color = '#ef4444';
      confirmInput.classList.remove('valid');
      confirmInput.classList.add('error');
    }
  }

  // ── Photo upload ──────────────────────────────────
  // Drag & drop
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  photoInput.addEventListener('change', () => {
    handleFiles(Array.from(photoInput.files));
    photoInput.value = ''; // reset so same file can be re-added if removed
  });

  function handleFiles(files) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    let errorMsg = '';

    files.forEach(file => {
      if (uploadedFiles.length >= 5) { errorMsg = 'Maksymalnie 5 zdjęć'; return; }
      if (!allowed.includes(file.type)) { errorMsg = 'Akceptowane: JPG, PNG, WEBP'; return; }
      if (file.size > 5 * 1024 * 1024) { errorMsg = `Plik "${file.name}" przekracza 5 MB`; return; }
      if (uploadedFiles.find(f => f.name === file.name && f.size === file.size)) return;
      uploadedFiles.push(file);
      addPreview(file);
    });

    if (errorMsg) showError('photosError', errorMsg);
    if (uploadedFiles.length > 0) clearError('photosError');
    syncFileInput();
  }

  function addPreview(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      thumb.dataset.name = file.name;
      thumb.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}" />
        <button class="remove-btn" type="button" aria-label="Usuń zdjęcie">✕</button>
      `;
      thumb.querySelector('.remove-btn').addEventListener('click', () => {
        uploadedFiles = uploadedFiles.filter(f => !(f.name === file.name && f.size === file.size));
        thumb.remove();
        syncFileInput();
        if (uploadedFiles.length === 0) showError('photosError', 'Dodaj co najmniej 1 zdjęcie');
      });
      previews.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  }

  function syncFileInput() {
    const dt = new DataTransfer();
    uploadedFiles.forEach(f => dt.items.add(f));
    photoInput.files = dt.files;
  }

  // ── Error helpers ─────────────────────────────────
  function showError(id, msg) {
    const el = $(id);
    if (el) el.textContent = msg;
  }
  function clearError(id) {
    const el = $(id);
    if (el) el.textContent = '';
  }

  // ── Validation ────────────────────────────────────
  function validateForm() {
    let valid = true;

    // email
    if (!isValidEmail(emailInput.value)) {
      showError('emailError', 'Podaj poprawny adres email');
      emailInput.classList.add('error');
      valid = false;
    }
    // confirm email
    if (emailInput.value.trim() !== confirmInput.value.trim()) {
      showError('confirmEmailError', 'Adresy email muszą być identyczne');
      confirmInput.classList.add('error');
      valid = false;
    }
    // controller
    if (!controllerSel.value) {
      showError('controllerError', 'Wybierz model kontrolera');
      valid = false;
    }
    // description
    if (descTextarea.value.trim().length < 5) {
      showError('descriptionError', 'Opisz problem (min. 5 znaków)');
      valid = false;
    }
    // photos
    if (uploadedFiles.length === 0) {
      showError('photosError', 'Dodaj co najmniej 1 zdjęcie');
      valid = false;
    }

    return valid;
  }

  // ── Submit ────────────────────────────────────────
  sellForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      // scroll to first error
      const firstErr = sellForm.querySelector('.field-error:not(:empty)');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.opacity = '0';
    submitBtn.querySelector('.btn-icon').style.opacity = '0';
    btnLoader.classList.remove('hidden');

    const fd = new FormData(sellForm);
    // Re-attach correct files
    fd.delete('photos[]');
    uploadedFiles.forEach(f => fd.append('photos[]', f));

    try {
      const res = await fetch(sellForm.action, { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success) {
        sellForm.classList.add('hidden');
        formSuccess.classList.remove('hidden');
        window.scrollTo({ top: formSuccess.offsetTop - 100, behavior: 'smooth' });
      } else {
        alert('Błąd: ' + (data.message || 'Spróbuj ponownie'));
      }
    } catch (err) {
      console.error(err);
      alert('Wystąpił błąd serwera. Spróbuj ponownie lub napisz na maila.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').style.opacity = '';
      submitBtn.querySelector('.btn-icon').style.opacity = '';
      btnLoader.classList.add('hidden');
    }
  });

} // end if(sellForm)

// ── PARALLAX ORBS ─────────────────────────────────
(function parallax() {
  const orbs = $$('.orb');
  if (!orbs.length) return;
  window.addEventListener('mousemove', e => {
    const mx = (e.clientX / window.innerWidth - .5) * 20;
    const my = (e.clientY / window.innerHeight - .5) * 20;
    orbs.forEach((orb, i) => {
      const factor = (i + 1) * 0.4;
      orb.style.transform = `translate(${mx * factor}px, ${my * factor}px)`;
    });
  }, { passive: true });
})();