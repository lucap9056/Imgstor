use crate::frames::Frames;
use image::{codecs::png::PngDecoder, AnimationDecoder};
use js_sys::Uint8Array;
use png;
use std::io::Cursor;
use wasm_bindgen::JsError;

pub fn decode_apng(image_data: &[u8]) -> Result<Frames, JsError> {
    let cursor = Cursor::new(image_data);
    let decoder = PngDecoder::new(cursor)?;
    let decoder = decoder.apng()?;

    let mut frames: Frames = Vec::new();
    for frame in decoder.into_frames() {
        let frame = frame?;
        let delay = frame.delay().numer_denom_ms();
        let image = Box::new(frame.into_buffer());

        frames.push((image, delay.0));
    }

    Ok(frames)
}

pub fn encode_apng(frames: Frames) -> Result<Uint8Array, JsError> {
    let width = frames[0].0.width();
    let height = frames[0].0.height();

    let num_frames = frames.len() as u32;

    let mut output = Vec::new();

    let mut encoder = png::Encoder::new(&mut output, width, height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::Fast);
    encoder.set_filter(png::FilterType::Sub);
    encoder.set_animated(num_frames, 0)?;

    let mut writer = encoder.write_header()?;

    for (image, delay_ms) in frames {
        writer.set_frame_delay(delay_ms as u16, 1000)?;
        writer.write_image_data(&image.into_raw())?;
    }
    writer.finish()?;

    Ok(Uint8Array::from(output.as_slice()))
}
