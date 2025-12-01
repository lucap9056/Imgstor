import React, { useEffect, useState } from "react";
import { ImageHostingService } from "services/image-hosting-services";
import Imgstor from "services/imgstor";

import styles from "./style.module.scss";

interface Props {
    imgstor: Imgstor
    onchange: (hostingService: ImageHostingService) => void
}

const HostingServicesSelect: React.FC<Props> = ({ imgstor, onchange }) => {
    const [hostingServices, SetHostingServices] = useState<ImageHostingService[]>([]);
    const [selectedHostingService, SetSelectedHostingService] = useState<ImageHostingService>();

    useEffect(() => {
        if (selectedHostingService) {
            onchange(selectedHostingService);
        }
    }, [selectedHostingService]);

    useEffect(() => {

        const hostingServices = imgstor.enabledHostingServices;

        if (hostingServices.length > 0) {

            SetHostingServices(hostingServices);
            SetSelectedHostingService(hostingServices[0]);
        }

    }, []);

    const HandleSeletedImageHostingService = (id: string) => {
        const hostingService = hostingServices.find((h) => h.hostingServiceId === id);
        if (hostingService) {
            SetSelectedHostingService(hostingService);
        }
    }

    if (!selectedHostingService) {
        return <></>;
    }

    return <div className={styles.image_hosting_services}>
        {Object.values(hostingServices).map(
            ({ hostingServiceId, NAME }) => <div
                key={hostingServiceId}
                className={styles.image_hosting_service}
                data-selected={hostingServiceId === selectedHostingService.hostingServiceId}
                onClick={() => HandleSeletedImageHostingService(hostingServiceId)}
            >{NAME}</div>
        )}
    </div>;
}

export default HostingServicesSelect;