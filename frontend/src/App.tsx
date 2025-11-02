import { AppProviders } from './shared/providers/AppProviders';
import { AppRoutes } from './router';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}