/**
 * Upload card images to Supabase Storage (bucket: card-images).
 *
 * Usage:
 *   node scripts/uploadCardImages.mjs [directory]
 *
 * Default directory: ./assets/card-images
 * Files: *.webp (or *.png). Filename = storage key (e.g. toyota-corolla.webp).
 *
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 * (For uploads, bucket must allow insert for your key, or use SUPABASE_SERVICE_ROLE_KEY.)
 */

import { createClient } from "@supabase/supabase-js";
import { readdir } from "fs/promises";
import { join, extname } from "path";
import { readFile } from "fs/promises";

const BUCKET = "card-images";
const DEFAULT_DIR = join(process.cwd(), "assets", "card-images");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing env: VITE_SUPABASE_URL and (VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const dir = process.argv[2] || DEFAULT_DIR;
  let files;
  try {
    files = await readdir(dir);
  } catch (e) {
    console.error("Directory not found:", dir);
    process.exit(1);
  }

  const images = files.filter((f) => /\.(webp|png)$/i.test(extname(f)));
  if (images.length === 0) {
    console.log("No .webp or .png files in", dir);
    return;
  }

  for (const name of images) {
    const path = join(dir, name);
    const body = await readFile(path);
    const { error } = await supabase.storage.from(BUCKET).upload(name, body, {
      contentType: name.endsWith(".webp") ? "image/webp" : "image/png",
      upsert: true,
    });
    if (error) {
      console.error("Upload failed:", name, error.message);
    } else {
      console.log("Uploaded:", name);
    }
  }
}

main();
