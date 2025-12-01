import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LoaderProvider } from 'global-components/loader';
import { AlertsProvider } from 'global-components/alerts';
import { NotificationsProvider } from 'global-components/notifications';

import './index.scss';

const root = createRoot(document.getElementById('root')!)

root.render(
    <LoaderProvider>
        <AlertsProvider>
            <NotificationsProvider>
                <App />
            </NotificationsProvider>
        </AlertsProvider>
    </LoaderProvider>
);