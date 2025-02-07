use crate::frames::Frames;
use image::{
    codecs::gif::{GifDecoder, GifEncoder, Repeat},
    AnimationDecoder, Frame,
};
use js_sys::Uint8Array;
use std::io::Cursor;
use wasm_bindgen::JsError;

pub fn decode_gif(image_data: &[u8]) -> Result<Frames, JsError> {
    let decoder = GifDecoder::new(Cursor::new(image_data))?;

    let mut frames: Frames = Vec::new();
    for frame in decoder.into_frames() {
        let frame = frame?;
        let delay = frame.delay().numer_denom_ms().0 * 10;
        let image = Box::new(frame.into_buffer());

        frames.push((image, delay));
    }

    Ok(frames)
}

pub fn encode_gif(frames: Frames) -> Result<Uint8Array, JsError> {
    let mut output = Vec::new();
    let mut encoder = GifEncoder::new(&mut output);
    encoder.set_repeat(Repeat::Infinite)?;

    for (image, delay_ms) in frames {
        let delay = image::Delay::from_numer_denom_ms((delay_ms as f32 / 10.0).round() as u32, 100);
        let frame: Frame = Frame::from_parts(*image, 0, 0, delay);
        encoder.encode_frame(frame)?;
    }

    drop(encoder);

    Ok(Uint8Array::from(output.as_slice()))
}
