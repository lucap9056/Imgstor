import { faAsterisk, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useConfirm } from "global-components/confirm-dialog";
import { useLoader } from "global-components/loader";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImgstor } from "services/imgstor";
import ImgstorDB, { type ImgstorImage } from "services/imgstor-db";
import { toast } from "sonner";

import styles from "./style.module.scss";

interface Props {
  image: ImgstorImage;
}

const Description: React.FC<Props> = ({ image }) => {
  const loader = useLoader();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const imgstorDB = useImgstor().db;
  const [description, setDescription] = useState(
    ImgstorDB.DecodeText(image.description),
  );
  const [edit, setEdit] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (edit && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [edit]);

  const setTextAreaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleBlur = ({
    currentTarget,
  }: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!edit) return;
    const value = currentTarget.value;

    if (value === description) {
      setEdit(false);
      return;
    }

    confirm({
      description: t("viewer.alert.change-description", {
        old: description,
        new: value,
      }),
      buttons: [
        {
          label: t("main.cancel"),
          onClick: () => {
            currentTarget.value = description;
            setEdit(false);
            setTextAreaHeight(currentTarget);
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
                description: ImgstorDB.EncodeText(value),
              });
              imgstorDB.Save();
            } catch (err) {
              toast.error((err as Error).message);
            }

            setDescription(value);
            setEdit(false);

            toast.dismiss(savingToastId);
            loading.remove();
          },
        },
      ],
    });
  };

  const handleChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextAreaHeight(e.currentTarget);
  };

  const handleEdit = () => {
    setEdit(true);
  };

  return (
    <div className={styles.description}>
      <div className={styles.icon}>
        <FontAwesomeIcon icon={faAsterisk} />
      </div>
      <textarea
        ref={textAreaRef}
        readOnly={!edit}
        defaultValue={description}
        onBlur={handleBlur}
        onChange={handleChanged}
      />
      {!edit && (
        <button className={styles.edit} onClick={handleEdit}>
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
      )}
    </div>
  );
};

export default Description;
