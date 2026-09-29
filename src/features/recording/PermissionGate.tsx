import type { ReactNode } from 'react';
import type { MediaStatus } from './useMediaStream';

const MESSAGES: Record<Exclude<MediaStatus, 'granted'>, { title: string; body: string; retry: boolean }> = {
  idle: {
    title: '카메라와 마이크가 필요합니다',
    body: '표정과 말투를 촬영하려면 카메라·마이크 권한이 필요합니다. 촬영한 영상은 이 기기(브라우저) 안에만 저장되며 서버로 전송되지 않습니다.',
    retry: true,
  },
  requesting: {
    title: '권한을 요청하는 중…',
    body: '브라우저 상단의 권한 요청 창에서 "허용"을 눌러 주세요.',
    retry: false,
  },
  denied: {
    title: '카메라·마이크 권한이 거부되었습니다',
    body: '주소창 왼쪽의 자물쇠(또는 카메라) 아이콘을 눌러 카메라와 마이크를 "허용"으로 바꾼 뒤 아래 버튼을 눌러 주세요. 설정을 바꾸면 자동으로 다시 시도합니다.',
    retry: true,
  },
  notfound: {
    title: '카메라 또는 마이크를 찾을 수 없습니다',
    body: '기기가 연결되어 있는지 확인한 뒤 다시 시도해 주세요.',
    retry: true,
  },
  inuse: {
    title: '카메라를 사용할 수 없습니다',
    body: '다른 앱이나 탭이 카메라를 사용 중일 수 있습니다. 해당 앱을 닫고 다시 시도해 주세요.',
    retry: true,
  },
  unsupported: {
    title: '이 브라우저는 녹화를 지원하지 않습니다',
    body: '최신 Chrome, Edge, Safari 또는 Firefox에서 열어 주세요.',
    retry: false,
  },
  insecure: {
    title: '보안 연결(HTTPS)이 필요합니다',
    body: '카메라는 https 또는 localhost 주소에서만 사용할 수 있습니다.',
    retry: false,
  },
  error: {
    title: '카메라를 시작하지 못했습니다',
    body: '잠시 후 다시 시도해 주세요.',
    retry: true,
  },
};

interface Props {
  status: MediaStatus;
  onRequest: () => void;
  children: ReactNode;
}

export function PermissionGate({ status, onRequest, children }: Props) {
  if (status === 'granted') return <>{children}</>;
  const m = MESSAGES[status];
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="text-5xl" aria-hidden>
        {status === 'denied' ? '🚫' : '📷'}
      </div>
      <h2 className="text-xl font-semibold">{m.title}</h2>
      <p className="text-sm leading-relaxed text-slate-300">{m.body}</p>
      {m.retry && (
        <button
          type="button"
          onClick={onRequest}
          className="mt-2 rounded-full bg-sky-500 px-6 py-3 font-medium text-white hover:bg-sky-400"
        >
          {status === 'idle' ? '카메라·마이크 켜기' : '다시 요청하기'}
        </button>
      )}
    </div>
  );
}
