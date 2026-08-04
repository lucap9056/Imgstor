/**
 * 畫面右下角通知
 */
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

import MessageManager, {
  type Message,
  type MessageManagerEvent,
} from "structs/message";

import styles from "./style.module.scss";

const NotificationsContext = createContext<MessageManager | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const manager = new MessageManager();
  return (
    <NotificationsContext.Provider value={manager}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): MessageManager => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within an NotificationsProvider.",
    );
  }
  return context;
};

const Notifications: React.FC = () => {
  const notifications = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    function NotificationsChangedHandler(
      e: MessageManagerEvent<"MessagesChanged">,
    ) {
      setMessages([...e.detail]);
    }

    notifications.on("MessagesChanged", NotificationsChangedHandler);
    return () => {
      notifications.off("MessagesChanged", NotificationsChangedHandler);
    };
  }, [notifications]);

  if (messages.length > 0) {
    return (
      <div className={styles.notifications}>
        {messages.map(({ id, content, type, buttons }) => (
          <li className={styles.notification} key={id} data-type={type}>
            <p className={styles.message}>{content}</p>
            {buttons.map((button, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: buttons are fixed at message creation and never reordered
                key={id + i}
                className={styles.button}
                data-id={id || ""}
                onClick={button.Click}
              >
                {button.text}
              </button>
            ))}
          </li>
        ))}
      </div>
    );
  } else return null;
};

export default Notifications;
