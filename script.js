
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
          <div>Осталось: ${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}</div>
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
