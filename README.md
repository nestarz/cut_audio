# cut_audio
Cut Audio based on SRT files or Subtitle Object 


```ts
import { addWaveHeader } from "https://deno.land/x/wave_header/mod.ts";
import { cutAudioFile, parseSRT } from "https://deno.land/x/cut_audio/mod.ts";

const [wavPath, srtPath, sampleRate, bitDepth, channels, out] = Deno.args;
await Deno.mkdir(`${out}/wavs/`, { recursive: true });
const subtitles = parseSRT(await Deno.readTextFile(srtPath));
const metadata = await Deno.open(`${out}/metadata.txt`, {
  write: true,
  create: true,
});
for await (const {
  subtitle: { index, text },
  data,
} of cutAudioFile(
  wavPath,
  subtitles,
  +sampleRate,
  +bitDepth,
  +channels,
)) {
  const pv = wavPath.split("/").pop().split(".").shift();
  const filename = `${pv}_${index}.wav`;
  await Deno.writeFile(
    `${out}/wavs/${filename}`,
    addWaveHeader(data, +channels, +sampleRate, +bitDepth)
  );
  await Deno.write(
    metadata.rid,
    new TextEncoder().encode(`${filename}||${text}\n`)
  );
}

```

## CLI usage

```sh
deno run -A https://deno.land/x/cut_audio/mod.ts "wav_path" "srt_path" sample_rate bit_depth channels out_dir
```
