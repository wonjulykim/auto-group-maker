// ===== 교사 대시보드 로직 =====

const TEACHER_PW = 'teacher1234'; // 기본 비밀번호 (변경 가능)

let currentView = { grade: '1', classNum: '1' };
let editingGroups = null; // 현재 편집 중인 모둠 배열

// ===== 로그인 =====
function initTeacherLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const pw = document.getElementById('teacher-pw').value;
    if (pw === TEACHER_PW) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      initDashboard();
    } else {
      document.getElementById('login-error').textContent = '비밀번호가 올바르지 않습니다.';
      document.getElementById('teacher-pw').value = '';
      document.getElementById('teacher-pw').focus();
    }
  });
}

// ===== 대시보드 초기화 =====
function initDashboard() {
  // 탭 이벤트
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      refreshCurrentTab();
    });
  });

  // 클래스 선택 이벤트
  document.querySelectorAll('.class-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.class-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView.classNum = tab.dataset.class;
      refreshCurrentTab();
    });
  });

  refreshCurrentTab();
  renderStats();
}

function refreshCurrentTab() {
  const activeTab = document.querySelector('.tab-btn.active');
  if (!activeTab) return;
  const tabId = activeTab.dataset.tab;
  if (tabId === 'tab-students') renderStudentList();
  if (tabId === 'tab-groups') renderGroupsTab();
}

// ===== 통계 =====
function renderStats() {
  const all = getStudents();
  const c1 = all.filter(s => s.classNum == '1');
  const c2 = all.filter(s => s.classNum == '2');
  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-c1').textContent = c1.length;
  document.getElementById('stat-c2').textContent = c2.length;
  const bothGrouped = (getGroups('1','1') ? 1 : 0) + (getGroups('1','2') ? 1 : 0);
  document.getElementById('stat-grouped').textContent = bothGrouped + '/2';
}

// ===== 학생 목록 탭 =====
function renderStudentList() {
  const students = getStudents(currentView.grade, currentView.classNum)
    .sort((a, b) => a.number - b.number);

  const tbody = document.getElementById('student-table-body');
  const empty = document.getElementById('student-empty');

  if (students.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = students.map(s => {
    const sc = s.scores || {};
    const gBadge = s.gender === 'M'
      ? `<span class="badge badge-gender-m">♂ 남</span>`
      : `<span class="badge badge-gender-f">♀ 여</span>`;
    const submitted = s.submittedAt
      ? new Date(s.submittedAt).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
      : '-';

    const makeBar = (score, cls) => `
      <div class="score-bar">
        <div class="score-track">
          <div class="score-fill ${cls}" style="width:${(score/50)*100}%"></div>
        </div>
        <span style="font-size:.78rem;font-weight:700;min-width:24px;text-align:right">${score}</span>
      </div>`;

    const roleLabel = s.roleType ? (ROLE_LABELS[s.roleType] || s.roleType) : '-';

    return `<tr>
      <td style="font-weight:700">${s.number}</td>
      <td>
        <div style="font-weight:600">${s.name}</div>
        <div style="font-size:.75rem;color:#94a3b8">${s.id}</div>
      </td>
      <td>${gBadge}</td>
      <td>${makeBar(sc.english || 0, 'english')}</td>
      <td>${makeBar(sc.personality || 0, 'personality')}</td>
      <td>${makeBar(sc.cooperative || 0, 'cooperative')}</td>
      <td><span style="font-size:.78rem;color:#64748b">${roleLabel}</span></td>
      <td style="font-size:.75rem;color:#94a3b8">${submitted}</td>
      <td>
        <div style="display:flex;gap:6px">
          <a href="survey.html?edit=1&g=${s.grade}&c=${s.classNum}&n=${s.number}" class="btn btn-ghost btn-sm" title="재설문">✏️</a>
          <button class="btn btn-ghost btn-sm" onclick="confirmDeleteStudent('${s.grade}','${s.classNum}','${s.number}','${s.name}')" title="삭제">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ===== 학생 삭제 =====
function confirmDeleteStudent(grade, classNum, number, name) {
  if (confirm(`${name} 학생의 데이터를 삭제하시겠습니까?\n모둠 구성 결과도 초기화됩니다.`)) {
    deleteStudent(grade, classNum, number);
    renderStudentList();
    renderStats();
    showToast(`${name} 학생 데이터가 삭제되었습니다.`);
  }
}

// ===== 모둠 구성 탭 =====
function renderGroupsTab() {
  const students = getStudents(currentView.grade, currentView.classNum);
  const existingGroups = getGroups(currentView.grade, currentView.classNum);

  const countEl = document.getElementById('group-student-count');
  if (countEl) countEl.textContent = `현재 ${students.length}명 설문 완료`;

  const generateBtn = document.getElementById('btn-generate');
  if (generateBtn) {
    generateBtn.disabled = students.length < 4;
  }

  if (existingGroups) {
    editingGroups = existingGroups;
    renderGroups(existingGroups);
    document.getElementById('groups-result').classList.remove('hidden');
    document.getElementById('groups-empty').classList.add('hidden');
  } else {
    document.getElementById('groups-result').classList.add('hidden');
    document.getElementById('groups-empty').classList.remove('hidden');
  }
}

// ===== 모둠 자동 구성 알고리즘 =====
function generateGroups() {
  const students = getStudents(currentView.grade, currentView.classNum);

  if (students.length < 4) {
    showToast('설문을 완료한 학생이 4명 미만입니다.', 'error');
    return;
  }

  // 1) 학생별 점수 계산 및 정렬 준비
  const processed = students.map(s => ({
    ...s,
    engScore: s.scores?.english || 0,
    perScore: s.scores?.personality || 0,
    cooScore: s.scores?.cooperative || 0,
  }));

  // 목표 모둠 수 = 4 (5인 기준), 학생이 20명 이상이면 4모둠 고정
  const TARGET_GROUPS = 4;
  const groups = Array.from({ length: TARGET_GROUPS }, () => []);

  // 2) 영어 점수로 정렬 후 스네이크 드래프트
  const sorted = [...processed].sort((a, b) => b.engScore - a.engScore);

  // 스네이크 드래프트 순서 생성 (4그룹 기준)
  // R1: 0→G0, 1→G1, 2→G2, 3→G3
  // R2: 4→G3, 5→G2, 6→G1, 7→G0 (역방향)
  // R3: 8→G0, ...
  sorted.forEach((student, idx) => {
    const round = Math.floor(idx / TARGET_GROUPS);
    const pos = idx % TARGET_GROUPS;
    const groupIdx = round % 2 === 0 ? pos : (TARGET_GROUPS - 1 - pos);
    groups[groupIdx].push({ ...student });
  });

  // 3) 성별 균형 최적화 (스왑)
  optimizeGenderBalance(groups);

  // 4) 각 모둠 내 역할 배정
  groups.forEach(group => assignRoles(group));

  // 5) 저장 및 렌더링
  const result = groups.map((members, i) => ({
    groupNum: i + 1,
    members,
    avgEnglish: avg(members.map(m => m.engScore)),
    avgCooperative: avg(members.map(m => m.cooScore)),
    avgPersonality: avg(members.map(m => m.perScore)),
  }));

  saveGroups(currentView.grade, currentView.classNum, result);
  editingGroups = result;
  renderGroups(result);
  document.getElementById('groups-result').classList.remove('hidden');
  document.getElementById('groups-empty').classList.add('hidden');
  renderStats();
  showToast('모둠 구성이 완료되었습니다! 🎉', 'success');
}

// ===== 성별 균형 최적화 =====
function optimizeGenderBalance(groups) {
  // 각 모둠의 성별 비율을 최대한 균형 있게 조정
  // 목표: 각 모둠에 남녀가 최소 1명 이상, 가능하면 2:3 또는 3:2 비율

  const maxIterations = 200;
  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        // 두 모둠 간 스왑이 성별 균형을 개선하는지 확인
        const beforeScore = genderImbalanceScore(groups[i]) + genderImbalanceScore(groups[j]);

        for (let mi = 0; mi < groups[i].length; mi++) {
          for (let mj = 0; mj < groups[j].length; mj++) {
            if (groups[i][mi].gender !== groups[j][mj].gender) {
              // 스왑 시도
              const temp = groups[i][mi];
              groups[i][mi] = groups[j][mj];
              groups[j][mj] = temp;

              const afterScore = genderImbalanceScore(groups[i]) + genderImbalanceScore(groups[j]);
              if (afterScore < beforeScore) {
                improved = true;
                break; // 개선되면 유지
              } else {
                // 원복
                groups[j][mj] = groups[i][mi];
                groups[i][mi] = temp;
              }
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }
    if (!improved) break;
  }
}

function genderImbalanceScore(group) {
  const mCount = group.filter(s => s.gender === 'M').length;
  const fCount = group.filter(s => s.gender === 'F').length;
  // 모둠 크기에 따른 이상적 비율에서의 편차
  const ideal = group.length / 2;
  return Math.abs(mCount - ideal);
}

// ===== 모둠 내 역할 배정 =====
function assignRoles(members) {
  // 역할 목록 (모둠 구성원 수에 맞게)
  const roles = ['leader', 'presenter', 'recorder', 'supporter', 'checker'];

  // 각 구성원의 역할 적합도 점수 계산
  const roleScores = members.map(m => {
    const a = m.answers || Array(30).fill(3);
    return {
      member: m,
      leader:    (a[0] || 3) + (a[7] || 3),                          // 리더십 + 표현력
      presenter: (a[7] || 3) + (m.engScore ? m.engScore / 10 : 3),   // 표현력 + 영어 점수
      recorder:  (a[4] || 3) + (a[9] || 3),                          // 계획성 + 꼼꼼함
      supporter: (a[1] || 3) + (a[3] || 3) + (a[8] || 3),            // 경청 + 중재 + 배려
      checker:   (a[4] || 3) + (a[3] || 3) + (m.cooScore ? m.cooScore / 10 : 3), // 계획 + 중재 + 협동
    };
  });

  // 헝가리안 알고리즘 대신 탐욕적 배정
  const assignedRoles = new Array(members.length).fill(null);
  const usedRoles = new Set();

  // 가장 적합한 역할부터 배정
  const assignments = [];
  roleScores.forEach((rs, idx) => {
    roles.forEach(role => {
      assignments.push({ memberIdx: idx, role, score: rs[role] });
    });
  });
  assignments.sort((a, b) => b.score - a.score);

  const usedMembers = new Set();
  for (const assign of assignments) {
    if (!usedMembers.has(assign.memberIdx) && !usedRoles.has(assign.role)) {
      assignedRoles[assign.memberIdx] = assign.role;
      usedMembers.add(assign.memberIdx);
      usedRoles.add(assign.role);
    }
    if (usedMembers.size === members.length) break;
  }

  // 혹시 배정 안 된 멤버에게 남은 역할 부여
  const remainingRoles = roles.filter(r => !usedRoles.has(r));
  members.forEach((m, idx) => {
    if (!assignedRoles[idx]) {
      assignedRoles[idx] = remainingRoles.shift() || 'supporter';
    }
    m.assignedRole = assignedRoles[idx];
  });
}

// ===== 모둠 렌더링 =====
function renderGroups(groups) {
  const container = document.getElementById('groups-grid');
  if (!container) return;

  const classLabel = `${currentView.grade}학년 ${currentView.classNum}반`;
  const colorClasses = ['group-1', 'group-2', 'group-3', 'group-4'];
  const groupIcons = ['⭐', '🚀', '🌿', '🔥'];

  container.innerHTML = groups.map((g, gIdx) => {
    const mCount = g.members.filter(m => m.gender === 'M').length;
    const fCount = g.members.filter(m => m.gender === 'F').length;

    const memberRows = g.members.map(m => {
      const roleLabel = ROLE_LABELS[m.assignedRole] || '구성원';
      const roleCss = ROLE_CSS[m.assignedRole] || 'role-supporter';
      const avatarCss = m.gender === 'M' ? 'avatar-m' : 'avatar-f';
      const genderIcon = m.gender === 'M' ? '♂' : '♀';
      return `
        <div class="member-row">
          <div class="member-avatar ${avatarCss}">${genderIcon}${m.number}</div>
          <div class="member-info">
            <div class="member-name">${m.name}</div>
            <div class="member-meta">
              영어 ${m.engScore}점 · 협동 ${m.cooScore}점
            </div>
          </div>
          <span class="member-role ${roleCss}">${roleLabel}</span>
        </div>`;
    }).join('');

    return `
      <div class="group-card ${colorClasses[gIdx]}">
        <div class="group-header">
          <div class="group-name">${groupIcons[gIdx]} ${gIdx + 1}모둠</div>
          <div class="group-stats">
            <span>♂${mCount} ♀${fCount}</span>
            <span>${g.members.length}명</span>
          </div>
        </div>
        <div class="group-body">${memberRows}</div>
        <div class="group-scores">
          <div class="group-score-item">
            <span class="group-score-label">📖 영어 평균</span>
            <span class="group-score-value">${g.avgEnglish.toFixed(1)}점</span>
          </div>
          <div class="group-score-item">
            <span class="group-score-label">🤝 협동 평균</span>
            <span class="group-score-value">${g.avgCooperative.toFixed(1)}점</span>
          </div>
          <div class="group-score-item">
            <span class="group-score-label">🧠 성향 평균</span>
            <span class="group-score-value">${g.avgPersonality.toFixed(1)}점</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===== 모둠 초기화 =====
function resetGroups() {
  if (!confirm('현재 반의 모둠 구성 결과를 초기화하시겠습니까?')) return;
  clearGroups(currentView.grade, currentView.classNum);
  editingGroups = null;
  document.getElementById('groups-result').classList.add('hidden');
  document.getElementById('groups-empty').classList.remove('hidden');
  showToast('모둠 구성이 초기화되었습니다.');
}

// ===== 인쇄 =====
function printGroups() {
  window.print();
}

// ===== 전체 데이터 내보내기 (JSON) =====
function exportData() {
  const db = loadDB();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `모둠구성_데이터_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('데이터가 내보내기 되었습니다.', 'success');
}

// ===== 데이터 가져오기 (JSON) =====
function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.students) throw new Error('올바른 형식이 아닙니다.');
      if (!confirm(`${data.students.length}명의 학생 데이터를 불러옵니다. 기존 데이터가 덮어씌워집니다. 계속하시겠습니까?`)) return;
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      initDashboard();
      showToast('데이터를 불러왔습니다.', 'success');
    } catch (err) {
      showToast('파일 형식이 올바르지 않습니다.', 'error');
    }
  };
  reader.readAsText(file);
}

// ===== 전체 데이터 삭제 =====
function clearAllData() {
  if (!confirm('⚠️ 모든 학생 데이터와 모둠 구성 결과가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?')) return;
  if (!confirm('정말로 전체 데이터를 삭제하시겠습니까?')) return;
  localStorage.removeItem(DB_KEY);
  initDashboard();
  showToast('전체 데이터가 삭제되었습니다.', 'error');
}

// ===== 유틸 =====
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
