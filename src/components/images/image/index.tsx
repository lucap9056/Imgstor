import { imgstorNotifications } from "components/notifications";
import React, { useEffect, useState } from "react";

import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import RoutePaths from "route-paths";
import Imgstor from "services/imgstor";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { Message } from "utils/message";

import styles from "components/images/style.module.scss";
import { useTranslation } from "react-i18next";

export const BASE_WIDTH = 240;
export const BASE_HEIGHT = 20;
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

interface Props {
    imgstor: Imgstor
    image: ImgstorImage
    onload?: () => void
}

const ImageComponenet: React.FC<Props> = ({ imgstor, image, onload }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [title, SetTitle] = useState(image.title);
    const [preview, SetPreview] = useState<string>();
    const [style, SetStyle] = useState({});
    const [invalidImageUrl, SetInvalidImageUrl] = useState<string>();
    const hostingService = imgstor.AvailableHostingServices[image.hosting_service];

    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    useEffect(() => {
        const fetchPreview = async () => {
            if (hostingService === undefined) {
                SetTitle(`image hosting service id:${image.hosting_service} not found`);
                return;
            }

            const url = await hostingService.Preview(image);
            SetPreview(url);
            if (onload) {
                onload();
            }
        };

        if (inView) {
            fetchPreview();
        }
    }, [inView, hostingService, image, onload]);

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
        const copiedMessage = new Message(
            Message.Type.NORMAL,
            t("viewer_copy_link_notification")
        );
        imgstorNotifications.Append(
            copiedMessage
        );
        navigator.clipboard.writeText(image.link);
    }

    const HandleFocusView = () => {

        navigate(RoutePaths.FOCUS_VIEW + "/" + image.id);
    }

    const HandleImageLoad = (e: React.UIEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;

        const gridRowEnd = `span ${Math.floor(BASE_WIDTH * (naturalHeight / naturalWidth) / BASE_HEIGHT)}`;
        SetStyle({ gridRowEnd });
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
                <tspan x="50%" dy="30">${image.preview}</tspan>
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


    return <div className={styles.image} style={style} ref={ref}>

        {title && <div className={styles.image_title} onClick={HandleFocusView}>
            {ImgstorDB.DecodeText(title)}
        </div>
        }

        {preview && <>
            <img className={styles.image_preview} alt={t("image_preview_failed")} onError={HandleImageError} src={preview} onClick={HandleFocusView} onLoad={HandleImageLoad} loading="lazy" />

            <div className={styles.image_copy_link} onClick={HandleCopyLink}>
                <FontAwesomeIcon icon={faCopy} />
            </div>
        </>
        }

    </div>
}

export default ImageComponenet;