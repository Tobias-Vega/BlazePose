const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

let fruits = [];
let score = 0;
let detector = null;

const connections = [
  [11, 12], [11, 13], [13, 15],
  [12, 14], [14, 16], [15, 17],
  [16, 18], [23, 24], [23, 25],
  [25, 27], [24, 26], [26, 28],
  [27, 29], [28, 30],
];

function spawnFruit() {
  const types = ['🍉', '🍌', '🍎', '🍓', '🍊', '🍍', '🍇', '🥝', '🍒', '🥥'];
  const type = types[Math.floor(Math.random() * types.length)];
  fruits.push({
    x: Math.random() * canvas.width,
    y: -30,
    radius: 20,
    velocityY: 3 + Math.random() * 2,
    type,
    cut: false,
  });
}

function drawFruits() {
  ctx.font = '30px Arial';
  for (let fruit of fruits) {
    if (!fruit.cut) {
      ctx.fillText(fruit.type, fruit.x, fruit.y);
    }
  }
}

function updateFruits() {
  fruits.forEach((fruit) => {
    if (!fruit.cut) {
      fruit.y += fruit.velocityY;
    }
  });
  fruits = fruits.filter((f) => f.y < canvas.height && !f.cut);
}

function detectCuts(hands) {
  for (let fruit of fruits) {
    if (fruit.cut) continue;
    for (let hand of hands) {
      const dx = fruit.x - hand.x;
      const dy = fruit.y - hand.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < fruit.radius + 20) {
        fruit.cut = true;
        score++;
        hud.textContent = `Puntaje: ${score}`;
        break;
      }
    }
  }
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false,
  });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

async function initGame() {
  await tf.setBackend('webgl');
  await setupCamera();
  video.play();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.BlazePose,
    {
      runtime: 'tfjs',
      modelType: 'full',
      enableSmoothing: true,
    }
  );

  setInterval(spawnFruit, 2500);
  detectPose();
}

window.onload = () => {
  initGame();
};

async function detectPose() {
  const poses = await detector.estimatePoses(video, {
    flipHorizontal: true,
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let hands = [];

  if (poses.length > 0) {
    const keypoints = poses[0].keypoints;

    const leftWrist = keypoints[15];
    const rightWrist = keypoints[16];

    if (leftWrist && leftWrist.score > 0.5) hands.push(leftWrist);
    if (rightWrist && rightWrist.score > 0.5) hands.push(rightWrist);

    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 2;
    connections.forEach(([i, j]) => {
      const a = keypoints[i], b = keypoints[j];
      if (a && b && a.score > 0.5 && b.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });

    keypoints.forEach((kp) => {
      if (kp.score > 0.5) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    });
  }

  updateFruits();
  detectCuts(hands);
  drawFruits();

  requestAnimationFrame(detectPose);
}

startBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  initGame();
});
