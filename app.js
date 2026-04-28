// ===== 1. GRAB ALL HTML ELEMENTS =====
const subjectInput = document.getElementById('subject-input');
const addSubjectBtn = document.getElementById('add-subject-btn');
const subjectList = document.getElementById('subject-list');
const currentSubject = document.getElementById('current-subject');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const sessionLog = document.getElementById('session-log');
const totalTime = document.getElementById('total-time');

// ===== 2. APP STATE =====
// All the data our app needs to remember
let subjects = [];         // list of subjects user adds
let sessions = [];         // list of completed study sessions
let selectedSubject = '';  // which subject is currently selected
let timerInterval = null;  // holds our setInterval so we can stop it
let seconds = 0;           // counts seconds while timer runs

// ===== 3. ADD A SUBJECT =====
addSubjectBtn.addEventListener('click', function() {
  const name = subjectInput.value.trim(); // trim removes extra spaces

  // Guard clause — don't add empty subjects
  if (name === '') {
    alert('Please enter a subject name!');
    return; // stop the function here
  }

  // Don't add duplicates
  if (subjects.includes(name)) {
    alert('Subject already exists!');
    return;
  }

  subjects.push(name);        // add to our array
  subjectInput.value = '';    // clear the input
  renderSubjects();           // update the UI
  saveData();                 // save to localStorage
});

// ===== 4. RENDER SUBJECTS LIST =====
function renderSubjects() {
  subjectList.innerHTML = ''; // clear the list first

  subjects.forEach(function(subject) {
    const li = document.createElement('li');
    li.textContent = subject;

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete-btn';

    // When delete clicked
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // prevent li click from firing too
      subjects = subjects.filter(function(s) {
        return s !== subject;
      });
      saveData();
      renderSubjects();
    });

    li.appendChild(deleteBtn);

    // When clicked, select this subject
    li.addEventListener('click', function() {
      selectedSubject = subject;
      currentSubject.textContent = subject;

      // Highlight selected item
      document.querySelectorAll('#subject-list li').forEach(function(item) {
        item.style.background = '#f7fafc';
      });
      li.style.background = '#bee3f8';
    });

    subjectList.appendChild(li);
  });
}

// ===== 5. TIMER FUNCTIONS =====
startBtn.addEventListener('click', function() {
  // Guard clause — must select a subject first
  if (selectedSubject === '') {
    alert('Please select a subject first!');
    return;
  }

  // Don't start if already running
  if (timerInterval !== null) return;

  // Start counting
  timerInterval = setInterval(function() {
    seconds++;
    timerDisplay.textContent = formatTime(seconds);
  }, 1000);
});

stopBtn.addEventListener('click', function() {
  // Don't stop if timer isn't running
  if (timerInterval === null) return;

  clearInterval(timerInterval);  // stop the timer
  timerInterval = null;          // reset the handle

  // Only log if at least 1 second has passed
  if (seconds > 0) {
    const session = {
      subject: selectedSubject,
      duration: seconds,
      date: new Date().toLocaleDateString()
    };

    sessions.push(session);
    renderSessions();
    renderDailyChart();
    renderWeeklyChart();
    saveData();
  }

  // Reset timer display
  seconds = 0;
  timerDisplay.textContent = '00:00:00';
});

// ===== 6. FORMAT SECONDS INTO HH:MM:SS =====
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  // padStart makes sure numbers are always 2 digits: 5 → 05
  return (
    String(hours).padStart(2, '0') + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(secs).padStart(2, '0')
  );
}

// ===== 7. RENDER SESSIONS LOG =====
function renderSessions() {
  sessionLog.innerHTML = '';
  let totalSeconds = 0;

  // Filter only today's sessions
  const today = new Date().toLocaleDateString();
  const todaySessions = sessions.filter(function(s) {
    return s.date === today;
  });

  todaySessions.forEach(function(session) {
    const li = document.createElement('li');
    li.textContent = session.subject + ' — ' + formatTime(session.duration);
    sessionLog.appendChild(li);
    totalSeconds += session.duration;
  });

  // Update total time
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  totalTime.textContent = hours + 'h ' + minutes + 'm';
}

// ===== 8. SAVE AND LOAD FROM LOCALSTORAGE =====
function saveData() {
  localStorage.setItem('subjects', JSON.stringify(subjects));
  localStorage.setItem('sessions', JSON.stringify(sessions));
}

function loadData() {
  const savedSubjects = localStorage.getItem('subjects');
  const savedSessions = localStorage.getItem('sessions');

  if (savedSubjects) subjects = JSON.parse(savedSubjects);
  if (savedSessions) sessions = JSON.parse(savedSessions);

  renderSubjects();
  renderSessions();
  renderDailyChart();
  renderWeeklyChart();
}

// ===== 9. START THE APP =====
loadData();

// ===== 10. DAILY PIE CHART =====
function renderDailyChart() {
  // Step 1: Filter today's sessions
  const today = new Date().toLocaleDateString();
  const todaySessions = sessions.filter(function(s) {
    return s.date === today;
  });

  // Step 2: Build totals object
  // { 'Math': 2400, 'Physics': 900 }
  const totals = {};
  todaySessions.forEach(function(session) {
    if (totals[session.subject]) {
      // subject already exists → add to it
      totals[session.subject] += session.duration;
    } else {
      // subject doesn't exist yet → create it
      totals[session.subject] = session.duration;
    }
  });

  // Step 3: Check if there's any data
  const noDataMsg = document.getElementById('no-data-msg');
  if (todaySessions.length === 0) {
    noDataMsg.style.display = 'block';
    return; // stop here, nothing to chart
  }
  noDataMsg.style.display = 'none';

  // Step 4: Prepare data for Chart.js
  const labels = Object.keys(totals);     // ['Math', 'Physics']
  const data = Object.values(totals);     // [2400, 900]

  // Step 5: Draw the chart
  const ctx = document.getElementById('dailyChart').getContext('2d');

  // Destroy old chart if it exists (prevents duplicates)
  if (window.dailyChartInstance) {
    window.dailyChartInstance.destroy();
  }

  window.dailyChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#4a90e2', '#e53e3e', '#38a169',
          '#d69e2e', '#805ad5', '#dd6b20'
        ]
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            // Show time in HH:MM:SS instead of raw seconds
            label: function(context) {
              const seconds = context.raw;
              return context.label + ': ' + formatTime(seconds);
            }
          }
        }
      }
    }
  });
}

// ===== WEEKLY STACKED BAR CHART =====
function renderWeeklyChart() {

  // Step 1: Build last 7 days
  const days = [];
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toLocaleDateString());
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  // Step 2: Check if any data exists this week
  const noWeeklyMsg = document.getElementById('no-weekly-msg');
  const weekSessions = sessions.filter(function(s) {
    return days.includes(s.date);
  });

  if (weekSessions.length === 0) {
    noWeeklyMsg.style.display = 'block';
    return;
  }
  noWeeklyMsg.style.display = 'none';

  // Step 3: One color per subject
  const colors = [
    '#4a90e2', '#e53e3e', '#38a169',
    '#d69e2e', '#805ad5', '#dd6b20'
  ];

  // Step 4: Build one dataset per subject
  // Loop inside a loop — subject × day
  const datasets = subjects.map(function(subject, index) {

    // For this subject, calculate hours for each day
    const hoursPerDay = days.map(function(day) {

      // Find sessions matching this subject AND this day
      const matched = sessions.filter(function(s) {
        return s.subject === subject && s.date === day;
      });

      // Add up durations → convert to hours
      const totalSeconds = matched.reduce(function(sum, s) {
        return sum + s.duration;
      }, 0);

      return Math.round((totalSeconds / 3600) * 100) / 100;
    });

    return {
      label: subject,
      data: hoursPerDay,
      backgroundColor: colors[index % colors.length],
      borderRadius: 4
    };
  });

  // Step 5: Draw the chart
  const ctx = document.getElementById('weeklyChart').getContext('2d');

  if (window.weeklyChartInstance) {
    window.weeklyChartInstance.destroy();
  }

  window.weeklyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      scales: {
        x: { stacked: true },   // ← this makes it stacked
        y: {
          stacked: true,         // ← both axes must be stacked
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.raw + ' hrs';
            }
          }
        },
        legend: {
          display: true          // shows subject color legend
        }
      }
    }
  });
}