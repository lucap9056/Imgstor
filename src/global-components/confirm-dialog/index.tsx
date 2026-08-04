import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";

import styles from "./style.module.scss";

export interface ConfirmButton {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "danger";
  /** Keep the dialog open after this button is clicked (e.g. a "copy link" action). */
  keepOpen?: boolean;
}

export interface ConfirmOptions {
  title?: string;
  description: React.ReactNode;
  buttons: ConfirmButton[];
}

type Confirm = (options: ConfirmOptions) => void;

const ConfirmDialogContext = createContext<Confirm | null>(null);

export const ConfirmDialogProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [current, setCurrent] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback<Confirm>((options) => {
    setCurrent(options);
  }, []);

  const HandleButtonClick = (button: ConfirmButton) => {
    if (!button.keepOpen) {
      setCurrent(null);
    }
    button.onClick?.();
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={current !== null}
        onOpenChange={(open) => !open && setCurrent(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={styles.overlay} />
          <AlertDialog.Content className={styles.content}>
            {current?.title && (
              <AlertDialog.Title className={styles.title}>
                {current.title}
              </AlertDialog.Title>
            )}
            <AlertDialog.Description className={styles.description}>
              {current?.description}
            </AlertDialog.Description>
            <div className={styles.buttons}>
              {current?.buttons.map((button) => (
                <button
                  key={button.label}
                  type="button"
                  className={styles.button}
                  data-variant={button.variant ?? "default"}
                  onClick={() => HandleButtonClick(button)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirm = (): Confirm => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider.");
  }
  return context;
};
