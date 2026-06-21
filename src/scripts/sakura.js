const canvas = document.getElementById('sakura-canvas');
if (!canvas) throw new Error('Canvas element not found');

const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const petalCount = 30;
const petals = [];

class Petal {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height - height;
    this.size = Math.random() * 6 + 5;
    this.speedX = Math.random() * 1.2 - 0.4;
    this.speedY = Math.random() * 0.8 + 0.8;
    this.angle = Math.random() * 360;
    this.spin = Math.random() * 1.6 - 0.8;
    this.opacity = Math.random() * 0.3 + 0.4;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.spin;
    if (this.y > height) {
      this.y = -20;
      this.x = Math.random() * width;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    ctx.fillStyle = `rgba(255, 183, 197, ${this.opacity})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-this.size, -this.size, -this.size / 2, -this.size * 1.5);
    ctx.quadraticCurveTo(0, -this.size * 2, this.size / 2, -this.size * 1.5);
    ctx.quadraticCurveTo(this.size, -this.size, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function init() {
  petals.length = 0;
  for (let i = 0; i < petalCount; i++) {
    petals.push(new Petal());
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  petals.forEach(petal => {
    petal.update();
    petal.draw();
  });
  requestAnimationFrame(animate);
}

init();
animate();
