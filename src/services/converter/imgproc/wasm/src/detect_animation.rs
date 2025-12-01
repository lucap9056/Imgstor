use gif;
use js_sys::Boolean;
use png;
use std::io::{Cursor, Read, Seek, SeekFrom};
use wasm_bindgen::prelude::*;


pub fn is_animated_gif(data: &[u8]) -> Result<Boolean, JsError> {
    let cursor = Cursor::new(data);
    let mut decoder = gif::DecodeOptions::new().read_info(cursor)?;

    let mut frame_count = 0;
    while let Some(_) = decoder.read_next_frame()? {
        frame_count += 1;
        if frame_count > 1 {
            return Ok(Boolean::from(true));
        }
    }

    Ok(Boolean::from(false))
}

pub fn is_animated_webp(data: &[u8]) -> Result<Boolean, JsError> {
    const WEBP_HEADER: &[u8] = b"RIFF";
    const WEBP_SIGNATURE: &[u8] = b"WEBP";
    const ANIM_CHUNK: &[u8] = b"ANIM";
    const ANMF_CHUNK: &[u8] = b"ANMF";

    if !data.starts_with(WEBP_HEADER) {
        return Ok(Boolean::from(false));
    }

    let mut cursor = Cursor::new(data);

    if cursor.seek(SeekFrom::Start(8)).is_err() {
        return Ok(Boolean::from(false));
    }

    let mut signature = [0u8; 4];
    if cursor.read_exact(&mut signature).is_err() || &signature != WEBP_SIGNATURE {
        return Ok(Boolean::from(false));
    }

    loop {
        let mut chunk_type = [0u8; 4];
        if cursor.read_exact(&mut chunk_type).is_err() {
            break;
        }

        let mut chunk_size_bytes = [0u8; 4];
        if cursor.read_exact(&mut chunk_size_bytes).is_err() {
            break;
        }
        let chunk_size = u32::from_le_bytes(chunk_size_bytes);

        if &chunk_type == ANIM_CHUNK || &chunk_type == ANMF_CHUNK {
            return Ok(Boolean::from(true));
        }

        if cursor.seek(SeekFrom::Current(chunk_size as i64)).is_err() {
            break;
        }

        if chunk_size % 2 != 0 {
            if cursor.seek(SeekFrom::Current(1)).is_err() {
                break;
            }
        }
    }

    Ok(Boolean::from(false))
}

pub fn is_animated_apng(data: &[u8]) -> Result<Boolean, JsError> {
    let decoder = png::Decoder::new(data);
    let reader = decoder.read_info()?;

    match reader.info().animation_control() {
        Some(_) => Ok(Boolean::from(true)),
        _ => Ok(Boolean::from(false)),
    }
}
