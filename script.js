
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

let currentNumber = null;
let timerInterval = null;
let timeExpiredNotified = false;

function showTimerUI(num) {
  currentNumber = num;
  document.getElementById("userIdDisplay").textContent = num;
  document.getElementById("userLabel").style.display = "block";
  document.getElementById("userNumber").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
  document.querySelector("h2").style.display = "none";
  document.getElementById("timerContainer").style.display = "block";
}

function listenTimer() {
  if (!currentNumber) return;
  db.ref(`timers/${currentNumber}`).on("value", snap => {
    const data = snap.val();
    if (!data) return;

    document.getElementById("timer").textContent = formatTime(data.timeLeft);

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

function autoStart(num) {
  db.ref("timers").once("value").then(all => {
    const allTimers = all.val() || {};

    // Проверка: если номер отсутствует, возможно был переименован
    if (!allTimers[num]) {
      const renamed = Object.entries(allTimers).find(([_, val]) => val.renamedTo === num);
      if (renamed) {
        const [newNum] = renamed;
        localStorage.setItem("userNumber", newNum);
        currentNumber = newNum;
        showTimerUI(newNum);
        listenTimer();
        watchRename(newNum);
        return;
      }

      // Реально удалён
      alert("Этот номер был удалён.");
      localStorage.removeItem("userNumber");
      return;
    }

    currentNumber = num;
    showTimerUI(num);
    listenTimer();
    watchRename(num);
  });
}

function watchRename(num) {
  db.ref(`timers/${num}`).on("value", snap => {
    const data = snap.val();
    if (!data) return;

    if (data.renamedTo && data.renamedTo !== num) {
      db.ref(`timers/${num}/renamedTo`).remove();
      localStorage.setItem("userNumber", data.renamedTo);
      currentNumber = data.renamedTo;
      showTimerUI(currentNumber);
      listenTimer();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("userNumber");
  if (saved) autoStart(saved);

  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.onclick = () => {
      const userNumberInput = document.getElementById("userNumber");
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
        watchRename(num);
      });
    };
  }
});
