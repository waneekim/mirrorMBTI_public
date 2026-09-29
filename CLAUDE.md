# 자기 객관화 MBTI (가칭: mirror-mbti)

표정·말투 영상을 기기 내에서 분석해 "내가 생각하는 나"와 "타인에게 읽히는 나"의 괴리를 지표로 보여주는 브라우저 웹앱.
페르소나 패널(타인 평가)은 별도 프로젝트 **킬(kil)**이 담당하며, 이 앱은 `session.json`을 내보내 킬에 전달한다.

## 1. 절대 원칙 (위반 금지)

1. **"진짜 성격"을 판정하지 않는다.** 이 앱이 측정하는 것은 *인상(impression)* 이다.
   - 리포트 문구는 항상 "~로 읽힐 수 있습니다", "~로 보일 확률 N%" 형태. "당신은 ~한 사람입니다" 금지.
   - 관상학, 얼굴형·이목구비 기반 성격 추론 코드/프롬프트/문구를 넣지 않는다.
2. **얼굴·음성 데이터는 기기 밖으로 나가지 않는다.**
   - 영상/오디오 원본은 IndexedDB에만 저장. 서버 업로드 없음.
   - 예외 두 가지뿐: (a) 비전 LLM 호출 시 사용자가 확인한 대표 프레임 3~5장, (b) 사용자가 명시적으로 누른 "킬로 내보내기".
   - 세션 삭제 버튼은 모든 화면에서 1탭 이내로 접근 가능해야 한다.
3. **두 분석은 항상 나란히 표시한다.** 규칙 기반 수치(재현 가능)와 비전 LLM 서술(설명적)을 한쪽만 보여주지 않는다.
4. **개인 기준선(baseline) 정규화.** 모든 판정은 그 사람의 무표정·중립 낭독 클립을 기준으로 상대값을 계산한다. 절대 임계값만으로 판정하지 않는다.
5. **공식 MBTI 문항을 사용하지 않는다.** 4축 연속 점수 구조만 차용하고 문항은 자체 작성(또는 공개 OEJTS 계열 참고).

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 앱 | React 18 + TypeScript + Vite | 라우팅은 react-router |
| 상태 | zustand | 세션 상태 1개 스토어 |
| 저장 | Dexie (IndexedDB) | 클립 Blob + 분석 결과 |
| 표정 | `@mediapipe/tasks-vision` FaceLandmarker | `outputFaceBlendshapes: true`, `outputFacialTransformationMatrixes: true` |
| 음성 | Web Audio API + `pitchy` | f0, RMS, 발화 속도 |
| LLM | 기존 LLM gateway 경유 | `VITE_LLM_GATEWAY_URL`. **클라이언트에 API 키 금지** |
| 스타일 | Tailwind | 모바일 우선 |
| 테스트 | vitest | `lib/` 순수 함수는 반드시 테스트 |

MediaPipe wasm/모델 파일은 `public/mediapipe/`에 로컬 복사해 두고 로드한다 (외부 CDN 의존 최소화).

## 3. 폴더 구조

```
src/
  app/            라우트, 레이아웃
  features/
    recording/    카메라·마이크, 가이드 카드, 클립 저장
    face/         FaceLandmarker 래퍼, 블렌드셰이프 시계열 → 감정 확률
    voice/        오디오 분석, 프로소디 지표
    survey/       MBTI 4축 설문
    report/       괴리 지표 리포트 UI
    llm/          gateway 클라이언트, 인상 서술 프롬프트
    export/       session.json 생성·다운로드·삭제
  lib/            순수 함수 (emotion-mapping, prosody, mbti-scoring, gap-metrics)
  schemas/        session.schema.json
public/mediapipe/ wasm, face_landmarker.task
```

## 4. 촬영 프로토콜

각 클립 3초, 정면 얼굴 프레임 안내선 표시. 순서 고정.

**표정 세트** (`kind: "expression"`)

| id | 의도 라벨 | 안내 문구 |
|---|---|---|
| neutral | neutral | 아무 표정 없이 카메라를 보세요 (기준선) |
| smile | happy | 자연스럽게 웃어 보세요 |
| angry | angry | 화난 표정을 지어 보세요 |
| surprised | surprised | 놀란 표정을 지어 보세요 |
| sad | sad | 슬픈 표정을 지어 보세요 |
| profile_left | n/a | 왼쪽 옆모습 (헤드포즈 yaw ≈ -70°) |
| profile_right | n/a | 오른쪽 옆모습 (yaw ≈ +70°) |

**낭독 세트** (`kind: "speech"`) — 중립 문장 2개 × 톤 3개 = 6클립
- 문장 A: "오늘 회의는 세 시에 시작합니다."
- 문장 B: "그 일은 제가 처리해 두었습니다."
- 톤: neutral(기준선) → happy → angry

## 5. 표정 판정 규칙 (초기값, 튜닝 대상)

블렌드셰이프(0~1) 가중합 → softmax → 감정 확률. 기준선(neutral 클립 평균)을 뺀 값을 입력으로 사용.

```
happy     = 0.4*mouthSmileL + 0.4*mouthSmileR + 0.2*cheekSquint(L+R)/2
angry     = 0.35*browDown(L+R)/2 + 0.25*jawForward + 0.2*mouthPress(L+R)/2 + 0.2*noseSneer(L+R)/2
surprised = 0.35*eyeWide(L+R)/2 + 0.35*browInnerUp + 0.3*jawOpen
sad       = 0.4*mouthFrown(L+R)/2 + 0.3*browInnerUp + 0.3*eyeSquint(L+R)/2 (eyeWide 낮을 때)
neutral   = 1 - max(others), 하한 0
```

클립 판정 = 프레임별 확률의 중앙값(첫·끝 0.3초 제외). 판정 결과는 `read: {happy, angry, surprised, sad, neutral}`로 저장.
"진짜 웃음" 보조 지표: `cheekSquint`가 `mouthSmile`의 40% 이상이면 `genuineSmile: true`.

헤드포즈는 `facialTransformationMatrix`에서 yaw/pitch/roll 추출. 옆모습 클립은 yaw만 검증.

## 6. 음성 지표

클립당 계산: `f0Mean, f0Std, f0Range(p90-p10), rmsMean, speechRate(초당 에너지 피크 수), pauseRatio`.
톤 판정은 neutral 낭독 클립 대비 z-score 기반:
- happy: f0Std↑ (z>+0.8) 그리고 rmsMean↑
- angry: rmsMean↑↑ (z>+1.2) 그리고 speechRate↑, f0Range는 좁을 수 있음
- neutral: 모든 z가 ±0.5 이내

임계값은 `lib/prosody.ts` 상수로 두고 테스트 픽스처와 함께 조정한다.

## 7. MBTI 설문

- 4축: `EI, SN, TF, JP`. 각 축 0~100 (0=E/S/T/J, 100=I/N/F/P).
- 축당 8문항, 5점 리커트, 역채점 문항 절반. 문항은 `features/survey/items.ko.ts`에 한국어로 작성.
- 결과는 `self: {EI, SN, TF, JP}`로 저장. 16유형 문자열은 표시용으로만 파생.

## 8. 리포트 지표

| 지표 | 정의 | v1 |
|---|---|---|
| 표현 전달도 | 클립별 `read[intended]` | ✅ |
| 오해 위험 | neutral 클립에서 neutral을 제외한 최대 감정과 그 확률 | ✅ |
| 진짜 웃음 여부 | `genuineSmile` | ✅ |
| 톤 전달도 | 낭독 클립별 의도 톤 판정 일치 여부 | ✅ |
| 축별 인상 점수 | 킬 페르소나 패널 결과 `impression` | ⏳ 킬 결과 수신 후 |
| 괴리 지표 | 축별 `abs(self - impression)` | ⏳ |
| 객관화 지수 | `100 - mean(gap)` | ⏳ |

v1 리포트는 상단에 "표현 전달도/오해 위험", 하단에 비전 LLM 인상 서술을 배치하고, 인상 점수·괴리 지표 영역은 "킬 패널 결과 대기 중"으로 비워 둔다.

## 9. 비전 LLM 인상 서술

- 클립당 대표 프레임 3장(중앙값 프레임 ± 0.5초)을 사용자에게 보여주고 확인 후 gateway로 전송.
- 프롬프트 골자: "당신은 처음 보는 사람의 인상을 서술하는 관찰자입니다. 성격을 단정하지 말고, 이 표정/자세가 *어떻게 보일 수 있는지* 2문장으로 서술하세요. 외모의 매력·미추를 평가하지 마세요."
- 응답은 `llmImpression: string`으로 저장. 실패 시 리포트에 "서술 없음"으로 표시하고 앱은 정상 동작해야 한다.

## 10. 킬 전달용 session.json

스키마: `src/schemas/session.schema.json` (저장소 동봉). 요약:

```json
{
  "schemaVersion": "1.0",
  "sessionId": "uuid",
  "createdAt": "ISO8601",
  "self": { "EI": 62, "SN": 41, "TF": 55, "JP": 70 },
  "clips": [
    {
      "id": "neutral", "kind": "expression", "intended": "neutral",
      "read": { "happy": 0.05, "angry": 0.41, "surprised": 0.02, "sad": 0.12, "neutral": 0.40 },
      "genuineSmile": null, "headPose": { "yaw": 2.1, "pitch": -3.0, "roll": 0.4 },
      "voice": null, "llmImpression": "...",
      "mediaRef": "clip_neutral.webm"
    }
  ],
  "impression": null,
  "gap": null
}
```

`impression`과 `gap`은 킬 패널이 채워 되돌려주는 필드다. 킬 쪽 이슈에는 "이 스키마를 읽고 `impression.{EI,SN,TF,JP}`와 `raters[]`를 채워 응답"이라고 요청한다.
내보내기 zip = `session.json` + 클립 webm 파일들. 미디어 포함 여부는 내보내기 다이얼로그에서 사용자가 선택.

## 11. 빌드 순서

`ISSUES.md`의 #1 → #5 순서로 진행. 각 이슈는 독립적으로 머지 가능한 단위이며, 완료 기준을 만족해야 다음 이슈로 넘어간다.

## 12. 개발 규칙

- UI 문구는 한국어, 코드 식별자·커밋 메시지는 영어.
- `lib/` 함수는 부수효과 없이 작성하고 vitest로 커버. 판정 임계값 변경 시 테스트 픽스처를 함께 갱신.
- 카메라·마이크 권한 거부, MediaPipe 로드 실패, gateway 불통 — 세 경우 모두 앱이 죽지 않고 안내 화면을 보여야 한다.
- 새 판정 규칙·문구를 추가할 때 1절 원칙과 충돌하는지 먼저 확인한다.
