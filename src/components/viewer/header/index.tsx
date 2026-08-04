import { faHouse, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useConfirm } from "global-components/confirm-dialog";
import { useLoader } from "global-components/loader";
import type React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import RoutePaths from "route-paths";
import { useImgstor } from "services/imgstor";
import ImgstorDB, { type ImgstorImage } from "services/imgstor-db";
import { toast } from "sonner";

import styles from "./style.module.scss";

interface Props {
  image: ImgstorImage;
}

const Header: React.FC<Props> = ({ image }) => {
  const navigate = useNavigate();
  const loader = useLoader();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const imgstorDB = useImgstor().db;
  const [title, setTitle] = useState(ImgstorDB.DecodeText(image.title));
  const [edit, setEdit] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!edit) return;

    const { currentTarget } = e;
    const value = currentTarget.value;

    if (value === title) {
      setEdit(false);
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    confirm({
      description: t("viewer.alert.change-title", { old: title, new: value }),
      buttons: [
        {
          label: t("main.cancel"),
          onClick: () => {
            setEdit(false);
            currentTarget.value = title;
          },
        },
        {
          label: t("main.confirm"),
          variant: "primary",
          onClick: () => {
            const loading = loader.append();
            const savingToastId = toast.loading(t("main.saving"));

            try {
              imgstorDB.UpdateImage({
                ...image,
                title: ImgstorDB.EncodeText(value),
              });
              imgstorDB.Save();
            } catch (err) {
              toast.error((err as Error).message);
            }

            setTitle(value);
            setEdit(false);

            toast.dismiss(savingToastId);
            loading.remove();
          },
        },
      ],
    });
  };

  const handleHome = () => {
    navigate(RoutePaths.HOME);
  };

  const handleEdit = () => {
    if (edit) return;
    setEdit(true);
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  };

  return (
    <div className={styles.header}>
      <div className={styles.main}>
        <button className={styles.icon} onClick={handleHome}>
          <FontAwesomeIcon icon={faHouse} />
        </button>
        <div className={styles.title}>
          <input
            ref={titleRef}
            className={styles.content}
            onBlur={handleBlur}
            defaultValue={title}
            placeholder={"none-title"}
            readOnly={!edit}
          />
          <button className={styles.icon} onClick={handleEdit}>
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
