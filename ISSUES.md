# 초기 이슈 목록

각 이슈는 GitHub Issue 하나로 옮겨 붙이면 된다. 순서대로 진행하고, 완료 기준을 모두 만족해야 닫는다.

---

## #1 녹화 스튜디오

**목표** 가이드 카드 순서대로 표정 7개·낭독 6개 클립을 촬영하고 기기 내에 저장한다.

**작업**
- [ ] Vite + React + TS + Tailwind + zustand + Dexie 스캐폴드, `CLAUDE.md` 3절 폴더 구조 생성
- [ ] `getUserMedia`(video+audio) 권한 플로우, 거부 시 안내 화면
- [ ] 가이드 카드 컴포넌트: 안내 문구, 3초 카운트다운, 얼굴 프레임 안내선
- [ ] `MediaRecorder`로 webm 녹화 → Dexie `clips` 테이블에 Blob + 메타(id, kind, intended, recordedAt) 저장
- [ ] 촬영 목록 화면: 클립별 재촬영·미리보기, 세션 전체 삭제 버튼
- [ ] 낭독 세트는 화면에 문장 표시, 톤 안내 아이콘

**완료 기준**
- 새로고침 후에도 13개 클립이 IndexedDB에서 복원된다
- 권한 거부·재요청 흐름이 동작한다
- 네트워크 요청이 0건이다 (DevTools Network 탭 기준)

---

## #2 표정 분석 + 실시간 오버레이

**목표** 블렌드셰이프 시계열에서 "읽히는 감정" 확률을 계산하고, 촬영 중 실시간으로 표시한다.

**작업**
- [ ] `public/mediapipe/`에 tasks-vision wasm과 `face_landmarker.task` 배치, 로더 래퍼(`features/face/landmarker.ts`)
- [ ] `lib/emotion-mapping.ts`: `CLAUDE.md` 5절 규칙 구현 (가중합 → softmax), 기준선 차감 입력
- [ ] `lib/head-pose.ts`: 변환 행렬 → yaw/pitch/roll
- [ ] 촬영 화면 오버레이: 현재 프레임 감정 확률 바 + "지금 ~로 읽히는 중"
- [ ] 클립 저장 후 사후 분석: 프레임 샘플링(10fps) → 중앙값 → `read`, `genuineSmile`, `headPose` 저장
- [ ] vitest: 합성 블렌드셰이프 픽스처로 각 감정이 의도대로 최대값이 되는지, 기준선 차감이 동작하는지

**완료 기준**
- neutral 클립을 기준선으로 smile/angry/surprised/sad 클립의 `read[intended]`가 각각 0.5 이상 (개발자 본인 촬영 기준)
- 옆모습 클립에서 |yaw| ≥ 50°가 검출된다
- MediaPipe 로드 실패 시 앱이 죽지 않고 "분석 불가" 상태로 진행된다

---

## #3 음성 분석

**목표** 낭독 클립에서 프로소디 지표를 뽑고, 의도 톤과 읽히는 톤을 비교한다.

**작업**
- [ ] webm에서 오디오 트랙 디코드(`AudioContext.decodeAudioData`)
- [ ] `lib/prosody.ts`: 50ms 창 f0(pitchy) / RMS / 에너지 피크 기반 speechRate / pauseRatio
- [ ] neutral 낭독 2클립 평균을 기준선으로 z-score 계산, `CLAUDE.md` 6절 규칙으로 톤 판정
- [ ] 클립 메타에 `voice: {f0Mean, f0Std, f0Range, rmsMean, speechRate, pauseRatio, readTone}` 저장
- [ ] vitest: 합성 사인파·펄스 픽스처로 f0, RMS, 피크 카운트 검증

**완료 기준**
- happy/angry 낭독의 `readTone`이 의도와 일치하는 비율이 개발자 본인 기준 4/4
- 무음 클립에서 NaN 없이 안전하게 처리된다

---

## #4 MBTI 설문 + 리포트

**목표** 자기 평가 점수를 받고, v1 리포트(표현 전달도·오해 위험·톤 전달도)를 보여준다.

**작업**
- [ ] `features/survey/items.ko.ts`: 축당 8문항(역채점 4개), 5점 리커트 — 공식 MBTI 문항 사용 금지
- [ ] `lib/mbti-scoring.ts`: 응답 → 4축 0~100, 표시용 16유형 파생
- [ ] `lib/gap-metrics.ts`: 표현 전달도, 오해 위험, 톤 전달도, (impression 있을 때) 축별 gap과 객관화 지수
- [ ] 리포트 화면: 클립 썸네일 + 의도 vs 읽힘 바 차트, 오해 위험 카드, 톤 결과, "킬 패널 결과 대기 중" 플레이스홀더
- [ ] 문구 검수: "~로 읽힐 수 있습니다" 형태만 사용, 단정 문구 없음
- [ ] vitest: 채점·역채점, gap 계산

**완료 기준**
- 설문 32문항 완료 후 리포트가 1초 내 렌더된다
- `impression`이 null이면 괴리 지표 영역이 비활성으로 표시되고, 목업 값을 넣으면 계산된다

---

## #5 비전 LLM 인상 서술 + 킬 내보내기

**목표** gateway를 통해 인상 서술을 받고, `session.json`(+미디어)을 zip으로 내보낸다.

**작업**
- [ ] `features/llm/client.ts`: `VITE_LLM_GATEWAY_URL`로 이미지+텍스트 요청, 타임아웃·재시도 1회
- [ ] 대표 프레임 추출(중앙값 프레임 ± 0.5초, 3장) → 사용자 확인 다이얼로그 → 전송
- [ ] `CLAUDE.md` 9절 프롬프트 적용, 응답을 `llmImpression`에 저장, 리포트 하단에 표시
- [ ] `src/schemas/session.schema.json` 추가, `features/export/build-session.ts`로 스키마 검증 후 생성
- [ ] zip 내보내기(`fflate` 등): 미디어 포함 여부 체크박스, 파일명 `mirror-session-{date}.zip`
- [ ] 내보내기 완료 후 세션 삭제 제안 다이얼로그

**완료 기준**
- gateway를 끈 상태에서도 리포트와 내보내기가 동작한다 (`llmImpression: null`)
- 내보낸 `session.json`이 스키마 검증을 통과한다
- 킬 저장소에 "이 스키마를 읽어 `impression`을 채워 응답" 이슈를 등록할 수 있는 상태 (스키마 파일 링크 포함)
