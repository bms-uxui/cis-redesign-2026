// Lightweight average-pitch estimator using autocorrelation. Returns 0 when
// no voiced frames are detected. Operates on mono float32 samples already at
// the target sample rate (16kHz expected).

export function estimateMeanPitch(samples: Float32Array, sampleRate: number): number {
  const frameMs = 32;
  const frameSize = Math.floor((frameMs / 1000) * sampleRate);
  if (samples.length < frameSize * 2) return 0;
  const hop = frameSize;
  const minLag = Math.max(2, Math.floor(sampleRate / 450)); // 450 Hz upper
  const maxLag = Math.min(frameSize - 1, Math.floor(sampleRate / 70)); // 70 Hz lower
  const pitches: number[] = [];

  for (let off = 0; off + frameSize <= samples.length; off += hop) {
    const frame = samples.subarray(off, off + frameSize);
    const rms = rmsOf(frame);
    if (rms < 0.012) continue; // voiced gate

    let bestLag = 0;
    let bestCorr = 0;
    let zeroCorr = 0;
    for (let i = 0; i < frame.length; i++) zeroCorr += frame[i] * frame[i];
    if (zeroCorr <= 0) continue;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      const limit = frame.length - lag;
      for (let i = 0; i < limit; i++) corr += frame[i] * frame[i + lag];
      const norm = corr / zeroCorr;
      if (norm > bestCorr) {
        bestCorr = norm;
        bestLag = lag;
      }
    }
    if (bestLag > 0 && bestCorr > 0.4) {
      pitches.push(sampleRate / bestLag);
    }
  }

  if (pitches.length < 3) return 0;
  pitches.sort((a, b) => a - b);
  return pitches[Math.floor(pitches.length / 2)];
}

function rmsOf(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}
