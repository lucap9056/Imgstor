/**
 * 畫面中央提示
 */
import React, { useEffect, useState } from 'react';

import { Message, MessageManagerEvent } from "utils/message";

import imgstorAlerts from './script';

import styles from "components/alerts/style.module.scss";

export {
    imgstorAlerts
}

const Alerts = () => {
    const [alert, setAlert] = useState<Message>();

    useEffect(() => {
        const AlertsChangedHandler = (e: MessageManagerEvent<"MessagesChanged">) => {
            if (e.detail.length === 0) {
                setAlert(undefined);
            }
            else {
                setAlert(e.detail[0]);
            }
        }

        imgstorAlerts.on("MessagesChanged", AlertsChangedHandler);
        return () => {
            imgstorAlerts.off("MessagesChanged", AlertsChangedHandler);
        }
    }, []);

    if (!alert) return <></>;

    return <Alert key={alert.Id} content={alert} />;
}

export default Alerts;

class Alert extends React.Component<{ content: Message }> {
    constructor(props: { content: Message }) {
        super(props);
    }

    render(): React.ReactNode {
        const { content } = this.props;
        return <div className={styles.alert_container}>
            <div className={styles.alert} data-type={content.Type}>
                <p className={styles.alert_message}>{content.Text}</p>
                {content.Buttons.map(
                    (button, i) => <button key={content.Id + i} className={styles.alert_button}
                        onClick={button.Click}>
                        {button.Text}
                    </button>
                )}
            </div>
        </div>
    }
}