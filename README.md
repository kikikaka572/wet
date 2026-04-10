# 🍺 Wet Your Whistle

술안주 아이템이 등장하는 브라우저 기반 벽돌깨기 게임입니다.  
별도 설치 없이 `index.html`을 열거나 GitHub Pages로 배포하면 바로 실행됩니다.

---

## 📁 파일 구조

```
wet-your-whistle/
├── index.html # 마크업 & DOM 구조
├── style.css # 스타일 (레이아웃, 오버레이, 버튼)
├── game.js # 게임 로직, 오디오, 캔버스 렌더링
└── README.md
```

---

## 🎮 조작법

| 입력 | 동작 |
|---|---|
| 마우스 이동 | 접시 패들 이동 |
| 터치 드래그 | 접시 패들 이동 |
| 클릭 / 탭 | 공 발사 |

---

## 🍗 아이템 효과

| 아이템 | 효과 | 지속 |
|---|---|---|
| 🍗 치킨 | 접시 넓어짐 또는 공 빨라짐 (랜덤) | 8 / 6초 |
| 🍕 피자 | 공 3개로 분열 | 10초 |
| 🥩 고기 | 관통샷 (벽돌 통과) | 7초 |
| 🍺 맥주 | 점수 2배 | 8초 |
| 🥘 찌개 | 공 느려짐 | 6초 |
| 🍜 라면 | 초대형 접시 | 6초 |
| 🍶 소주 | ❤️ -1 (위험!) | — |

---

## 🧱 벽돌 패턴 (레벨마다 랜덤)

풀채우기 · 체커보드 · 다이아몬드 · X자 · 피라미드 · 역피라미드 · 액자 · 지그재그 · 랜덤군집 · 가운데강화

---

## 📈 난이도 진행

- 레벨 오를수록 벽돌 **1줄씩 추가** (최대 8줄)
- 점수가 오를수록 공 **속도 서서히 증가** (하단 SPEED 게이지 표시)
- Lv.4 이상 HP 2짜리 균열 벽돌 등장

---

## 🚀 GitHub Pages 배포

```bash
# 저장소 생성 후
git init
git add .
git commit -m "🍺 Initial commit"
git remote add origin https://github.com/YOUR_ID/wet-your-whistle.git
git push -u origin main
```

저장소 Settings → Pages → Branch: `main` / `/ (root)` 선택 후 저장

---

## 🔧 기술 스택

- **Vanilla JS** (프레임워크 없음)
- **Canvas 2D API** — 게임 렌더링 및 타이틀 우주 배경
- **Web Audio API** — 트로트 BGM 및 효과음 (코드 생성)
- **localStorage** — 최대 10개 점수 기록 저장
