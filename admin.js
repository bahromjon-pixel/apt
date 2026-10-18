(function () {
  "use strict";

  // ===== KONFIGURATSIYA =====
  var LOGIN = "andpedtexnikum";
  var PAROL = "and2026";
  var SESSION_KEY = "admpanel_session";
  var NEWS_KEY = "admpanel_news";
  var SETTINGS_KEY = "admpanel_gh_settings";
  var SESSION_TIMEOUT = 60 * 60 * 1000; // 1 soat

  // ===== ELEMENTLAR =====
  var loginScreen = document.getElementById("login-screen");
  var adminScreen = document.getElementById("admin-screen");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var usernameEl = document.getElementById("username");
  var passwordEl = document.getElementById("password");
  var togglePassword = document.getElementById("toggle-password");
  var eyeIcon = document.getElementById("eye-icon");

  var logoutBtn = document.getElementById("logout-btn");
  var sessionTimerEl = document.getElementById("session-timer");
  var newsTbody = document.getElementById("news-tbody");
  var newsEmpty = document.getElementById("news-empty");
  var modePill = document.getElementById("mode-pill");

  var addBtn = document.getElementById("open-add-modal");
  var newsModal = document.getElementById("news-modal");
  var modalTitle = document.getElementById("modal-title");
  var modalClose = document.getElementById("modal-close");
  var modalCancel = document.getElementById("modal-cancel");
  var newsForm = document.getElementById("news-form");
  var newsId = document.getElementById("news-id");
  var newsTitle = document.getElementById("news-title");
  var newsText = document.getElementById("news-text");
  var newsDate = document.getElementById("news-date");
  var newsImageInput = document.getElementById("news-image");
  var imagePreviewWrap = document.getElementById("image-preview-wrap");
  var imagePreview = document.getElementById("image-preview");
  var newsImageUrl = document.getElementById("news-image-url");

  var settingsBtn = document.getElementById("open-settings-modal");
  var settingsModal = document.getElementById("settings-modal");
  var settingsClose = document.getElementById("settings-close");
  var settingsCancel = document.getElementById("settings-cancel");
  var settingsForm = document.getElementById("settings-form");
  var settingsTest = document.getElementById("settings-test");
  var settingsOwner = document.getElementById("settings-owner");
  var settingsRepo = document.getElementById("settings-repo");
  var settingsBranch = document.getElementById("settings-branch");
  var tokenInput = document.getElementById("gh-token");
  var toggleToken = document.getElementById("toggle-token");
  var tokenEyeIcon = document.getElementById("token-eye-icon");
  var settingsMsg = document.getElementById("settings-msg");

  var toast = document.getElementById("toast");

  var deleteModal = document.getElementById("delete-modal");
  var deleteClose = document.getElementById("delete-close");
  var deleteCancel = document.getElementById("delete-cancel");
  var confirmDelete = document.getElementById("confirm-delete");
  var deleteTitle = document.getElementById("delete-title");

  // ===== GITHUB YORDAMCHILARI =====
  function getSiteConfig() {
    return window.SITE_CONFIG || {};
  }

  function ghConfigured() {
    var c = getSiteConfig();
    return !!(c.GH_OWNER && c.GH_REPO && c.GH_BRANCH);
  }

  function getToken() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      return s && s.token ? s.token : "";
    } catch (e) {
      return "";
    }
  }

  function setToken(t) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ token: t }));
  }

  function newsRawUrl() {
    var c = getSiteConfig();
    return (
      "https://raw.githubusercontent.com/" +
      c.GH_OWNER +
      "/" +
      c.GH_REPO +
      "/" +
      c.GH_BRANCH +
      "/" +
      (c.NEWS_PATH || "data/news.json")
    );
  }

  function rawImagePrefix() {
    var c = getSiteConfig();
    return (
      "https://raw.githubusercontent.com/" +
      c.GH_OWNER +
      "/" +
      c.GH_REPO +
      "/" +
      c.GH_BRANCH +
      "/"
    );
  }

  function apiRepo() {
    var c = getSiteConfig();
    return "https://api.github.com/repos/" + c.GH_OWNER + "/" + c.GH_REPO;
  }

  function sb64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function mimeExt(dataUrl) {
    var m = /^data:image\/([a-zA-Z0-9+\-]+);base64,/.exec(dataUrl);
    if (!m) return "jpg";
    var t = m[1].toLowerCase();
    if (t === "jpeg") return "jpg";
    if (t === "svg+xml") return "svg";
    return t;
  }

  function githubHeaders() {
    return {
      Authorization: "Bearer " + getToken(),
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    };
  }

  // ===== OMBORGICHA =====
  var cachedNews = loadLocalNews();

  function loadLocalNews() {
    try {
      var raw = localStorage.getItem(NEWS_KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalNews(list) {
    cachedNews = list;
    localStorage.setItem(NEWS_KEY, JSON.stringify(list));
  }

  // GitHub'dan yangiliklarni o'qish (tushmasa localStorage)
  function loadNews(callback) {
    callback = callback || function () {};
    if (!ghConfigured()) {
      callback(cachedNews);
      return;
    }
    fetch(newsRawUrl())
      .then(function (r) {
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then(function (data) {
        var arr = Array.isArray(data) ? data : (data && data.news) || [];
        saveLocalNews(arr);
        callback(arr);
      })
      .catch(function () {
        callback(cachedNews);
      });
  }

  // Rasmni GitHub repoga yuklash
  function uploadImage(ghPath, dataUrl, next) {
    next = next || function () {};
    var token = getToken();
    if (!ghConfigured() || !token) {
      next(false, dataUrl);
      return;
    }
    var apiPath = apiRepo() + "/contents/" + ghPath;
    var content = dataUrl.split(",")[1] || dataUrl;

    function doPut(sha) {
      var payload = {
        message: "Rasm yangilandi: " + ghPath,
        content: content,
        branch: getSiteConfig().GH_BRANCH
      };
      if (sha) payload.sha = sha;
      fetch(apiPath, { method: "PUT", headers: githubHeaders(), body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("put");
          return r.json();
        })
        .then(function () {
          next(false, rawImagePrefix() + ghPath);
        })
        .catch(function () {
          next(true, dataUrl);
        });
    }

    fetch(apiPath, { headers: githubHeaders() })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("read");
        return r.json();
      })
      .then(function (f) {
        doPut(f && f.sha ? f.sha : null);
      })
      .catch(function () {
        doPut(null);
      });
  }

  // news.json faylini GitHub'ga commit qilish
  function commitNewsJson(list, next) {
    next = next || function () {};
    var token = getToken();
    if (!ghConfigured() || !token) {
      next(false);
      return;
    }
    var apiPath = apiRepo() + "/contents/" + getSiteConfig().NEWS_PATH;
    var content = sb64(JSON.stringify({ news: list }));
    var payload = {
      message: "Yangiliklar yangilandi",
      content: content,
      branch: getSiteConfig().GH_BRANCH
    };

    function doPut(sha) {
      if (sha) payload.sha = sha;
      fetch(apiPath, { method: "PUT", headers: githubHeaders(), body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("commit");
          return r.json();
        })
        .then(function () {
          next(false);
        })
        .catch(function () {
          next(true);
        });
    }

    fetch(apiPath, { headers: githubHeaders() })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("read");
        return r.json();
      })
      .then(function (f) {
        doPut(f && f.sha ? f.sha : null);
      })
      .catch(function () {
        doPut(null);
      });
  }

  // Yangilikdan rasm faylini o'chirish (agar repo'da bo'lsa)
  function deleteImageFromRepo(item, next) {
    next = next || function () {};
    if (!ghConfigured() || !item.image) {
      next();
      return;
    }
    var prefix = rawImagePrefix();
    if (item.image.indexOf(prefix) !== 0) {
      next();
      return;
    }
    var token = getToken();
    if (!token) {
      next();
      return;
    }
    var rel = item.image.substring(prefix.length);
    var apiPath = apiRepo() + "/contents/" + rel;
    fetch(apiPath, { headers: githubHeaders() })
      .then(function (r) {
        if (r.status === 404) return null;
        return r.json();
      })
      .then(function (f) {
        if (!f || !f.sha) {
          next();
          return;
        }
        fetch(apiPath, {
          method: "DELETE",
          headers: githubHeaders(),
          body: JSON.stringify({
            message: "Rasm o'chirildi",
            sha: f.sha,
            branch: getSiteConfig().GH_BRANCH
          })
        })
          .then(function () {
            next();
          })
          .catch(function () {
            next();
          });
      })
      .catch(function () {
        next();
      });
  }

  // Umumiy saqlash: rasmlarni yuklash -> news.json commit -> localStorage cache
  function saveAll(list, done) {
    done = done || function () {};
    var c = getSiteConfig();
    var toUpload = list.filter(function (it) {
      return it.image && it.image.indexOf("data:") === 0;
    });

    function finish() {
      saveLocalNews(list);
      commitNewsJson(list, function (err) {
        done(err);
      });
    }

    if (toUpload.length === 0) {
      finish();
      return;
    }

    var idx = 0;
    function next() {
      if (idx >= toUpload.length) {
        finish();
        return;
      }
      var it = toUpload[idx++];
      var ghPath =
        (c.NEWS_IMAGES_PATH || "img/news/") +
        it.id +
        "." +
        mimeExt(it.image);
      uploadImage(ghPath, it.image, function (err, url) {
        if (url) it.image = url;
        next();
      });
    }
    next();
  }

  // ===== TOAST =====
  var toastTimer = null;
  function showToast(msg, type) {
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = msg;
    toast.className =
      "toast" +
      (type === "error" ? " error" : type === "ok" ? " ok" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 5000);
  }

  // ===== SESSION =====
  function getSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (s && s.timestamp) return s;
    } catch (e) {}
    return null;
  }

  function setSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function sessionActive() {
    var s = getSession();
    if (!s) return false;
    return Date.now() - s.timestamp < SESSION_TIMEOUT;
  }

  function updateTimer() {
    var s = getSession();
    if (!s) {
      sessionTimerEl.textContent = "--:--";
      return;
    }
    var remaining = SESSION_TIMEOUT - (Date.now() - s.timestamp);
    if (remaining <= 0) remaining = 0;
    var mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
    var ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
    sessionTimerEl.textContent = mm + ":" + ss;
    if (remaining <= 0) {
      clearSession();
      showLogin();
    }
  }

  function showLogin() {
    adminScreen.hidden = true;
    loginScreen.style.display = "flex";
    usernameEl.value = "";
    passwordEl.value = "";
    loginError.hidden = true;
  }

  function showAdmin() {
    loginScreen.style.display = "none";
    adminScreen.hidden = false;
  }

  function initView() {
    if (sessionActive()) {
      showAdmin();
    } else {
      clearSession();
      showLogin();
    }
    updateModePill();
  }

  // ===== LOGIN =====
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (usernameEl.value.trim() === LOGIN && passwordEl.value === PAROL) {
      loginError.hidden = true;
      setSession();
      showAdmin();
      updateModePill();
    } else {
      loginError.hidden = false;
    }
  });

  togglePassword.addEventListener("click", function () {
    var type = passwordEl.type === "password" ? "text" : "password";
    passwordEl.type = type;
    eyeIcon.className = type === "password" ? "fa fa-eye" : "fa fa-eye-slash";
  });

  logoutBtn.addEventListener("click", function () {
    clearSession();
    showLogin();
  });

  setInterval(updateTimer, 1000);

  // ===== JADVAL =====
  function formatDate(input) {
    if (!input) return "";
    var d = new Date(input);
    if (isNaN(d.getTime())) return input;
    var day = String(d.getDate()).padStart(2, "0");
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var year = d.getFullYear();
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return day + "." + month + "." + year + "  " + hh + ":" + mm;
  }

  function toDateTimeLocal(d) {
    var local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function generateId() {
    return "n" + Date.now() + Math.floor(Math.random() * 1000);
  }

  function renderTable() {
    var list = (cachedNews || []).slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    newsTbody.innerHTML = "";
    if (list.length === 0) {
      newsEmpty.hidden = false;
      return;
    }
    newsEmpty.hidden = true;

    list.forEach(function (item) {
      var tr = document.createElement("tr");

      var tdImg = document.createElement("td");
      tdImg.className = "image-cell";
      if (item.image) {
        var img = document.createElement("img");
        img.src = item.image;
        img.alt = item.title || "Rasm";
        tdImg.appendChild(img);
      } else {
        tdImg.innerHTML = '<div class="no-image"><i class="fa fa-image"></i></div>';
      }

      var tdTitle = document.createElement("td");
      tdTitle.className = "title-cell";
      var h4 = document.createElement("h4");
      h4.textContent = item.title || "(Sarlavhasiz)";
      var p = document.createElement("p");
      p.className = "text-preview";
      p.textContent = item.text || "";
      tdTitle.appendChild(h4);
      tdTitle.appendChild(p);

      var tdDate = document.createElement("td");
      tdDate.className = "date-cell";
      tdDate.textContent = formatDate(item.date);

      var tdActions = document.createElement("td");
      tdActions.className = "actions-cell";

      var editBtn = document.createElement("button");
      editBtn.className = "action-btn edit-btn";
      editBtn.title = "Tahrirlash";
      editBtn.innerHTML = '<i class="fa fa-edit"></i>';
      editBtn.addEventListener("click", function () {
        openEditModal(item.id);
      });

      var delBtn = document.createElement("button");
      delBtn.className = "action-btn delete-btn";
      delBtn.title = "O'chirish";
      delBtn.innerHTML = '<i class="fa fa-trash"></i>';
      delBtn.addEventListener("click", function () {
        openDeleteModal(item.id);
      });

      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);

      tr.appendChild(tdImg);
      tr.appendChild(tdTitle);
      tr.appendChild(tdDate);
      tr.appendChild(tdActions);

      newsTbody.appendChild(tr);
    });
  }

  // ===== QO'SHISH / TAHRIRLASH =====
  function openAddModal() {
    newsId.value = "";
    newsForm.reset();
    modalTitle.textContent = "Yangi yangilik";
    imagePreviewWrap.hidden = true;
    imagePreview.src = "";
    newsImageUrl.value = "";
    newsImageInput.value = "";
    newsModal.hidden = false;
  }

  function openEditModal(id) {
    var item = (cachedNews || []).find(function (x) {
      return x.id === id;
    });
    if (!item) return;

    newsId.value = item.id;
    newsTitle.value = item.title || "";
    newsText.value = item.text || "";
    newsDate.value = item.date ? toDateTimeLocal(new Date(item.date)) : "";
    newsImageUrl.value =
      item.image && item.image.indexOf("data:") !== 0 ? item.image : "";
    newsImageInput.value = "";
    if (item.image && item.image.indexOf("data:") === 0) {
      imagePreview.src = item.image;
      imagePreviewWrap.hidden = false;
    } else {
      imagePreviewWrap.hidden = true;
      imagePreview.src = "";
    }
    modalTitle.textContent = "Yangilikni tahrirlash";
    newsModal.hidden = false;
  }

  function closeModal() {
    newsModal.hidden = true;
  }

  addBtn.addEventListener("click", openAddModal);
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  newsModal.addEventListener("click", function (e) {
    if (e.target === newsModal) closeModal();
  });

  newsImageInput.addEventListener("change", function () {
    var file = newsImageInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      imagePreview.src = ev.target.result;
      imagePreviewWrap.hidden = false;
      newsImageUrl.value = "";
    };
    reader.readAsDataURL(file);
  });

  // ===== SAQLASH =====
  newsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var id = newsId.value;
    var title = newsTitle.value.trim();
    var text = newsText.value.trim();
    var date = newsDate.value;

    if (!title || !text || !date) {
      showToast("Sarlavha, matn va vaqt kiritilishi shart", "error");
      return;
    }

    var list = (cachedNews || []).slice();
    var item;

    if (id) {
      item = list.find(function (x) {
        return x.id === id;
      });
      if (!item) {
        showToast("Yangilik topilmadi", "error");
        return;
      }
      item.title = title;
      item.text = text;
      item.date = date;
    } else {
      item = {
        id: generateId(),
        title: title,
        text: text,
        date: date,
        image: ""
      };
      list.push(item);
    }

    // Rasm: yangi fayl -> base64; aks holda URL yoki mavjud tasvir
    if (newsImageInput.files && newsImageInput.files[0]) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        item.image = ev.target.result;
        saveAll(list, function (err) {
          finish(err);
        });
      };
      reader.readAsDataURL(newsImageInput.files[0]);
      return;
    }

    if (newsImageUrl.value.trim()) {
      item.image = newsImageUrl.value.trim();
    } else if (!id) {
      item.image = "";
    }

    saveAll(list, function (err) {
      finish(err);
    });

    function finish(err) {
      closeModal();
      renderTable();
      if (err) {
        showToast("O'zgarishlar faqat brauzerda saqlandi. GitHub'ga yozilmadi — token tekshiring.", "error");
      } else if (ghConfigured() && getToken()) {
        showToast("Yangilik saqlandi va GitHub'ga yuklandi", "ok");
      } else {
        showToast("Yangilik saqlandi (brauzer rejimi)", "ok");
      }
    }
  });

  // ===== O'CHIRISH =====
  var pendingDeleteId = null;

  function openDeleteModal(id) {
    var item = (cachedNews || []).find(function (x) {
      return x.id === id;
    });
    if (!item) return;
    pendingDeleteId = id;
    deleteTitle.textContent = item.title || "(Sarlavhasiz)";
    deleteModal.hidden = false;
  }

  function closeDeleteModal() {
    deleteModal.hidden = true;
    pendingDeleteId = null;
  }

  deleteClose.addEventListener("click", closeDeleteModal);
  deleteCancel.addEventListener("click", closeDeleteModal);
  deleteModal.addEventListener("click", function (e) {
    if (e.target === deleteModal) closeDeleteModal();
  });

  confirmDelete.addEventListener("click", function () {
    if (!pendingDeleteId) return;
    var id = pendingDeleteId;
    var removed = (cachedNews || []).find(function (x) {
      return x.id === id;
    });
    var list = (cachedNews || []).filter(function (x) {
      return x.id !== id;
    });
    function doSave() {
      saveAll(list, function (err) {
        closeDeleteModal();
        renderTable();
        if (err) {
          showToast("O'chirish faqat brauzerda saqlandi. GitHub'ga yozilmadi.", "error");
        } else {
          showToast("Yangilik o'chirildi", "ok");
        }
      });
    }
    if (removed && removed.image) {
      deleteImageFromRepo(removed, doSave);
    } else {
      doSave();
    }
  });

  // ===== SOZLAMALAR =====
  function updateModePill() {
    if (!ghConfigured()) {
      modePill.textContent = "Brauzer rejimi (sozlanmagan)";
      modePill.className = "mode-pill mode-local";
    } else if (getToken()) {
      modePill.textContent = "GitHub ulangan";
      modePill.className = "mode-pill mode-gh";
    } else {
      modePill.textContent = "GitHub token kiritilmagan";
      modePill.className = "mode-pill mode-warn";
    }
    var c = getSiteConfig();
    settingsOwner.value = c.GH_OWNER || "";
    settingsRepo.value = c.GH_REPO || "";
    settingsBranch.value = c.GH_BRANCH || "main";
    tokenInput.value = getToken();
  }

  function showSettingsMsg(msg, ok) {
    settingsMsg.hidden = false;
    settingsMsg.textContent = msg;
    settingsMsg.className = "settings-msg " + (ok ? "settings-msg-ok" : "settings-msg-err");
  }

  settingsBtn.addEventListener("click", function () {
    updateModePill();
    settingsMsg.hidden = true;
    settingsModal.hidden = false;
  });

  settingsClose.addEventListener("click", function () {
    settingsModal.hidden = true;
  });

  settingsCancel.addEventListener("click", function () {
    settingsModal.hidden = true;
  });

  settingsModal.addEventListener("click", function (e) {
    if (e.target === settingsModal) settingsModal.hidden = true;
  });

  toggleToken.addEventListener("click", function () {
    var type = tokenInput.type === "password" ? "text" : "password";
    tokenInput.type = type;
    tokenEyeIcon.className = type === "password" ? "fa fa-eye" : "fa fa-eye-slash";
  });

  settingsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    setToken(tokenInput.value.trim());
    updateModePill();
    showSettingsMsg("Token saqlandi.", true);
  });

  settingsTest.addEventListener("click", function () {
    if (!ghConfigured()) {
      showSettingsMsg("Avval js/site-config.js da GitHub repo ma'lumotlarini kiriting.", false);
      return;
    }
    var token = tokenInput.value.trim() || getToken();
    if (!token) {
      showSettingsMsg("Avval token kiriting.", false);
      return;
    }
    showSettingsMsg("Tekshirilmoqda...", true);
    fetch(apiRepo(), { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then(function () {
        showSettingsMsg("Ulanish muvaffaqiyatli! Token ishlaydi.", true);
      })
      .catch(function () {
        showSettingsMsg("Ulanib bo'lmadi. Repo nomi yoki token noto'g'ri.", false);
      });
  });

  // ===== BOSHLANG'ICH =====
  initView();
  loadNews(function () {
    renderTable();
  });
})();