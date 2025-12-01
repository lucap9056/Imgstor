use image::{
    codecs::gif::{GifEncoder, Repeat},
    Frame,
};
use js_sys::Uint8Array;
use png::{self, Encoder};
use wasm_bindgen::JsError;

use crate::{animation_decoder::ImgprocFrameDecoder, callback_logs::*};

pub fn encode_apng(
    mut decoder: ImgprocFrameDecoder,
    logs: CallbackLogs,
) -> Result<Uint8Array, JsError> {
    logs("Starting APNG encoding...")?;

    let width = decoder.width();
    let height = decoder.height();
    let num_frames = decoder.num_frames();

    logs(&format!("Image dimensions: {}x{}", width, height))?;
    logs(&format!("Number of frames: {}", num_frames))?;

    let mut output = Vec::new();
    let mut encoder = Encoder::new(&mut output, width, height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::Fast);
    encoder.set_filter(png::FilterType::Sub);

    encoder
        .set_animated(num_frames, 0)
        .map_err(|e| JsError::new(&format!("Failed to set animation parameters: {}", e)))?;

    let mut writer = encoder
        .write_header()
        .map_err(|e| JsError::new(&format!("Failed to write PNG header: {}", e)))?;

    let mut frame_count = 0;
    while let Some((image, delay_ms)) = decoder.next_frame() {
        frame_count += 1;
        logs(&format!("Encoding frame {}/{}...", frame_count, num_frames))?;

        let delay_numerator = delay_ms as u16;
        let delay_denominator = 1000;
        writer
            .set_frame_delay(delay_numerator, delay_denominator)
            .map_err(|e| JsError::new(&format!("Failed to set frame delay: {}", e)))?;
        writer
            .write_image_data(&image.into_raw())
            .map_err(|e| JsError::new(&format!("Failed to write frame data: {}", e)))?;
    }

    match writer.finish() {
        Ok(_) => {
            logs("APNG encoding finished successfully.")?;
            Ok(Uint8Array::from(output.as_slice()))
        }
        Err(e) => Err(JsError::new(&format!(
            "Failed to finalize APNG encoding: {}",
            e
        ))),
    }
}

pub fn encode_gif(
    mut decoder: ImgprocFrameDecoder,
    logs: CallbackLogs,
) -> Result<Uint8Array, JsError> {
    logs("Starting GIF encoding...")?;
    let mut output = Vec::new();
    let mut encoder = GifEncoder::new(&mut output);
    encoder
        .set_repeat(Repeat::Infinite)
        .map_err(|e| JsError::new(&format!("Failed to set GIF repeat: {}", e)))?;

    let num_frames = decoder.num_frames();
    logs(&format!("Number of frames: {}", num_frames))?;

    let mut frame_count = 0;
    while let Some((image, delay_ms)) = decoder.next_frame() {
        frame_count += 1;
        logs(&format!("Encoding frame {}/{}...", frame_count, num_frames))?;
        let delay = image::Delay::from_numer_denom_ms((delay_ms as f32 / 10.0).round() as u32, 100);
        let frame: Frame = Frame::from_parts(image, 0, 0, delay);
        encoder
            .encode_frame(frame)
            .map_err(|e| JsError::new(&format!("Failed to encode a GIF frame: {}", e)))?;
    }

    drop(encoder);
    logs("GIF encoding finished successfully.")?;
    Ok(Uint8Array::from(output.as_slice()))
}
