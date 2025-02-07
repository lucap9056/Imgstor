import React, { ReactNode } from "react";

import styles from "components/settings/blocks/label/style.module.scss";

interface Props {
    children?: ReactNode
}

const Textbox: React.FC<Props> = ({ children }) => {
    return <div className={styles.setting_block_label}>
        {(children || "").toString()}
    </div>
}

export default Textbox;