// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDxYwWxD_f8e19HwxVqx7McqdE1miW7j5I",
  authDomain: "kwog-24c4c.firebaseapp.com",
  databaseURL: "https://kwog-24c4c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kwog-24c4c",
  storageBucket: "kwog-24c4c.firebasestorage.app",
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

// --- Участник ---
if (document.getElementById("startBtn")) {
  const userInput = document.getElementById("userNumber");
  const startBtn = document.getElementById("startBtn");
  const userLabel = document.getElementById("userLabel");
  const userIdDisplay = document.getElementById("userIdDisplay");
  const timerContainer = document.getElementById("timerContainer");
  const timerDisplay = document.getElementById("timer");

  let timerInterval = null;
  let currentNumber = null;
  let timeExpiredNotified = false;

  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("userNumber");
    if (saved) autoStart(saved);
  });

  startBtn.onclick = () => {
    const num = userInput.value.trim();
    if (!/^\d+$/.test(num) || +num < 1 || +num > 60) {
      alert("Введите номер от 1 до 60!");
      return;
    }

    db.ref("timers").once("value").then(all => {
      const timers = all.val() || {};
      if (Object.keys(timers).length >= 60) return alert("Уже 60 участников.");
      if (timers[num]) return alert("Этот номер занят.");

      currentNumber = num;
      localStorage.setItem("userNumber", num);
      db.ref(`timers/${num}`).set({ timeLeft: 600, isPaused: true });

      showUI(num);
      listenTimer(num);
    });
  };

  function autoStart(num) {
    currentNumber = num;
    db.ref(`timers/${num}`).once("value").then(snap => {
      const data = snap.val();
      if (!data) {
        db.ref("timers").once("value").then(allSnap => {
          const all = allSnap.val() || {};
          const found = Object.entries(all).find(([key, val]) => val.renamedTo === num);
          if (found) {
            const [newNum] = found;
            localStorage.setItem("userNumber", newNum);
            autoStart(newNum);
          } else {
            alert("Номер был удалён.");
            localStorage.removeItem("userNumber");
            location.reload();
          }
        });
        return;
      }

      showUI(num);
      listenTimer(num);

      db.ref(`timers/${num}`).on("value", snap => {
        const data = snap.val();
        if (data?.renamedTo && data.renamedTo !== num) {
          db.ref(`timers/${num}/renamedTo`).remove();
          localStorage.setItem("userNumber", data.renamedTo);
          autoStart(data.renamedTo);
        }
      });
    });
  }

  function listenTimer(num) {
    db.ref(`timers/${num}`).on("value", snap => {
      const data = snap.val();
      if (!data) return;

      timerDisplay.textContent = formatTime(data.timeLeft);
      clearInterval(timerInterval);

      if (!data.isPaused) {
        timerInterval = setInterval(() => {
          db.ref(`timers/${num}`).transaction(t => {
            if (t && t.timeLeft > 0) t.timeLeft--;
            return t;
          });
        }, 1000);
      }

      if (data.timeLeft === 0 && !timeExpiredNotified) {
        timeExpiredNotified = true;
        alert("⏰ Время вышло!");
      }
    });
  }

  function showUI(num) {
    userInput.style.display = "none";
    startBtn.style.display = "none";
    document.querySelector("h2").style.display = "none";
    userLabel.style.display = "block";
    userIdDisplay.textContent = num;
    timerContainer.style.display = "block";
  }
}

// --- Админ ---
if (document.getElementById("usersTable")) {
  const usersTable = document.getElementById("usersTable");
  const pauseAllBtn = document.getElementById("pauseAllBtn");
  let allPaused = false;

  db.ref("timers").on("value", snap => {
    const data = snap.val() || {};
    usersTable.innerHTML = "";

    for (const user in data) {
      const timeLeft = data[user].timeLeft;
      let color = "green";
      if (timeLeft === 0) color = "red";
      else if (timeLeft < 300) color = "yellow";

      const indicator = `<span class="indicator ${color}"></span>`;
      const isPaused = data[user].isPaused;
      const pauseText = isPaused ? "▶" : "⏸";

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="info">
          <div>${indicator}<strong>Участник ${user}</strong></div>
          <div>Осталось: ${formatTime(timeLeft)}</div>
        </div>
        <div class="actions">
          <button class="delete" data-user="${user}">❌</button>
          <button class="rename" data-user="${user}">✏</button>
          <button class="pause" data-user="${user}">${pauseText}</button>
          <button class="add30" data-user="${user}">+30</button>
          <button class="sub30" data-user="${user}">-30</button>
          <button class="reset" data-user="${user}">🔄</button>
        </div>
      `;
      usersTable.appendChild(card);
    }

    document.querySelectorAll(".delete").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).remove();
      };
    });

    document.querySelectorAll(".rename").forEach(btn => {
      btn.onclick = () => {
        const oldUser = btn.dataset.user;
        const newUser = prompt("Новый номер (1–60):", oldUser);
        if (!/^\d+$/.test(newUser) || +newUser < 1 || +newUser > 60) return alert("Неверный номер!");
        if (newUser === oldUser) return;

        db.ref(`timers/${newUser}`).once("value").then(snap => {
          if (snap.exists()) return alert("Такой номер уже занят.");
          db.ref(`timers/${oldUser}`).once("value").then(dataSnap => {
            const data = dataSnap.val();
            if (!data) return;
            db.ref(`timers/${newUser}`).set({ ...data, renamedTo: oldUser });
            db.ref(`timers/${oldUser}`).remove();
          });
        });
      };
    });

    document.querySelectorAll(".pause").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}/isPaused`).once("value").then(snap => {
          db.ref(`timers/${user}/isPaused`).set(!snap.val());
        });
      };
    });

    document.querySelectorAll(".add30").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).transaction(t => {
          if (t) t.timeLeft += 30;
          return t;
        });
      };
    });

    document.querySelectorAll(".sub30").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).transaction(t => {
          if (t) t.timeLeft = Math.max(0, t.timeLeft - 30);
          return t;
        });
      };
    });

    document.querySelectorAll(".reset").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        if (confirm("Сбросить таймер до 10 минут?")) {
          db.ref(`timers/${user}`).set({ timeLeft: 600, isPaused: true });
        }
      };
    });
  });

  pauseAllBtn.onclick = () => {
    allPaused = !allPaused;
    db.ref("timers").once("value").then(snap => {
      const timers = snap.val() || {};
      for (const user in timers) {
        db.ref(`timers/${user}/isPaused`).set(allPaused);
      }
    });
    pauseAllBtn.textContent = allPaused ? "▶ Старт всем" : "⏸ Пауза всем";
  };
}
