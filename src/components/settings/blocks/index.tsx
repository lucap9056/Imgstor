import React, { ReactNode, useEffect, useRef, useState } from "react";

import styles from "components/settings/blocks/style.module.scss";

interface Props {
    title: string
    visible?: boolean
    children?: ReactNode
}

const SettingBlock: React.FC<Props> = (props) => {
    const [visible, SetVisible] = useState<boolean>(props.visible !== undefined ? props.visible : true);
    const [style, SetStyle] = useState<React.CSSProperties>({});
    const { title, children } = props;
    const content = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visible && content.current) {
            const height = content.current.scrollHeight + 5;
            SetStyle({ height });
        } else {
            SetStyle({});
        }
    }, [visible]);

    const HandleVisible = () => {
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