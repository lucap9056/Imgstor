import styles from "components/settings/blocks/label/style.module.scss";
import type React from "react";
import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

const Textbox: React.FC<Props> = ({ children }) => {
  return (
    <div className={styles.setting_block_label}>
      {(children || "").toString()}
    </div>
  );
};

export default Textbox;
