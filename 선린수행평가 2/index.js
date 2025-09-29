import {
  listenAllNotices,
  login,
  logout,
  onAuthChange
} from "./app.js";

// --- DOM Elements ---
const calendarEl = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");

// Modals
const noticeModal = document.getElementById("noticeModal");
const calendarModal = document.getElementById("calendarModal");
const dayNoticesModal = document.getElementById("dayNoticesModal");
const loginModal = document.getElementById("loginModal");
const urgentNoticesPopup = document.getElementById("urgentNoticesPopup");
const warningModal = document.getElementById("warningModal");

// Modal-specific elements
const noticeModalClose = document.getElementById("modalClose");
const noticeModalContent = document.getElementById("noticeModalContent");
const calendarModalClose = document.getElementById("calendarModalClose");
const dayNoticesTitle = document.getElementById("dayNoticesTitle");
const dayNoticesList = document.getElementById("dayNoticesList");
const dayNoticesModalClose = document.getElementById("dayNoticesModalClose");
const loginModalClose = document.getElementById("loginModalClose");
const urgentNoticesPopupClose = document.getElementById("urgentNoticesPopupClose");
const urgentNoticesListPopupEl = document.getElementById("urgentNoticesListPopup");
const urgentNoticesPopupDontShowAgain = document.getElementById("urgentNoticesPopupDontShowAgain");
const warningMessage = document.getElementById("warningMessage");
const warningModalClose = document.getElementById("warningModalClose");
const warningModalOkBtn = document.getElementById("warningModalOkBtn");

// Buttons
const calendarToggle = document.getElementById("calendarToggle");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const showUrgentNoticesBtn = document.getElementById("showUrgentNoticesBtn");

// Forms
const loginForm = document.getElementById("loginForm");

// --- State ---
let today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let currentNotices = [];
let isAdmin = false;

// --- Utility Functions ---
function yyyy_mm_dd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysUntilDeadline(dateStr) {
  const deadline = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "마감됨";
  if (diffDays === 0) return "오늘 마감";
  if (diffDays === 1) return "내일 마감";
  return `${diffDays}일 남음`;
}

// --- Modal Handling ---
function setupModal(modal, closeBtn) {
  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.style.display = "none");
  }
}

setupModal(noticeModal, noticeModalClose);
setupModal(calendarModal, calendarModalClose);
setupModal(dayNoticesModal, dayNoticesModalClose);
setupModal(loginModal, loginModalClose);
setupModal(urgentNoticesPopup, urgentNoticesPopupClose);
setupModal(warningModal, warningModalClose);
warningModalOkBtn.addEventListener("click", () => warningModal.style.display = "none");

// Stop propagation for clicks inside noticeModalContent
if (noticeModalContent) {
  noticeModalContent.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

calendarToggle.addEventListener("click", (e) => {
  e.preventDefault();
  calendarModal.style.display = "block";
});

window.addEventListener("click", (event) => {
  [noticeModal, calendarModal, dayNoticesModal, loginModal, urgentNoticesPopup, warningModal].forEach(modal => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });
});

function showWarning(message) {
  warningMessage.textContent = message;
  warningModal.style.display = "block";
}

// --- Authentication ---
function handleAuthStateChange(user) {
  isAdmin = !!user;
  if (isAdmin) {
    adminLoginBtn.textContent = "로그아웃";
    adminLoginBtn.removeEventListener("click", openLoginModal);
    adminLoginBtn.addEventListener("click", handleLogout);
  } else {
    adminLoginBtn.textContent = "관리자 로그인";
    adminLoginBtn.removeEventListener("click", handleLogout);
    adminLoginBtn.addEventListener("click", openLoginModal);
  }
}

function openLoginModal(e) {
  if(e) e.preventDefault();
  loginModal.style.display = "block";
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    await login(email, password);
    loginModal.style.display = "none";
    loginForm.reset();
  } catch (error) {
    showWarning("로그인 실패: " + error.message);
  }
}

async function handleLogout(e) {
  e.preventDefault();
  try {
    await logout();
  } catch (error) {
    showWarning("로그아웃 실패: " + error.message);
  }
}

adminLoginBtn.addEventListener("click", openLoginModal);
loginForm.addEventListener("submit", handleLogin);
onAuthChange(handleAuthStateChange);


// --- Calendar & Notice Rendering ---
function buildCalendar(year, month) {
  calendarEl.innerHTML = "";
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay();
  const totalDays = last.getDate();
  const titleText = `📅 수행 일정 달력 - ${year}년 ${month + 1}월`;
  monthTitle.textContent = titleText;
  monthTitle.dataset.text = titleText;

  const weekdays = ["일","월","화","수","목","금","토"];
  const headerRow = document.createElement("div");
  headerRow.className = "calendar-row";
  weekdays.forEach(w => {
    const cell = document.createElement("div");
    cell.className = "calendar-weekday";
    cell.textContent = w;
    headerRow.appendChild(cell);
  });
  calendarEl.appendChild(headerRow);

  const grid = document.createElement("div");
  grid.className = "calendar-row";
  calendarEl.appendChild(grid);

  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-cell empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = yyyy_mm_dd(date);
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.dataset.date = dateStr;
    cell.innerHTML = `
      <div class="day-number">${d}</div>
      <div class="day-badges"></div>
    `;
    cell.addEventListener("click", () => showNoticesForDate(dateStr));
    grid.appendChild(cell);
  }
}

function renderNoticesOnCalendar(notices) {
  currentNotices = notices;
  document.querySelectorAll(".day-badges").forEach(el => el.innerHTML = "");
  
  notices.forEach(n => {
    if (!n.date || !n.subject || !n.title) return;
    
    const cell = document.querySelector(`.calendar-cell[data-date="${n.date}"]`);
    if (cell) {
      const badges = cell.querySelector(".day-badges");
      if (badges) {
        const b = document.createElement("div");
        b.className = "calendar-badge";
        b.textContent = `${n.subject}: ${n.title}`;
        
        const daysLeft = getDaysUntilDeadline(n.date);
        if (daysLeft.includes("마감") || ["3일","2일","1일"].some(d => daysLeft.includes(d))) {
          b.style.background = "rgba(255,0,0,0.3)";
          b.style.borderLeft = "3px solid #ff0000";
        }
        
        badges.appendChild(b);
      }
    }
  });
}

function showNoticesForDate(dateStr) {
  const filtered = currentNotices.filter(n => n.date === dateStr);
  dayNoticesTitle.textContent = `${dateStr} 공지 (${filtered.length})`;
  dayNoticesList.innerHTML = "";

  if (!filtered.length) {
    dayNoticesList.innerHTML = `<p>해당 날짜에 공지가 없습니다.</p>`;
  } else {
    filtered.forEach(n => {
      const div = document.createElement("div");
      div.className = "notice-item";
      div.innerHTML = `<strong>[${n.subject}] ${n.title}</strong><p>${n.content || ""}</p>`;
      div.addEventListener("click", () => showNoticeDetail(n));
      dayNoticesList.appendChild(div);
    });
  }
  
  dayNoticesModal.style.display = "block";
}

// --- Calendar Navigation ---
prevBtn.addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewYear--; viewMonth = 11; }
  buildCalendar(viewYear, viewMonth);
  renderNoticesOnCalendar(currentNotices);
});
nextBtn.addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewYear++; viewMonth = 0; }
  buildCalendar(viewYear, viewMonth);
  renderNoticesOnCalendar(currentNotices);
});

// --- Initial Load ---
buildCalendar(viewYear, viewMonth);
listenAllNotices(renderNoticesOnCalendar);


// --- Urgent Notices Popup ---
const renderUrgentNoticesInPopup = (notices) => {
    const urgentNotices = notices.filter(n => {
      if (!n.date) return false;
      const daysLeft = getDaysUntilDeadline(n.date);
      return daysLeft.includes("마감") || ["3일", "2일", "1일"].some(d => daysLeft.includes(d));
    });

    urgentNotices.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (urgentNotices.length === 0) {
      urgentNoticesPopup.style.display = "none";
      return;
    }

    urgentNoticesListPopupEl.innerHTML = "";

    const initialDisplayCount = 2;
    let isExpanded = false;

    function renderNotices(displayAll) {
      urgentNoticesListPopupEl.innerHTML = "";
      const noticesToRender = displayAll ? urgentNotices : urgentNotices.slice(0, initialDisplayCount);

      noticesToRender.forEach(n => {
        const div = document.createElement("div");
        div.className = "urgent-notice-item";

        const daysLeft = getDaysUntilDeadline(n.date);
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="color:#ff0000;">[${n.subject}] ${n.title}</strong>
              <div style="font-size:0.9rem;color:#ff6666;">${n.date} - ${daysLeft}</div>
            </div>
            <div style="color:#ff0000;font-weight:bold;">⚠️</div>
          </div>
        `;

        div.addEventListener("click", () => {
          showNoticeDetail(n);
        });

        urgentNoticesListPopupEl.appendChild(div);
      });

      if (urgentNotices.length > initialDisplayCount) {
        const toggleButton = document.createElement("button");
        toggleButton.className = "urgent-notice-toggle-btn";
        toggleButton.textContent = displayAll ? "간략히" : "더보기";
        toggleButton.addEventListener("click", () => {
          isExpanded = !isExpanded;
          renderNotices(isExpanded);
        });
        urgentNoticesListPopupEl.appendChild(toggleButton);
      }
    }

    renderNotices(isExpanded);
  };

const openUrgentNoticesPopup = () => {
    const dontShowAgain = localStorage.getItem("dontShowUrgentNotices");
    if (dontShowAgain !== "true") {
      urgentNoticesPopup.style.display = "block";
      listenAllNotices(renderUrgentNoticesInPopup);
    }
  };

urgentNoticesPopupDontShowAgain.addEventListener("click", () => {
  localStorage.setItem("dontShowUrgentNotices", "true");
  urgentNoticesPopup.style.display = "none";
});

if (showUrgentNoticesBtn) {
  showUrgentNoticesBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("dontShowUrgentNotices");
    openUrgentNoticesPopup();
  });
}

document.addEventListener("DOMContentLoaded", openUrgentNoticesPopup);

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    openUrgentNoticesPopup();
  }
});

function showNoticeDetail(notice) {
  console.log("Showing notice detail for:", notice);
  document.getElementById("modalTitle").textContent = DOMPurify.sanitize(notice.title);
  document.getElementById("modalSubject").textContent = DOMPurify.sanitize(notice.subject);
  document.getElementById("modalDate").textContent = DOMPurify.sanitize(notice.date);
  document.getElementById("modalContent").innerHTML = DOMPurify.sanitize((notice.content || "").replace(/\n/g, '<br>'));
  noticeModal.style.display = "block";
}