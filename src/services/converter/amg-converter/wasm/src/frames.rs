use image::RgbaImage;
pub type Frame = (Box<RgbaImage>, u32);
pub type Frames = Vec<Frame>;
