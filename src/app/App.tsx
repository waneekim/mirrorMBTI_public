import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ClipListPage } from '../features/recording/ClipListPage';
import { StudioPage } from '../features/recording/StudioPage';
import { useSessionStore } from '../features/recording/store';
import { HomePage } from './HomePage';
import { Layout } from './Layout';

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/studio', element: <StudioPage /> },
        { path: '/clips', element: <ClipListPage /> },
      ],
    },
  ],
  // Served under /<repo>/ on GitHub Pages.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

export function App() {
  const loadState = useSessionStore((s) => s.loadState);
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (loadState === 'idle' || loadState === 'loading') {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-400">불러오는 중…</div>;
  }
  if (loadState === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-slate-950 px-6 text-center text-slate-200">
        <p className="font-semibold">저장소를 열 수 없습니다</p>
        <p className="text-sm text-slate-400">시크릿 모드이거나 브라우저 저장소가 차단되어 있을 수 있습니다.</p>
      </div>
    );
  }
  return <RouterProvider router={router} />;
}
