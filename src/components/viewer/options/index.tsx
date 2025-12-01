import React, { useState } from "react";

import styles from "./style.module.scss";

export type Option = {
    key: string
    text: string
    node: React.ReactNode
    subOptions?: Option[]
    handler?: () => void
}

interface Props {
    options: Option[]
}

const Options: React.FC<Props> = (props) => {
    const [options, SetOptions] = useState<Option[]>(props.options);

    const HandleOptionClick = ({ subOptions, handler }: Option) => {

        if (Array.isArray(subOptions) && subOptions.length > 0) {
            SetOptions(subOptions);
        }
        else if (handler) {
            handler();
        }

    }

    return <div className={styles.container}>
        {options.map((option) =>
            <div
                key={option.key}
                className={styles.option}
                onClick={() => HandleOptionClick(option)}
            >
                <div className={styles.content}>{option.node}</div>
            </div>
        )
        }
    </div>
}

export default Options;