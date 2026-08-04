import { ConfirmDialogProvider } from "global-components/confirm-dialog";
import ErrorBoundary from "global-components/error-boundary";
import { LoaderProvider } from "global-components/loader";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./index.scss";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element with id "root" not found.');
}

const root = createRoot(rootElement);

root.render(
  <ErrorBoundary>
    <LoaderProvider>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </LoaderProvider>
  </ErrorBoundary>,
);
