import React, { ReactNode, useRef, useState } from "react";

import styles from "components/settings/blocks/style.module.scss";

interface Props {
    title: string
    visible?: boolean
    children?: ReactNode
}

const SettingBlock: React.FC<Props> = (props) => {
    const [visible, SetVisible] = useState(props.visible || false);
    const [style, SetStyle] = useState<React.CSSProperties>({});
    const { title, children } = props;
    const content = useRef<HTMLDivElement>(null);
    const HandleVisible = () => {
        if (visible) {
            SetStyle({});
        } else if (content.current) {
            const height = content.current.scrollHeight;
            SetStyle({ height });
        }
        SetVisible(!visible);
    }

    return <div className={styles.setting_block}>
        <div className={styles.setting_block_title} data-visible={visible} onClick={HandleVisible}>{title}</div>
        <div className={styles.setting_block_content} style={style} ref={content}>
            {children}
        </div>
    </div>
}

export default SettingBlock;