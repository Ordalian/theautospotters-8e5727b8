/**
 * Upload card images to Supabase Storage (bucket: card-images).
 *
 * Usage:
 *   node scripts/uploadCardImages.mjs                    # upload all images in assets/card-images
 *   node scripts/uploadCardImages.mjs [directory]        # upload all in directory
 *   node scripts/uploadCardImages.mjs path/to/file.png   # upload a single file
 *
 * Default directory: ./assets/card-images
 * Files: *.webp or *.png. Storage name = filename (e.g. lamborghini-huracan-evo.png).
 *
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).
 */

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "fs/promises";
import { join, extname, basename, resolve } from "path";
const BUCKET = "card-images";
const DEFAULT_DIR = join(process.cwd(), "assets", "card-images");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing env: VITE_SUPABASE_URL and (VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(url, key);

async function uploadOne(filePath) {
  const name = basename(filePath);
  if (!/\.(webp|png)$/i.test(extname(name))) {
    console.error("Not an image:", name);
    return;
  }
  const body = await readFile(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(name, body, {
    contentType: name.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png",
    upsert: true,
  });
  if (error) {
    console.error("Upload failed:", name, error.message);
  } else {
    console.log("Uploaded:", name);
  }
}

async function main() {
  const input = process.argv[2] || DEFAULT_DIR;
  const resolved = input ? resolve(process.cwd(), input) : DEFAULT_DIR;

  try {
    const st = await stat(resolved);
    if (st.isFile()) {
      await uploadOne(resolved);
      return;
    }
  } catch (_) {
    // not a file or missing
  }

  const dir = resolved;
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
    await uploadOne(join(dir, name));
  }
}

main();
