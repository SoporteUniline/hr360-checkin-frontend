// lib/faceapi.js
import * as faceapi from "face-api.js";

export async function loadFaceApiModels(basePath = "/models") {
  await faceapi.nets.ssdMobilenetv1.loadFromUri(basePath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(basePath);
  await faceapi.nets.faceRecognitionNet.loadFromUri(basePath);
}

export { faceapi };
export const isFaceApiReady = () => !!faceapi.nets.ssdMobilenetv1.params;
