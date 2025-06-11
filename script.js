const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

const connections = [
  // torso superior
  [33, 11],
  [33, 12],
  [11, 12],

  [11, 23], // hombro izq. al centro de cadera izq.
  [12, 24], // hombro der. al centro de cadera der.

  // Cabeza
  [34, 0],
  [0, 1],
  [0, 2],
  [0, 4],
  [0, 3],
  [1, 2],
  [4, 5],

  // Brazos
  [11, 13],
  [13, 15],
  [15, 17],
  [17, 19],
  [19, 21],
  [12, 14],
  [14, 16],
  [16, 18],
  [18, 20],
  [20, 22],

  // Manos
  [15, 35],
  [35, 36],
  [16, 37],
  [37, 38],

  // Caderas y piernas
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],

  // Pies
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
];

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false,
  });
  video.srcObject = stream;
  return new Promise((res) => (video.onloadedmetadata = () => res(video)));
}

async function main() {
  await tf.setBackend('webgl');
  await setupCamera();
  video.play();

  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.BlazePose,
    { runtime: 'tfjs', modelType: 'full', enableSmoothing: true },
  );

  async function detectPose() {
    const poses = await detector.estimatePoses(video, {
      flipHorizontal: true,
    });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (poses.length > 0) {
      const keypoints = poses[0].keypoints;

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'lime';
      connections.forEach(([i, j]) => {
        const a = keypoints[i],
          b = keypoints[j];
        if (a && b && a.score > 0.5 && b.score > 0.5) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });

      keypoints.forEach((kp, idx) => {
        if (kp.score > 0.5) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = idx >= 33 ? 'cyan' : 'red';
          ctx.fill();
        }
      });
    }

    requestAnimationFrame(detectPose);
  }

  detectPose();
}

main();