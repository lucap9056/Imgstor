import React from "react";
import { ImgstorTag } from "services/imgstor-db";

interface Props {
    className: string
    tag: ImgstorTag
    ondrag: (tag: ImgstorTag) => void
}

const TagItem: React.FC<Props> = ({ className, tag, ondrag }) => {

    const HandleDrag = () => {
        ondrag(tag);
    }

    return <div className={className}
        onTouchStart={HandleDrag}
        onMouseDown={HandleDrag}
    >
        {tag.name}
    </div>;
}

export default TagItem;