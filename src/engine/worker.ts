/// <reference lib="webworker" />
import { gradePixels } from "./pixels";
self.onmessage = (event) => {
  const { id, buffer, width, height, adjustments } = event.data;
  const data = gradePixels(
    new Uint8ClampedArray(buffer),
    width,
    height,
    adjustments,
  );
  self.postMessage({ id, buffer: data.buffer }, [data.buffer]);
};
