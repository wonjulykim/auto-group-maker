// ===== 설문 페이지 로직 =====

const QUESTIONS = {
  personality: [
    "나는 모둠 활동에서 앞장서서 이끄는 역할을 즐긴다.",
    "나는 다른 사람들의 의견을 끝까지 잘 경청한다.",
    "나는 새로운 아이디어를 제안하고 시도하는 것을 좋아한다.",
    "나는 의견 충돌이 생겼을 때 중간에서 잘 중재한다.",
    "나는 계획을 세우고 규칙적으로 행동하는 편이다.",
    "나는 혼자 하는 것보다 친구들과 함께 하는 활동을 더 선호한다.",
    "나는 새로운 상황이나 변화에 빠르게 적응한다.",
    "나는 내 생각과 의견을 분명하게 표현하는 편이다.",
    "나는 팀 목표를 위해 내 개인 의견을 기꺼이 양보할 수 있다.",
    "나는 결과물을 꼼꼼하게 확인하고 마무리하는 것을 중요하게 생각한다.",
  ],
  english: [
    "나는 영어 수업이 흥미롭고 즐겁다.",
    "나는 영어로 말하는 활동이 즐겁다.",
    "나는 영어 실력이 나의 미래에 중요하다고 생각한다.",
    "나는 영어 듣기 활동에 적극적으로 참여한다.",
    "나는 영어로 된 글을 읽는 것을 좋아한다.",
    "나는 영어로 글쓰기 하는 것에 자신감이 있다.",
    "나는 영어 문법을 이해하고 공부하는 것이 흥미롭다.",
    "나는 영어권 나라의 문화에 관심이 있다.",
    "나는 수업 시간에 영어로 발표하거나 말하기 활동에 적극적으로 참여한다.",
    "나는 영어 실력을 높이기 위해 수업 외에도 스스로 노력한다.",
  ],
  cooperative: [
    "나는 모둠 활동에서 맡은 역할을 끝까지 성실하게 수행한다.",
    "나는 모둠원들과 서로 의견을 나누고 토론하는 것을 즐긴다.",
    "나는 어려운 과제가 있을 때 모둠원들과 함께 해결하려고 노력한다.",
    "나는 모둠 활동 중 이해하지 못한 내용이 있으면 모둠원에게 적극적으로 질문한다.",
    "나는 어려움을 겪고 있는 모둠원을 도와주려고 한다.",
    "나는 모둠 토론에서 다른 사람의 다양한 의견을 존중한다.",
    "나는 모둠 발표나 결과 공유에 적극적으로 참여한다.",
    "나는 모둠의 최종 결과물에 책임감을 갖고 최선을 다한다.",
    "나는 모둠 활동 후 내가 무엇을 배웠는지 스스로 돌아본다.",
    "나는 모둠 활동에 대한 피드백을 열린 마음으로 받아들인다.",
  ],
};

const LIKERT_LABELS = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];

let currentStudent = null;

// ===== 페이지 초기화 =====
function initSurveyPage() {
  const infoSection = document.getElementById('info-section');
  const surveySection = document.getElementById('survey-section');
  const completedSection = document.getElementById('completed-section');

  if (!infoSection) return;

  // URL 파라미터로 학생 정보 전달된 경우 (재설문)
  const params = new URLSearchParams(window.location.search);
  if (params.get('edit') === '1') {
    const g = params.get('g'), c = params.get('c'), n = params.get('n');
    if (g && c && n) {
      const existing = getStudent(g, c, n);
      if (existing) {
        document.getElementById('grade').value = g;
        document.getElementById('classNum').value = c;
        document.getElementById('number').value = n;
        document.getElementById('name').value = existing.name;
        document.getElementById('gender').value = existing.gender;
      }
    }
  }

  document.getElementById('info-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const grade = document.getElementById('grade').value;
    const classNum = document.getElementById('classNum').value;
    const number = parseInt(document.getElementById('number').value);
    const name = document.getElementById('name').value.trim();
    const gender = document.getElementById('gender').value;

    if (!grade || !classNum || !number || !name || !gender) {
      showToast('모든 항목을 입력해 주세요.', 'error');
      return;
    }
    if (number < 1 || number > 30) {
      showToast('번호는 1~30 사이로 입력해 주세요.', 'error');
      return;
    }

    currentStudent = { grade, classNum, number, name, gender };

    // 이미 제출한 경우 확인
    const existing = getStudent(grade, classNum, number);
    if (existing && existing.answers) {
      if (!confirm(`${name} 학생은 이미 설문을 제출했습니다.\n다시 설문하면 이전 응답이 덮어씌워집니다. 계속하시겠습니까?`)) return;
    }

    infoSection.classList.add('hidden');
    surveySection.classList.remove('hidden');
    renderSurvey();
    window.scrollTo(0, 0);
  });
}

// ===== 설문 렌더링 =====
function renderSurvey() {
  const container = document.getElementById('questions-container');
  if (!container) return;

  container.innerHTML = '';
  let questionIndex = 0;

  // 학생 정보 바
  document.getElementById('student-info-display').innerHTML = `
    <span class="student-chip">📚 ${currentStudent.grade}학년 ${currentStudent.classNum}반</span>
    <span class="student-chip">🔢 ${currentStudent.number}번</span>
    <span class="student-chip">👤 ${currentStudent.name}</span>
    <span class="student-chip">${currentStudent.gender === 'M' ? '♂ 남' : '♀ 여'}</span>
  `;

  const sections = [
    { key: 'personality', title: '성향 설문', icon: '🧠', desc: '본인의 성격과 행동 방식에 대해 솔직하게 답해주세요.' },
    { key: 'english', title: '영어에 대한 관점', icon: '📖', desc: '영어 학습과 영어에 대한 생각을 솔직하게 답해주세요.' },
    { key: 'cooperative', title: '협동학습 참여 정도', icon: '🤝', desc: '모둠 활동과 협동학습에 대한 참여 태도를 답해주세요.' },
  ];

  sections.forEach((section, sIdx) => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'survey-section';
    sectionEl.innerHTML = `
      <div class="survey-section-title">
        <span class="section-num">${sIdx + 1}</span>
        ${section.icon} ${section.title}
      </div>
      <div class="alert alert-info" style="margin-bottom:16px">
        <span>ℹ️</span> ${section.desc}
      </div>
      <div class="likert-scale-header" style="display:flex;justify-content:flex-end;gap:0;margin-bottom:8px;padding-right:4px">
        <div style="width:220px;display:flex;justify-content:space-between;font-size:.7rem;color:#64748b;font-weight:600">
          ${[1,2,3,4,5].map(n => `<span style="width:44px;text-align:center">${n}</span>`).join('')}
        </div>
      </div>
    `;

    QUESTIONS[section.key].forEach((q, qIdx) => {
      const globalIdx = questionIndex++;
      const qEl = document.createElement('div');
      qEl.className = 'question-item';
      qEl.id = `q-wrap-${globalIdx}`;

      const scale = [1,2,3,4,5].map(v => `
        <input type="radio" name="q${globalIdx}" id="q${globalIdx}_${v}" value="${v}" class="likert-option" onchange="onAnswer(${globalIdx})">
        <label for="q${globalIdx}_${v}">
          <span class="likert-btn">${v}</span>
        </label>
      `).join('');

      qEl.innerHTML = `
        <div class="question-text">
          <span class="question-num">${qIdx + 1}</span>
          <span>${q}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;font-size:.7rem;color:#94a3b8;white-space:nowrap">${LIKERT_LABELS[0]}</div>
          <div class="likert-scale" style="flex-shrink:0">${scale}</div>
          <div style="flex:1;font-size:.7rem;color:#94a3b8;white-space:nowrap;text-align:right">${LIKERT_LABELS[4]}</div>
        </div>
      `;
      sectionEl.appendChild(qEl);
    });

    container.appendChild(sectionEl);
  });

  updateProgress();
}

// ===== 답변 처리 =====
function onAnswer(idx) {
  const wrap = document.getElementById(`q-wrap-${idx}`);
  if (wrap) wrap.classList.add('answered');
  updateProgress();
}

function updateProgress() {
  const total = 30;
  let answered = 0;
  for (let i = 0; i < total; i++) {
    const checked = document.querySelector(`input[name="q${i}"]:checked`);
    if (checked) answered++;
  }
  const pct = Math.round((answered / total) * 100);
  const fill = document.getElementById('progress-fill');
  const info = document.getElementById('progress-info');
  if (fill) fill.style.width = pct + '%';
  if (info) info.textContent = `${answered} / ${total} 문항 완료 (${pct}%)`;
}

// ===== 설문 제출 =====
function submitSurvey() {
  const answers = [];
  let unanswered = [];
  for (let i = 0; i < 30; i++) {
    const checked = document.querySelector(`input[name="q${i}"]:checked`);
    if (!checked) {
      unanswered.push(i + 1);
      answers.push(null);
    } else {
      answers.push(parseInt(checked.value));
    }
  }

  if (unanswered.length > 0) {
    // 첫 번째 미답변 문항으로 스크롤
    const firstUnansweredWrap = document.getElementById(`q-wrap-${unanswered[0] - 1}`);
    if (firstUnansweredWrap) {
      firstUnansweredWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstUnansweredWrap.style.borderColor = '#ef4444';
      firstUnansweredWrap.style.background = 'rgba(239,68,68,.03)';
      setTimeout(() => {
        firstUnansweredWrap.style.borderColor = '';
        firstUnansweredWrap.style.background = '';
      }, 2000);
    }
    showToast(`${unanswered.length}개 문항에 아직 답하지 않았습니다.`, 'error');
    return;
  }

  const scores = calcScores(answers);
  const roleType = determineRoleType(answers);

  const studentData = {
    id: genStudentId(currentStudent.grade, currentStudent.classNum, currentStudent.number),
    grade: currentStudent.grade,
    classNum: currentStudent.classNum,
    number: currentStudent.number,
    name: currentStudent.name,
    gender: currentStudent.gender,
    submittedAt: new Date().toISOString(),
    answers,
    scores,
    roleType,
  };

  saveStudent(studentData);

  // 해당 클래스 모둠 결과 초기화 (새 제출로 인해 재구성 필요)
  clearGroups(currentStudent.grade, currentStudent.classNum);

  // 완료 화면 표시
  document.getElementById('survey-section').classList.add('hidden');
  const completedSection = document.getElementById('completed-section');
  completedSection.classList.remove('hidden');
  document.getElementById('completed-name').textContent = currentStudent.name;
  window.scrollTo(0, 0);
}
