import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from "./style.module.scss";

interface Props {
    onSignIn: () => Promise<void>
}

const SignIn: React.FC<Props> = ({ onSignIn }) => {
    const { t } = useTranslation();

    return <div className={styles.container}>
        <div className={styles.signin}>
            <div className={styles.left}>
                <div className={styles.appname}>{t("app.name")}</div>
                <button className={styles.button} onClick={() => onSignIn()}>
                    {t('google.signin')}
                </button>

            </div>
            <div className={styles.right}>
                <div className={styles.mark}>
                    <img src='./favicon.ico' />
                </div>
                <div className={styles.description}>
                    {t("app.description")}
                </div>
            </div>
        </div>
    </div>
}

export default SignIn;