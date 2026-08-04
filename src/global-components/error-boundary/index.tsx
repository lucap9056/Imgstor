import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import styles from "./style.module.scss";

const ErrorFallback: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("error.title")}</h1>
      <p className={styles.description}>{t("error.description")}</p>
      <button
        className={styles.button}
        type="button"
        onClick={() => location.reload()}
      >
        {t("error.reload")}
      </button>
    </div>
  );
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
  }

  public render(): ReactNode {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}

export default ErrorBoundary;
