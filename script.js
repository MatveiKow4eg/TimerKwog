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

// --- Для страницы участника ---
if(document.getElementById("startBtn")) {
  const userNumberInput = document.getElementById("userNumber");
  const startBtn = document.getElementById("startBtn");
  const timerContainer = document.getElementById("timerContainer");
  const timerDisplay = document.getElementById("timer");

  let timerInterval = null;
  let currentNumber = null;

 startBtn.onclick = () => {
  const num = userNumberInput.value.trim();
  if (!/^\d+$/.test(num)) {
    alert("Только цифры!");
    return;
  }

  if (parseInt(num) < 1 || parseInt(num) > 60) {
    alert("Можно вводить только номер от 1 до 60!");
    return;
  }

  currentNumber = num;
  db.ref(`timers/${currentNumber}`).once("value").then(snapshot => {
    if (snapshot.exists()) {
      alert("Этот номер уже используется!");
      return;
    }

    // Запускаем
    timerContainer.style.display = "block";
    startBtn.disabled = true;
    userNumberInput.disabled = true;

    db.ref(`timers/${currentNumber}`).set({
      timeLeft: 60,
      isPaused: false
    });

    listenTimer();
  });
};

    function listenTimer() {
      db.ref(`timers/${currentNumber}`).on("value", snap => {
        const data = snap.val();
        if(!data) return;
        timerDisplay.textContent = formatTime(data.timeLeft);

        if(timerInterval) clearInterval(timerInterval);

        if(!data.isPaused) {
          timerInterval = setInterval(() => {
            db.ref(`timers/${currentNumber}`).transaction(timer => {
              if(timer && timer.timeLeft > 0) {
                timer.timeLeft--;
              }
              return timer;
            });
          }, 1000);
        }
      });
    }
  }
}

// --- Для страницы админа ---
if(document.getElementById("usersTable")) {
  const usersTable = document.getElementById("usersTable");
  const pauseAllBtn = document.getElementById("pauseAllBtn");
  let allPaused = false;

  db.ref("timers").on("value", snap => {
    const data = snap.val() || {};
    usersTable.innerHTML = "";
    for(const user in data) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user}</td>
        <td>${formatTime(data[user].timeLeft)}</td>
        <td>
        <button class="delete" data-user="${user}">Удалить</button>
        <button class="rename" data-user="${user}">Переименовать</button>

          <button class="add30" data-user="${user}">+30 сек</button>
          <button class="sub30" data-user="${user}">-30 сек</button>
          <button class="reset" data-user="${user}">Сброс</button>
        </td>
      `;
      usersTable.appendChild(tr);
    }

    // Навешиваем обработчики на кнопки
    document.querySelectorAll(".delete").forEach(btn => {
  btn.onclick = () => {
    const user = btn.dataset.user;
    db.ref(`timers/${user}`).remove();
  }
});

document.querySelectorAll(".rename").forEach(btn => {
  btn.onclick = () => {
    const oldUser = btn.dataset.user;
    const newUser = prompt("Введите новый номер (1–60):", oldUser);

    if (!/^\d+$/.test(newUser) || parseInt(newUser) < 1 || parseInt(newUser) > 60) {
      alert("Недопустимый номер!");
      return;
    }

    db.ref(`timers/${newUser}`).once("value").then(snap => {
      if (snap.exists()) {
        alert("Такой номер уже используется!");
        return;
      }

      db.ref(`timers/${oldUser}`).once("value").then(dataSnap => {
        const data = dataSnap.val();
        db.ref(`timers/${newUser}`).set(data);
        db.ref(`timers/${oldUser}`).remove();
      });
    });
  };
});

    document.querySelectorAll(".add30").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).transaction(timer => {
          if(timer) {
            timer.timeLeft += 30;
          }
          return timer;
        });
      }
    });

    document.querySelectorAll(".sub30").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).transaction(timer => {
          if(timer) {
            timer.timeLeft = Math.max(0, timer.timeLeft - 30);
          }
          return timer;
        });
      }
    });

    document.querySelectorAll(".reset").forEach(btn => {
      btn.onclick = () => {
        const user = btn.dataset.user;
        db.ref(`timers/${user}`).set({
          timeLeft: 60,
          isPaused: false
        });
      }
    });
  });

  pauseAllBtn.onclick = () => {
    allPaused = !allPaused;
    db.ref("timers").once("value").then(snap => {
      const timers = snap.val() || {};
      for(const user in timers) {
        db.ref(`timers/${user}/isPaused`).set(allPaused);
      }
    });
    pauseAllBtn.textContent = allPaused ? "Старт всем" : "Пауза всем";
  }
}
