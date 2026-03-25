// ===== 공통 유틸리티 및 데이터 관리 =====

const DB_KEY = 'grouping_app_v1';

// ===== 데이터 구조 =====
// students: [ { id, grade, classNum, number, name, gender, submittedAt, answers: [30개], scores: { personality, english, cooperative }, role, englishTier } ]
// groups: { '1-1': [...], '1-2': [...] }  각 클래스의 모둠 결과

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { students: [], groups: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { students: [], groups: {} };
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getStudents(grade, classNum) {
  const db = loadDB();
  if (grade == null) return db.students;
  return db.students.filter(s => s.grade == grade && s.classNum == classNum);
}

function getStudent(grade, classNum, number) {
  const db = loadDB();
  return db.students.find(s => s.grade == grade && s.classNum == classNum && s.number == number) || null;
}

function saveStudent(studentData) {
  const db = loadDB();
  const idx = db.students.findIndex(s =>
    s.grade == studentData.grade &&
    s.classNum == studentData.classNum &&
    s.number == studentData.number
  );
  if (idx >= 0) {
    db.students[idx] = { ...db.students[idx], ...studentData };
  } else {
    db.students.push(studentData);
  }
  saveDB(db);
}

function deleteStudent(grade, classNum, number) {
  const db = loadDB();
  db.students = db.students.filter(s =>
    !(s.grade == grade && s.classNum == classNum && s.number == number)
  );
  // 해당 클래스 모둠 초기화
  const key = `${grade}-${classNum}`;
  delete db.groups[key];
  saveDB(db);
}

function getGroups(grade, classNum) {
  const db = loadDB();
  return db.groups[`${grade}-${classNum}`] || null;
}

function saveGroups(grade, classNum, groups) {
  const db = loadDB();
  db.groups[`${grade}-${classNum}`] = groups;
  saveDB(db);
}

function clearGroups(grade, classNum) {
  const db = loadDB();
  delete db.groups[`${grade}-${classNum}`];
  saveDB(db);
}

// ===== 점수 계산 =====
function calcScores(answers) {
  // answers: 30개 배열, 1-5 값
  // 0~9: 성향, 10~19: 영어, 20~29: 협동학습
  const personality = answers.slice(0, 10).reduce((a, b) => a + b, 0);
  const english = answers.slice(10, 20).reduce((a, b) => a + b, 0);
  const cooperative = answers.slice(20, 30).reduce((a, b) => a + b, 0);
  return { personality, english, cooperative, total: personality + english + cooperative };
}

// 역할 유형 결정 (성향 문항 세부 분석)
function determineRoleType(answers) {
  // 성향 문항 (0~9)
  // Q0(1번): 리더십  Q7(8번): 표현력  → 리더/발표자 성향
  // Q1(2번): 경청    Q3(4번): 중재    → 도우미/지지자 성향
  // Q2(3번): 아이디어 Q6(7번): 적응력 → 창의/아이디어 성향
  // Q4(5번): 계획성  Q9(10번): 꼼꼼함 → 기록자/점검자 성향
  // Q5(6번): 협동선호 Q8(9번): 배려   → 조화자 성향

  const a = answers; // 0-indexed
  const leaderScore     = (a[0] || 0) + (a[7] || 0);
  const supporterScore  = (a[1] || 0) + (a[3] || 0);
  const creativeScore   = (a[2] || 0) + (a[6] || 0);
  const recorderScore   = (a[4] || 0) + (a[9] || 0);
  const harmonizerScore = (a[5] || 0) + (a[8] || 0);

  const scores = [
    { role: 'leader', score: leaderScore },
    { role: 'supporter', score: supporterScore },
    { role: 'creative', score: creativeScore },
    { role: 'recorder', score: recorderScore },
    { role: 'harmonizer', score: harmonizerScore },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0].role;
}

const ROLE_LABELS = {
  leader: '리더',
  supporter: '도우미',
  creative: '아이디어 제안자',
  recorder: '기록자',
  harmonizer: '조화자',
  presenter: '발표자',
  checker: '점검자',
};

const ROLE_CSS = {
  leader: 'role-leader',
  supporter: 'role-supporter',
  creative: 'role-leader',
  recorder: 'role-recorder',
  harmonizer: 'role-supporter',
  presenter: 'role-presenter',
  checker: 'role-checker',
};

// 영어 실력 티어 (1=최고, 4=최하)
function getEnglishTier(englishScore, allStudents) {
  const sorted = [...allStudents].sort((a, b) => b.scores.english - a.scores.english);
  const rank = sorted.findIndex(s => s.id === allStudents.find(x => x.scores.english === englishScore)?.id);
  const n = allStudents.length;
  if (rank < n * 0.25) return 1;
  if (rank < n * 0.5)  return 2;
  if (rank < n * 0.75) return 3;
  return 4;
}

// ===== 토스트 알림 =====
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', '': 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = '.3s'; }, 2800);
  setTimeout(() => toast.remove(), 3200);
}

// ===== 점수 색상 =====
function scoreColor(score, max = 50) {
  const pct = score / max;
  if (pct >= 0.8) return '#10b981';
  if (pct >= 0.6) return '#3b82f6';
  if (pct >= 0.4) return '#f59e0b';
  return '#ef4444';
}

// ===== 학생 ID 생성 =====
function genStudentId(grade, classNum, number) {
  return `${grade}-${classNum}-${String(number).padStart(2, '0')}`;
}
