import { AlertsProvider } from "global-components/alerts";
import { LoaderProvider } from "global-components/loader";
import { NotificationsProvider } from "global-components/notifications";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./index.scss";

const root = createRoot(document.getElementById("root")!);

root.render(
  <LoaderProvider>
    <AlertsProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AlertsProvider>
  </LoaderProvider>,
);
