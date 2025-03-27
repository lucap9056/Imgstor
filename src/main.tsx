import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AlertsProvider } from 'components/alerts';
import { NotificationsProvider } from 'components/notifications';
import { LoadingProvider } from "components/loading";

import './index.css';

const root = createRoot(document.getElementById('root')!)

root.render(
    <LoadingProvider>
        <AlertsProvider>
            <NotificationsProvider>
                <App />
            </NotificationsProvider>
        </AlertsProvider>
    </LoadingProvider>
);