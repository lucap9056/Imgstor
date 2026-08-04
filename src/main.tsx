import { AlertsProvider } from "global-components/alerts";
import { LoaderProvider } from "global-components/loader";
import { NotificationsProvider } from "global-components/notifications";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./index.scss";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element with id "root" not found.');
}

const root = createRoot(rootElement);

root.render(
  <LoaderProvider>
    <AlertsProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AlertsProvider>
  </LoaderProvider>,
);
