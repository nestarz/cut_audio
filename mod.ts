import { addWaveHeader } from "https://deno.land/x/wave_header/mod.ts";

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
  index: number;
}

const srtTimeToMilliseconds = (timeString: string) =>
  timeString
    .split(/[:,]/)
    .reduce((acc, val, i) => acc + +val * [3600000, 60000, 1000, 1][i], 0);

export const parseSRT = (srtString: string): Subtitle[] =>
  srtString
    .split("\n\n")
    .filter((v) => v)
    .map((subtitle) => {
      const [index, timing, ...text] = subtitle.split("\n");
      const [startTime, endTime] = timing.split(" --> ");
      return {
        index: +index,
        startTime: srtTimeToMilliseconds(startTime),
        endTime: srtTimeToMilliseconds(endTime),
        text: text.join("\n").trim(),
      };
    });

const createMillisecondsToBytes =
  (bitDepth: number, channels: number, sampleRate: number) =>
  (milliseconds: number) =>
    Math.round(
      (((milliseconds * channels * bitDepth) / 8) * sampleRate) / 1000
    );

export async function* cutAudioFile(
  audioFilePath: string,
  subtitles: Subtitle[],
  sampleRate: number,
  bitDepth: number,
  channels: number,
  k: number = 0
) {
  const file = await Deno.open(audioFilePath, { read: true });
  const msToBytes = createMillisecondsToBytes(bitDepth, channels, sampleRate);
  for (const subtitle of subtitles) {
    const { startTime, endTime } = subtitle;
    const data = new Uint8Array(
      msToBytes(endTime + k * 1000 - (startTime - k * 1000))
    );
    await file.seek(msToBytes(startTime) + 44, Deno.SeekMode.Start);
    await file.read(data);
    yield { subtitle, data: new Int16Array(data.buffer) };
  }
  file.close();
}

if (import.meta.main) {
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
    0.175
  )) {
    if (text.length < 50) continue;
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
}
