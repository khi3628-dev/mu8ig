// 체형별 착장 시뮬레이터
// 몸과 옷이 같은 "y좌표 -> 반너비" 함수를 공유하도록 만들어서,
// 치수를 바꾸면 실루엣과 옷이 함께 변하게 한다.

const V = {
  headCy: 44, headR: 17, neckTop: 56, neckY: 70,
  shoulderY: 82, bustY: 118, waistY: 162, hipY: 206, crotchY: 224,
  kneeY: 302, ankleY: 384, floorY: 400,
};

const CX = 100; // 중심선

// 둘레(cm) -> 화면 반너비(px). 기본 체형이 자연스럽게 보이도록 맞춘 계수.
const toPx = {
  shoulder: cm => cm * 0.97,
  bust: cm => cm * 0.385,
  waist: cm => cm * 0.385,
  hip: cm => cm * 0.40,
};

const PRESETS = {
  hourglass: { shoulder: 39, bust: 90, waist: 64, hip: 92 },
  rectangle: { shoulder: 39, bust: 87, waist: 79, hip: 88 },
  triangle: { shoulder: 36.5, bust: 83, waist: 70, hip: 101 },
  inverted: { shoulder: 45, bust: 97, waist: 74, hip: 88 },
  round: { shoulder: 39, bust: 99, waist: 93, hip: 96 },
};

// --- 기하 -------------------------------------------------------------

function lerpAt(points, y) {
  if (y <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (y >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [y0, w0] = points[i - 1];
    const [y1, w1] = points[i];
    if (y <= y1) return w0 + (w1 - w0) * ((y - y0) / (y1 - y0));
  }
  return last[1];
}

// 목에서 사타구니까지 몸통의 반너비
function bodyW(p, y) {
  return lerpAt([
    [V.neckY, p.sw * 0.30],
    [V.neckY + 6, p.sw * 0.70],
    [V.shoulderY, p.sw],
    [V.bustY, p.bw],
    [V.waistY, p.ww],
    [V.hipY, p.hw],
    [V.crotchY, p.hw * 0.93],
  ], y);
}

// 한쪽 다리의 반너비
function legW(p, y) {
  return lerpAt([
    [V.hipY, p.hw * 0.52],
    [V.kneeY, p.hw * 0.33],
    [V.ankleY, p.hw * 0.19],
  ], y);
}

function legCenter(p, side) {
  return CX + side * p.hw * 0.46;
}

// 팔이 흐르는 바깥 기준선. 엉덩이가 넓으면 팔도 그만큼 바깥으로 벌어진다.
function armAxis(p) {
  return Math.max(p.sw + 4, p.hw * 0.90);
}

// widthFn(y)를 따라 좌우 대칭 외곽선을 만든다.
function shell(topY, hemY, widthFn, centerFn = () => CX) {
  const step = 4;
  const left = [];
  const right = [];
  for (let y = topY; y < hemY; y += step) {
    const c = centerFn(y), w = widthFn(y);
    left.push([c - w, y]);
    right.push([c + w, y]);
  }
  const c = centerFn(hemY), w = widthFn(hemY);
  left.push([c - w, hemY]);
  right.push([c + w, hemY]);
  const pts = left.concat(right.reverse());
  return 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') + ' Z';
}

// 어깨에서 endY까지 내려오는 팔/소매 한 짝
function armPath(p, side, axis, wTop, wBot, endY) {
  const o = v => CX + side * v;
  const t = V.shoulderY + 2;
  const mid = (t + endY) / 2;
  return `M ${o(axis - 1)} ${t}
    C ${o(axis + 1.5)} ${t + 26} ${o(axis + 2)} ${mid} ${o(axis)} ${endY}
    L ${o(axis - wBot)} ${endY}
    C ${o(axis - wBot - 1)} ${mid} ${o(axis - wTop)} ${t + 26} ${o(axis - wTop)} ${t} Z`;
}

// --- 옷 ---------------------------------------------------------------

const TOPS = [
  {
    id: 'tee', label: '베이직 티',
    hemY: 190, sleeveEase: 2.5, sleeveEnd: 156,
    width: (p, y) => bodyW(p, y) + 4.5,
    note: '몸선을 그대로 따라가서 허리가 있는 체형일수록 유리합니다.',
    good: ['모래시계', '사각형'], care: ['원형'],
  },
  {
    id: 'crop', label: '크롭 탑',
    hemY: 148, sleeveEase: 1.5, sleeveEnd: 138,
    width: (p, y) => bodyW(p, y) + 2,
    note: '허리선을 위로 끌어올려 다리가 길어 보이지만, 허리 둘레를 그대로 드러냅니다.',
    good: ['모래시계', '삼각형'], care: ['원형'],
  },
  {
    id: 'boxy', label: '오버핏 박시',
    hemY: 212, sleeveEase: 6, sleeveEnd: 206,
    width: p => Math.max(p.sw, p.bw, p.hw) + 8,
    note: '허리 라인을 완전히 덮습니다. 상체 부담은 줄지만 전체가 짧고 넓어 보일 수 있습니다.',
    good: ['원형'], care: ['사각형'],
  },
  {
    id: 'peplum', label: '페플럼 블라우스',
    hemY: 204, sleeveEase: 2.5, sleeveEnd: 202,
    width: (p, y) => bodyW(p, y) + 3 + Math.max(0, y - V.waistY) * 0.42,
    note: '허리를 조이고 그 아래로 퍼져서 곡선을 만들어 줍니다.',
    good: ['사각형', '역삼각형'], care: ['삼각형'],
  },
];

const BOTTOMS = [
  {
    id: 'skinny', label: '스키니 진', kind: 'pants', riseY: 176,
    width: (p, y) => legW(p, y) + 2,
    note: '하체 실루엣이 그대로 드러납니다. 상체 볼륨이 있는 체형과 균형이 좋습니다.',
    good: ['역삼각형', '사각형'], care: ['삼각형'],
  },
  {
    id: 'straight', label: '스트레이트 진', kind: 'pants', riseY: 172,
    width: (p, y) => Math.max(legW(p, y) + 3, p.hw * 0.36),
    note: '허벅지부터 일자로 떨어져 체형을 가장 덜 타는 기본형입니다.',
    good: ['모래시계', '삼각형', '사각형'], care: [],
  },
  {
    id: 'wide', label: '와이드 팬츠', kind: 'pants', riseY: 166,
    width: (p, y) => legW(p, y) + 5 + Math.max(0, y - V.crotchY) * 0.03,
    note: '허벅지 라인을 덮어 하체를 정리해 주지만 세로 길이를 잡아먹습니다.',
    good: ['삼각형', '사각형'], care: ['원형'],
  },
  {
    id: 'aline', label: 'A라인 스커트', kind: 'skirt', riseY: 158, hemY: 300,
    width: (p, y) => bodyW(p, y) + 3 + Math.max(0, y - V.hipY) * 0.30,
    note: '가장 가는 허리에서 시작해 퍼지므로 하체 볼륨을 감춰 줍니다.',
    good: ['삼각형', '사각형', '원형'], care: [],
  },
  {
    id: 'pencil', label: '펜슬 스커트', kind: 'skirt', riseY: 158, hemY: 292,
    width: (p, y) => bodyW(p, y) + 3 - Math.max(0, y - V.hipY) * 0.13,
    note: '엉덩이 곡선을 그대로 따라갑니다. 허리와 엉덩이 차이가 클수록 살아납니다.',
    good: ['모래시계', '역삼각형'], care: ['삼각형', '원형'],
  },
];

// 어깨 위쪽은 어느 옷이든 목선을 따라가게 해서 옷이 어깨 위로 솟지 않도록 한다.
function topWidthAt(top, p, y) {
  const w = top.width(p, y);
  return y < V.shoulderY ? Math.min(w, bodyW(p, y) + 2) : w;
}

// --- 체형 판별 --------------------------------------------------------

function bodyTypeOf(cm) {
  const topValue = Math.max(cm.bust, cm.shoulder * 2.3);
  const waistRatio = cm.waist / topValue;
  if (cm.hip - topValue >= 6) return '삼각형';
  if (topValue - cm.hip >= 6) return '역삼각형';
  if (waistRatio <= 0.76) return '모래시계';
  if (waistRatio >= 0.87) return '원형';
  return '사각형';
}

function verdict(garment, type) {
  if (garment.good.includes(type)) return { level: 'good', text: '잘 어울림' };
  if (garment.care.includes(type)) return { level: 'care', text: '주의' };
  return { level: 'ok', text: '무난' };
}

// --- 렌더 -------------------------------------------------------------

const $ = id => document.getElementById(id);
const SLIDERS = ['height', 'shoulder', 'bust', 'waist', 'hip'];

function readParams() {
  const cm = {};
  for (const id of SLIDERS) cm[id] = Number($(id).value);
  return {
    cm,
    sw: toPx.shoulder(cm.shoulder),
    bw: toPx.bust(cm.bust),
    ww: toPx.waist(cm.waist),
    hw: toPx.hip(cm.hip),
    scale: 0.92 + (cm.height - 150) / 40 * 0.16,
  };
}

function selected(list, name) {
  const id = document.querySelector(`input[name="${name}"]:checked`).value;
  return list.find(g => g.id === id);
}

function paths(group, ds) {
  group.innerHTML = ds.map(d => `<path d="${d}" />`).join('');
}

function render() {
  const p = readParams();
  const top = selected(TOPS, 'top');
  const bottom = selected(BOTTOMS, 'bottom');
  const axis = armAxis(p);

  // 키: 발밑을 기준으로 세로만 늘린다(둘레는 그대로 두어 비율 변화를 보여줌).
  $('scaler').setAttribute(
    'transform',
    `translate(0 ${(V.floorY * (1 - p.scale)).toFixed(2)}) scale(1 ${p.scale.toFixed(3)})`
  );

  const foot = side => {
    const c = legCenter(p, side);
    return `<ellipse cx="${c.toFixed(1)}" cy="${V.ankleY + 8}" rx="${(legW(p, V.ankleY) + 2.5).toFixed(1)}" ry="5.5" />`;
  };
  $('skin').innerHTML =
    foot(-1) + foot(1) +
    `<path d="${shell(V.hipY, V.ankleY, y => legW(p, y), () => legCenter(p, -1))}" />` +
    `<path d="${shell(V.hipY, V.ankleY, y => legW(p, y), () => legCenter(p, 1))}" />` +
    `<path d="${shell(V.neckY, V.crotchY, y => bodyW(p, y))}" />`;

  $('head').innerHTML =
    `<path d="M ${CX - 9} ${V.neckTop} L ${CX + 9} ${V.neckTop} L ${CX + 9} ${V.neckY} L ${CX - 9} ${V.neckY} Z" />` +
    `<circle cx="${CX}" cy="${V.headCy}" r="${V.headR}" />`;

  const handY = 218;
  const ARM = { top: 9, bottom: 6.5 };
  $('arms').innerHTML =
    [-1, 1].map(s =>
      `<path d="${armPath(p, s, axis, ARM.top, ARM.bottom, handY)}" />` +
      `<ellipse cx="${(CX + s * (axis - 3)).toFixed(1)}" cy="${handY + 5}" rx="4.5" ry="6" />`
    ).join('');

  const bottomPaths = bottom.kind === 'skirt'
    ? [shell(bottom.riseY, bottom.hemY, y => bottom.width(p, y))]
    : [
      shell(bottom.riseY, V.crotchY, y => bodyW(p, y) + 3),
      shell(V.crotchY - 2, V.ankleY, y => bottom.width(p, y), () => legCenter(p, -1)),
      shell(V.crotchY - 2, V.ankleY, y => bottom.width(p, y), () => legCenter(p, 1)),
    ];
  paths($('bottom'), bottomPaths);

  $('topShell').innerHTML =
    `<path d="${shell(V.neckY + 3, top.hemY, y => topWidthAt(top, p, y))}" />`;

  // 소매는 상의 몸판보다 바깥에서 시작하되, 안쪽 경계는 팔보다 안쪽이어야
  // 맨팔이 소매 옆으로 삐져나오지 않는다. 그래서 두께를 역산한다.
  const sleeveAxis = Math.max(axis, topWidthAt(top, p, V.shoulderY + 6)) + top.sleeveEase * 0.6;
  paths($('sleeves'), [-1, 1].map(s => armPath(
    p, s, sleeveAxis,
    sleeveAxis - axis + ARM.top + 1,
    sleeveAxis - axis + ARM.bottom + 1,
    top.sleeveEnd
  )));

  const type = bodyTypeOf(p.cm);
  $('bodyType').textContent = type;
  $('measures').textContent =
    `키 ${p.cm.height} · 어깨 ${p.cm.shoulder} · 가슴 ${p.cm.bust} · 허리 ${p.cm.waist} · 엉덩이 ${p.cm.hip} (cm)`;

  for (const [g, key] of [[top, 'top'], [bottom, 'bottom']]) {
    const v = verdict(g, type);
    $(`${key}-name`).textContent = g.label;
    $(`${key}-badge`).textContent = v.text;
    $(`${key}-badge`).dataset.level = v.level;
    $(`${key}-note`).textContent = g.note;
  }

  for (const id of SLIDERS) $(`${id}-out`).textContent = `${$(id).value}cm`;
}

// --- 초기화 -----------------------------------------------------------

function buildChoices(el, list, name) {
  el.innerHTML = list
    .map((g, i) => `<label><input type="radio" name="${name}" value="${g.id}"${i === 0 ? ' checked' : ''} />${g.label}</label>`)
    .join('');
}

buildChoices($('tops'), TOPS, 'top');
buildChoices($('bottoms'), BOTTOMS, 'bottom');

document.querySelector('.panel').addEventListener('input', render);

$('presets').addEventListener('click', e => {
  const key = e.target.dataset.preset;
  if (!key) return;
  for (const [id, value] of Object.entries(PRESETS[key])) $(id).value = value;
  render();
});

render();
