import { Link } from 'react-router-dom';
import { PROTOCOL } from '../features/recording/protocol';
import { useSessionStore } from '../features/recording/store';

export function HomePage() {
  const count = useSessionStore((s) => Object.keys(s.clips).length);
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold leading-snug">
        내가 생각하는 나와
        <br />
        타인에게 읽히는 나
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        표정 7개와 짧은 문장 낭독 6개를 촬영합니다. 이 앱은 성격을 판정하지 않고, 표정과 말투가 다른 사람에게 어떻게 읽힐 수
        있는지를 보여 줍니다.
      </p>
      <ul className="mt-6 space-y-2 rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
        <li>🔒 영상과 음성은 이 기기 안에만 저장됩니다.</li>
        <li>🗑️ 상단 "세션 삭제" 버튼으로 언제든 모두 지울 수 있습니다.</li>
        <li>⏱️ 클립당 3초, 전체 약 5분이 걸립니다.</li>
      </ul>
      <Link to="/studio" className="mt-8 block rounded-full bg-sky-500 py-3 text-center font-medium text-white">
        {count === 0 ? '촬영 시작하기' : count < PROTOCOL.length ? `이어서 촬영하기 (${count}/${PROTOCOL.length})` : '촬영 다시 보기'}
      </Link>
    </div>
  );
}
