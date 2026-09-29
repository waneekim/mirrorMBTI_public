import { NavLink, Outlet } from 'react-router-dom';
import { DeleteSessionButton } from '../features/recording/DeleteSessionButton';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`;

export function Layout() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-white/5 bg-slate-950/90 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <NavLink to="/" className="mr-auto font-semibold">
          Mirror
        </NavLink>
        <NavLink to="/clips" className={navClass}>
          촬영
        </NavLink>
        <NavLink to="/survey" className={navClass}>
          설문
        </NavLink>
        <NavLink to="/report" className={navClass}>
          리포트
        </NavLink>
        <DeleteSessionButton />
      </header>
      <main className="pb-[env(safe-area-inset-bottom)]">
        <Outlet />
      </main>
    </div>
  );
}
