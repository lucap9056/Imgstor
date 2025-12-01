import React, { useState } from "react";

import styles from "components/settings/blocks/toggle/style.module.scss";

interface Props {
    label: string
    name: string
    value?: boolean
}

const Toggle: React.FC<Props> = ({ label, name, value }) => {

    const [enabled, SetEnabled] = useState(value || false);

    const HandleSwitch = () => {
        SetEnabled(!enabled);
    }

    return <div className={styles.setting_block_toggle}>
        <div className={styles.setting_block_toggle_label}>{label}</div>
        <input type="text" name={name} value={enabled.toString()} hidden readOnly />
        <div className={styles.setting_block_toggle_value} data-enabled={enabled} onClick={HandleSwitch}></div>
    </div>
}

export default Toggle;