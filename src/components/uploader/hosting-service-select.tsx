import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageHostingService } from "services/image-hosting-services";
import Imgstor from "services/imgstor";

import styles from "components/uploader/style.module.scss";

interface Props {
    imgstor: Imgstor
    onchange: (hostingService: ImageHostingService) => void
}

const HostingServicesSelect: React.FC<Props> = ({ imgstor, onchange }) => {
    const { t } = useTranslation();
    const [hostingServices, SetHostingServices] = useState<ImageHostingService[]>([]);
    const [selectedHostingService, SetSelectedHostingService] = useState<ImageHostingService>();

    useEffect(() => {
        if (selectedHostingService) {
            onchange(selectedHostingService);
        }
    }, [selectedHostingService]);

    useEffect(() => {

        const hostingServices = imgstor.EnabledHostingServices;

        if (hostingServices.length > 0) {

            SetHostingServices(hostingServices);
            SetSelectedHostingService(hostingServices[0]);
        }

    }, []);

    const HandleSeletedImageHostingService = (id: string) => {
        const hostingService = hostingServices.find((h) => h.id === id);
        if (hostingService) {
            SetSelectedHostingService(hostingService);
        }
    }

    if (!selectedHostingService) {
        return <></>;
    }

    return <div className={styles.image_hosting_services} data-text={t("uploader_image_hosting_service")}>
        {Object.values(hostingServices).map(
            ({ id, NAME }) => <div
                key={id}
                className={styles.image_hosting_service}
                data-selected={id === selectedHostingService.id}
                onClick={() => HandleSeletedImageHostingService(id)}
            >{NAME}</div>
        )}
    </div>;
}

export default HostingServicesSelect;