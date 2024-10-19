import * as wavEncoder from 'wav-encoder';

export async function encodeWAV(audioBuffer) {
  const wavData = await wavEncoder.encode({
    sampleRate: audioBuffer.sampleRate,
    channelData: [audioBuffer.getChannelData(0)] // 单声道
  });
  return wavData;
}