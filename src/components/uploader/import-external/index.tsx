import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { ImageFile } from "services/image-hosting-services";
import { ImageData } from "services/image-hosting-services/import-external";

import styles from "components/uploader/import-external/style.module.scss";
import { FORMATS } from "services/converter/file-formats";

interface Props {
    onchange: (image: ImageFile | undefined) => void;
}

const ImportExternalComponent: React.FC<Props> = ({ onchange }) => {
    const { t } = useTranslation();
    const [imageUrl, setImageUrl] = useState<string>("");
    const [previewUrl, setPreviewUrl] = useState<string>("");

    const HandleImageUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setImageUrl(event.target.value);
    };

    const HandlePreviewUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPreviewUrl(event.target.value);
    };

    const HandleBlur = () => {

        const imageData: ImageData = {
            imageUrl,
            previewUrl
        };

        if (imageUrl !== "") {
            const imageDataStr = JSON.stringify(imageData);
            const file = new File([new Blob([imageDataStr])], "", { type: "text/plain" });
            const imageFile = new ImageFile(file, FORMATS["JPEG"]);
            onchange(imageFile);
        } else {
            onchange(undefined);
        }

    };

    return (
        <div className={styles.uploader_import}>
            <input
                type="text"
                value={imageUrl}
                onChange={HandleImageUrlChange}
                onBlur={HandleBlur}
                placeholder={t("uploader_import_image_url")}
            />
            <input
                type="text"
                value={previewUrl}
                onChange={HandlePreviewUrlChange}
                onBlur={HandleBlur}
                placeholder={imageUrl ? imageUrl : t("uploader_import_preview_url")}
            />
        </div>
    );
};

export default ImportExternalComponent;
