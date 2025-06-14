
const firebaseConfig = {
  apiKey: "AIzaSyDxYwWxD_f8e19HwxVqx7McqdE1miW7j5I",
  authDomain: "kwog-24c4c.firebaseapp.com",
  databaseURL: "https://kwog-24c4c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kwog-24c4c",
  storageBucket: "kwog-24c4c.appspot.com",
  messagingSenderId: "75932550486",
  appId: "1:75932550486:web:7a831988dfdf6d6ef542f7",
  measurementId: "G-860L10K2NS"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function showTimerUI(num) {
  const userLabel = document.getElementById("userLabel");
  const userIdDisplay = document.getElementById("userIdDisplay");
  const userNumberInput = document.getElementById("userNumber");
  const startBtn = document.getElementById("startBtn");
  const timerContainer = document.getElementById("timerContainer");

  if (!userLabel || !userIdDisplay) return;

  userLabel.style.display = "block";
  userIdDisplay.textContent = num;
  if (userNumberInput) userNumberInput.style.display = "none";
  if (startBtn) startBtn.style.display = "none";
  const heading = document.querySelector("h2");
  if (heading) heading.style.display = "none";
  timerContainer.style.display = "block";
}

// === Участник ===
if (document.getElementById("startBtn")) {
  const userNumberInput = document.getElementById("userNumber");
  const startBtn = document.getElementById("startBtn");
  const timerDisplay = document.getElementById("timer");

  let timerInterval = null;
  let currentNumber = null;
  let timeExpiredNotified = false;

  const savedNumber = localStorage.getItem("userNumber");

  window.onload = function () {
    if (savedNumber) autoStart(savedNumber);
  };

  startBtn.onclick = () => {
    const num = userNumberInput.value.trim();
    if (!/^[0-9]+$/.test(num) || parseInt(num) < 1 || parseInt(num) > 60) {
      alert("Введите номер от 1 до 60!");
      return;
    }

    db.ref("timers").once("value").then(all => {
      const allTimers = all.val() || {};
      if (Object.keys(allTimers).length >= 60) {
        alert("Максимум 60 участников!");
        return;
      }

      if (allTimers[num]) {
        alert("Этот номер уже используется!");
        return;
      }

      currentNumber = num;
      localStorage.setItem("userNumber", num);

      db.ref(`timers/${num}`).set({
        timeLeft: 600,
        isPaused: true
      });

      showTimerUI(num);
      listenTimer();
    });
  };

  function autoStart(num) {
    currentNumber = num;
    db.ref("timers").once("value").then(all => {
      const allTimers = all.val() || {};
      if (!allTimers[num]) {
        const match = Object.entries(allTimers).find(([_, val]) => val.renamedTo === num);
        if (match) {
          const [newNum] = match;
          localStorage.setItem("userNumber", newNum);
          location.reload();
          return;
        }
        alert("Этот номер удалён администратором.");
        localStorage.removeItem("userNumber");
        location.reload();
        return;
      }

      showTimerUI(num);
      listenTimer();

      db.ref(`timers/${num}`).on("value", (snap) => {
        const data = snap.val();
        if (data && data.renamedTo && data.renamedTo !== num) {
          localStorage.setItem("userNumber", data.renamedTo);
          db.ref(`timers/${num}/renamedTo`).remove();
          location.reload();
        }
      });
    });
  }

  function listenTimer() {
    db.ref(`timers/${currentNumber}`).on("value", snap => {
      const data = snap.val();
      if (!data) return;
      timerDisplay.textContent = formatTime(data.timeLeft);

      clearInterval(timerInterval);

      if (!data.isPaused) {
        timerInterval = setInterval(() => {
          db.ref(`timers/${currentNumber}`).transaction(timer => {
            if (timer && timer.timeLeft > 0) timer.timeLeft--;
            return timer;
          });
        }, 1000);
      }

      if (data.timeLeft === 0 && !timeExpiredNotified) {
        timeExpiredNotified = true;
        alert("⏰ Время вышло!");
      }
    });
  }
}
