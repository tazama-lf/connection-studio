/* eslint-disable */
// Mock for react-router-dom
export const mockNavigate = () => {};

export const useNavigate = () => mockNavigate;

export const useParams = () => ({ ruleId: 'test-rule-123' });

export const useLocation = () => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
});

export const useSearchParams = () => [new URLSearchParams(), () => {}];

export const BrowserRouter = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const MemoryRouter = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const Route = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export const Routes = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export const Link = ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
  <a href={String(to)} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
);

export const NavLink = ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
  <a href={String(to)} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
);

export const Navigate = ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />;

export const Outlet = () => <div data-testid="outlet" />;
