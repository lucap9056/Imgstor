import React from "react";

import styles from "components/settings/blocks/textbox/style.module.scss";

interface Props {
    label: string
    name: string
    password?: boolean
    value?: string
}

const Textbox: React.FC<Props> = ({ label, name, value, password }) => {

    const inputType = password ? "password" : "text";

    return <div className={styles.setting_block_textbox}>
        <div className={styles.setting_block_textbox_label}>{label}</div>
        <input className={styles.setting_block_textbox_input} type={inputType} name={name} defaultValue={value} />
    </div>
}

export default Textbox;