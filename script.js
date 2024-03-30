const videoElement = document.getElementById('video');
videoElement.muted = true;
videoElement.playsInline = true;
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

let url = new URL(window.location.href);
let params = new URLSearchParams(url.search);

const isFullScreen = params.get('isFullScreen') || false;
const isBackCamera = params.get('isBackCamera') || false;

if (isFullScreen) {
    canvasCtx.canvas.width = window.innerWidth;
    canvasCtx.canvas.height = window.innerHeight;
}

function onWindowResized() {
    if (isFullScreen) {
        canvasCtx.canvas.width = window.innerWidth;
        canvasCtx.canvas.height = window.innerHeight;
        canvasCtx.canvas.style.width = '100vw';
        canvasCtx.canvas.style.height = '100vh';
    }
}

window.addEventListener('resize', onWindowResized);


const POSE_CONNECTIONS = [
    [8, 5],
    [5, 0],
    [0, 2],
    [2, 7],
    [10, 9],
    [20, 18],
    [20, 16],
    [18, 16],
    [16, 22],
    [16, 14],
    [14, 12],
    [12, 11],
    [11, 13],
    [13, 15],
    [15, 17],
    [15, 19],
    [15, 21],
    [19, 17],
    [12, 24],
    [11, 23],
    [24, 23],
    [24, 26],
    [23, 25],
    [26, 28],
    [25, 27],
    [28, 32],
    [28, 30],
    [32, 30],
    [27, 31],
    [27, 29],
    [29, 31],
];

let lastTimestamp = performance.now();
let frameCount = 0;

function onResults(results) {
    const now = performance.now();
    const elapsed = now - lastTimestamp;
    let fps = 0;
    frameCount++;

    if (elapsed > 1000) {
        lastTimestamp = now;
        fps = frameCount / (elapsed / 1000);
        console.log(`FPS: ${fps.toFixed(2)}`);
        frameCount = 0;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    // flip horizontally for mirrored view
    if (!isBackCamera) {
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
    }

    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.poseLandmarks) {
        // console.log(results.poseLandmarks);
        for (let i = 0; i < results.poseLandmarks.length; i++) {
            // console.log(`Landmark ${i}: (${results.poseLandmarks[i].x}, ${results.poseLandmarks[i].y})`);
        }
        window?.ReactNativeWebView?.postMessage(JSON.stringify(
            {
                pose: JSON.stringify(results.poseLandmarks),
                // fps: fps.toFixed(2)
            }
        ));
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       {color: 'white', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      {color: 'white', lineWidth: 2, radius: 4});
    }
    canvasCtx.restore();
}

const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);

new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({image: videoElement});
    },
    width: 1080,
    height: 720,
    facingMode: isBackCamera ? 'environment' : 'user'
}).start().then(() => {
    if (videoElement.readyState >= 3) {
        videoElement.play();
    } else {
        videoElement.addEventListener('canplay', () => videoElement.play());
    }
});
