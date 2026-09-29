import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
// The esm build, not umd: @ffmpeg/ffmpeg's worker is a `type: "module"` Worker, which
// dynamically import()s the core script — a UMD script isn't a valid ES module, so the
// import silently fails to expose `createFFmpegCore` and ffmpeg.wasm throws.
const srcDir = join(root, 'node_modules/@ffmpeg/core/dist/esm')
const destDir = join(root, 'public/ffmpeg')

mkdirSync(destDir, { recursive: true })
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  copyFileSync(join(srcDir, file), join(destDir, file))
}
