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

// === Участник ===
if (document.getElementById("startBtn")) {
  const userNumberInput = document.getElementById("userNumber");
  const startBtn = document.getElementById("startBtn");
  const timerContainer = document.getElementById("timerContainer");
  const timerDisplay = document.getElementById("timer");
  const userLabel = document.getElementById("userLabel");
  const userIdDisplay = document.getElementById("userIdDisplay");

  let timerInterval = null;
  let currentNumber = null;
  let timeExpiredNotified = false;

  const savedNumber = localStorage.getItem("userNumber");
  if (savedNumber) autoStart(savedNumber);

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

      userNumberInput.style.display = "none";
      startBtn.style.display = "none";
      document.querySelector("h2").style.display = "none";
      userLabel.style.display = "block";
      userIdDisplay.textContent = num;
      timerContainer.style.display = "block";

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

      userNumberInput.style.display = "none";
      startBtn.style.display = "none";
      document.querySelector("h2").style.display = "none";
      userLabel.style.display = "block";
      userIdDisplay.textContent = num;
      timerContainer.style.display = "block";

      listenTimer();

      db.ref(`timers/${num}`).on("value", (snap) => {
        const data = snap.val();
        if (data?.renamedTo) {
          if (localStorage.getItem("userNumber") !== data.renamedTo) {
            localStorage.setItem("userNumber", data.renamedTo);
            location.reload();
          } else {
            db.ref(`timers/${num}/renamedTo`).remove();
          }
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

// === Админ ===
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
        const newUser = prompt("Введите новый номер (1–60):", oldUser);

        if (!/^[0-9]+$/.test(newUser) || parseInt(newUser) < 1 || parseInt(newUser) > 60) {
          alert("Недопустимый номер!");
          return;
        }

        if (newUser === oldUser) return;

        db.ref(`timers/${newUser}`).once("value").then(snap => {
          if (snap.exists()) {
            alert("Такой номер уже используется!");
            return;
          }

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
        db.ref(`timers/${user}`).transaction(timer => {
          if (timer) timer.timeLeft += 30;
          return timer;
        });
      };
    });

    document.querySelectorAll(".sub30").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).transaction(timer => {
          if (timer) timer.timeLeft = Math.max(0, timer.timeLeft - 30);
          return timer;
        });
      };
    });

    document.querySelectorAll(".reset").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        if (confirm("Вы уверены, что хотите сбросить таймер участника до 10 минут?")) {
          db.ref(`timers/${user}`).set({
            timeLeft: 600,
            isPaused: true
          });
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
    pauseAllBtn.innerHTML = allPaused ? "▶ Старт всем" : "⏸ Пауза всем";
  };
}
