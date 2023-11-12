import Context from "https://deno.land/std@0.168.0/wasi/snapshot_preview1.ts";

const fps = 1.0 / 60.0;

const context = new Context({
  stdin: 0,
  stdout: 1,
  stderr: 2,
  args: [],
  env: {},
});

const memory = new WebAssembly.Memory({
  initial: 128,
  maximum: 128,
});

const importObject = {
  wasi_snapshot_preview1: context.exports,
  env: {
    consoleLog: (pointer: number, length: number) => {
      console.log(decodeString(pointer, length));
    },
    memory: memory,
  },
};

const decodeString = (pointer: number, length: number) => {
  const slice = new Uint8Array(
    memory.buffer, // memory exported from Zig
    pointer,
    length,
  );
  return new TextDecoder().decode(slice);
};

WebAssembly.instantiateStreaming(fetch("./zig-out/bin/teapot.wasm"), importObject).then(
  (result) => {
    const wasmMemoryArray = new Uint8Array(memory.buffer);

    const canvas = document.getElementById("teapot") as HTMLCanvasElement;
    const context2d = canvas.getContext("2d") as CanvasRenderingContext2D;
    const imageData = context2d.createImageData(canvas.width, canvas.height);
    context2d.clearRect(0, 0, canvas.width, canvas.height);
    
    (result.instance.exports.main as CallableFunction)();

    const drawImage = () => {
      (result.instance.exports.updateImage as CallableFunction)(fps);

      const bufferOffset =
        (result.instance.exports.getImagePointer as CallableFunction)();

      const imageDataArray = wasmMemoryArray.slice(
        bufferOffset,
        bufferOffset + canvas.width * canvas.height * 4,
      );
      imageData.data.set(imageDataArray);

      context2d.clearRect(0, 0, canvas.width, canvas.height);
      context2d.putImageData(imageData, 0, 0);
    };
    drawImage();
    console.log(memory.buffer);
    setInterval(() => {
      drawImage();
    }, fps * 1000); // to milliseconds
  },
);
