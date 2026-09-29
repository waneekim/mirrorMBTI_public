// Self-written items (CLAUDE.md §1.5: official MBTI items are not used).
// Only the 4-axis continuous structure is borrowed.
// `keyed: 'high'` → agreeing moves toward I/N/F/P (score 100); `'low'` items are reverse-scored.

import type { Axis } from '../../lib/mbti-scoring';

export interface SurveyItem {
  id: string;
  axis: Axis;
  keyed: 'high' | 'low';
  text: string;
}

const BY_AXIS: Record<Axis, { high: string[]; low: string[] }> = {
  EI: {
    high: [
      '여러 사람과 어울린 뒤에는 혼자 쉬는 시간이 꼭 필요하다.',
      '생각을 말로 꺼내기 전에 머릿속에서 충분히 정리하는 편이다.',
      '처음 보는 사람이 많은 자리에서는 조용히 지켜보는 편이다.',
      '주말에 약속이 없으면 오히려 반갑다.',
    ],
    low: [
      '사람들과 이야기하다 보면 에너지가 차오른다.',
      '모임에서 먼저 말을 거는 일이 어렵지 않다.',
      '생각은 말하면서 정리되는 편이다.',
      '조용한 하루가 이어지면 누군가를 만나고 싶어진다.',
    ],
  },
  SN: {
    high: [
      '지금 일보다 앞으로 일어날 가능성을 떠올리는 게 더 즐겁다.',
      '세부 절차보다 전체 원리를 먼저 이해하고 싶다.',
      '대화하다 보면 주제가 엉뚱한 방향으로 번지곤 한다.',
      '비유나 상징이 들어간 표현을 좋아한다.',
    ],
    low: [
      '구체적인 사실과 숫자가 있어야 믿음이 간다.',
      '해 본 적 있는 검증된 방법을 선호한다.',
      '설명할 때 예시와 세부 사항부터 이야기한다.',
      '눈앞의 현실적인 문제를 해결하는 데 집중하는 편이다.',
    ],
  },
  TF: {
    high: [
      '결정을 내릴 때 관련된 사람들의 기분을 먼저 생각한다.',
      '옳은 말이라도 상대가 상처받을 것 같으면 표현을 고른다.',
      '친구의 고민을 들으면 해결책보다 공감이 먼저 나온다.',
      '분위기가 어색해지는 것을 피하려고 양보하는 편이다.',
    ],
    low: [
      '감정보다 논리가 맞는지가 더 중요하다.',
      '비판을 받아도 내용이 타당하면 크게 개의치 않는다.',
      '문제를 볼 때 원인과 결과를 따져 보는 게 먼저다.',
      '공정하려면 예외 없이 같은 기준을 적용해야 한다.',
    ],
  },
  JP: {
    high: [
      '계획이 바뀌어도 크게 불편하지 않다.',
      '마감이 다가와야 집중이 잘 된다.',
      '여행은 큰 방향만 정하고 현지에서 즉흥적으로 움직이는 게 좋다.',
      '선택지를 끝까지 열어 두는 편이다.',
    ],
    low: [
      '할 일 목록을 만들고 하나씩 지우는 것이 즐겁다.',
      '약속 시간과 일정이 미리 정해져 있어야 마음이 편하다.',
      '일을 시작하기 전에 순서를 먼저 정한다.',
      '끝내지 못한 일이 있으면 계속 신경이 쓰인다.',
    ],
  },
};

const AXES: Axis[] = ['EI', 'SN', 'TF', 'JP'];

/** Fixed interleaved order: rotate axes and alternate keying so no run of same-direction items. */
export const SURVEY_ITEMS: readonly SurveyItem[] = Array.from({ length: 8 }, (_, round) =>
  AXES.map((axis, a): SurveyItem => {
    const keyed = (round + a) % 2 === 0 ? 'high' : 'low';
    const text = BY_AXIS[axis][keyed][Math.floor(round / 2)];
    return { id: `${axis}-${keyed}-${Math.floor(round / 2) + 1}`, axis, keyed, text };
  }),
).flat();

export const LIKERT = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '보통' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
] as const;
