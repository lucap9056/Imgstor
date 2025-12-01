import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useNotifications } from "global-components/notifications";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import RoutePaths from "route-paths";
import { useImgstor } from "services/imgstor";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { Message } from "structs/message";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

import styles from "components/images/style.module.scss";

interface Props {
    image: ImgstorImage
    onload?: () => void
}

const ImageComponenet: React.FC<Props> = ({ image, onload }) => {
    const imgstorNotifications = useNotifications();
    const { t } = useTranslation();
    const imgstor = useImgstor();
    const navigate = useNavigate();

    const hostingService = imgstor.availableHostingServices[image.hostingServiceId];

    const [title] = useState(
        hostingService ?
            ImgstorDB.DecodeText(image.title) :
            t("image.hosting-service.not-found", { hostingService: image.hostingServiceId })
    );
    const [preview, SetPreview] = useState<string>();
    const [invalidImageUrl, SetInvalidImageUrl] = useState<string>();

    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    useEffect(() => {
        if (!inView || !hostingService) return;

        (async () => {
            const url = await hostingService.Preview(image);
            SetPreview(url);
            if (onload) {
                onload();
            }
        })();

    }, [inView]);

    useEffect(() => {
        if (invalidImageUrl) {
            SetPreview(invalidImageUrl);
        }
        return () => {
            if (invalidImageUrl) {
                URL.revokeObjectURL(invalidImageUrl);
            }
        }
    }, [invalidImageUrl]);

    const HandleCopyLink = () => {
        if (!image) return;
        const copiedMessage = new Message({
            type: Message.Type.NORMAL,
            content: t("viewer.notification.link-copied")
        });
        imgstorNotifications.append(
            copiedMessage
        );
        navigator.clipboard.writeText(image.imageUrl);
    }

    const HandleFocusView = () => {

        navigate(RoutePaths.FOCUS_VIEW + "/" + image.imageId);
    }

    const InvalidImageUrl = (): string => {
        const defaultWidth = 480;
        const defaultHeight = 160;
        const defaultAspectRatio = defaultWidth / defaultHeight;

        const actualWidth = (image.width === "0" || !image.width) ? defaultWidth : parseInt(image.width);
        const actualHeight = (image.height === "0" || !image.height) ? defaultHeight : parseInt(image.height);

        let adjustedWidth = actualWidth;
        let adjustedHeight = actualHeight;

        if (actualWidth < defaultWidth || actualHeight < defaultHeight || (actualWidth > defaultWidth && actualHeight > defaultHeight)) {
            const scalingFactor = (actualHeight * defaultAspectRatio < actualWidth)
                ? defaultHeight / actualHeight
                : defaultWidth / actualWidth;

            adjustedHeight = actualHeight * scalingFactor;
            adjustedWidth = actualWidth * scalingFactor;
        }

        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedWidth}" height="${adjustedHeight}" viewBox="0 0 ${adjustedWidth} ${adjustedHeight}">
            <rect width="100%" height="100%" fill="#f8d7da"/>
            <text x="50%" y="50%" font-size="24" text-anchor="middle" fill="#721c24" dominant-baseline="middle">
                <tspan x="50%" dy="-15">${t("image_preview_failed")}</tspan>
                <tspan x="50%" dy="30">${image.previewUrl}</tspan>
            </text>
        </svg>
    `;

        const blob = new Blob([svg], { type: "image/svg+xml" });
        return URL.createObjectURL(blob);
    }

    const HandleImageError = () => {
        if (invalidImageUrl) {
            return;
        }

        const url = InvalidImageUrl();
        SetInvalidImageUrl(url);
    }


    return <div className={styles.image} ref={ref}>

        {preview && <>
            <img className={styles.image_preview} alt={t("image.preview.failed")} onError={HandleImageError} src={preview} onClick={HandleFocusView} loading="lazy" />

            <div className={styles.image_copy_link} onClick={HandleCopyLink}>
                <FontAwesomeIcon icon={faCopy} />
            </div>
        </>
        }

        {title && <div className={styles.image_title} onClick={HandleFocusView}>
            {title}
        </div>
        }

    </div>
}

export default ImageComponenet;