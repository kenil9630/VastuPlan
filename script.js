const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');
const tooltip = document.getElementById('tooltip');
const hintText = document.getElementById('hint-text');
const calibDegreeInput = document.getElementById('calib-degree');
const gridIntervalInput = document.getElementById('grid-interval');
const snapToggle = document.getElementById('snap-toggle');

let img = new Image();
let centerPoint = null;
let refPoint = null;
let scale = 1;
let offset = { x: 0, y: 0 };
let isImageLoaded = false;
let currentDirection = 'CW'; // 'CW' or 'ACW'

const VASTU_ZONES = [
    { name: 'N', angle: 0 },
    { name: 'NNE', angle: 22.5 },
    { name: 'NE', angle: 45 },
    { name: 'ENE', angle: 67.5 },
    { name: 'E', angle: 90 },
    { name: 'ESE', angle: 112.5 },
    { name: 'SE', angle: 135 },
    { name: 'SSE', angle: 157.5 },
    { name: 'S', angle: 180 },
    { name: 'SSW', angle: 202.5 },
    { name: 'SW', angle: 225 },
    { name: 'WSW', angle: 247.5 },
    { name: 'W', angle: 270 },
    { name: 'WNW', angle: 292.5 },
    { name: 'NW', angle: 315 },
    { name: 'NNW', angle: 337.5 }
];

window.onload = () => {
    img.onload = () => {
        isImageLoaded = true;
        resizeCanvas();
        updateHint();
        draw();
    };
    img.onerror = () => {
        isImageLoaded = false;
        updateHint();
    };
    // Try to load Map.jpg if it exists
    img.src = 'Map.jpg';
};

function setDirection(dir) {
    currentDirection = dir;
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`toggle-${dir.toLowerCase()}`).classList.add('active');
    if (refPoint) draw();
}

calibDegreeInput.oninput = () => {
    if (refPoint) draw();
};

gridIntervalInput.oninput = () => {
    if (centerPoint) draw();
};

function updateHint() {
    if (!isImageLoaded) {
        hintText.innerText = "Please upload a floor plan image to begin.";
        updateUI(1);
    } else if (!centerPoint) {
        hintText.innerText = "Click on the center of your floor plan (Brahmasthan).";
        updateUI(1);
    } else if (!refPoint) {
        const deg = calibDegreeInput.value;
        const dirText = currentDirection === 'CW' ? 'clockwise' : 'anticlockwise';
        hintText.innerText = `Click on a point to set as ${deg}° ${dirText} from North. Use the grid for precision.`;
        updateUI(2);
    } else {
        hintText.innerText = "Analysis complete. Use calibration settings to fine-tune.";
        updateUI(3);
    }
}

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    if (img.width > 0) {
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        scale = Math.min(hRatio, vRatio) * 0.95;
        offset.x = (canvas.width - img.width * scale) / 2;
        offset.y = (canvas.height - img.height * scale) / 2;
    }
}

window.addEventListener('resize', resizeCanvas);

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        img.src = event.target.result;
        resetPoints();
    };
    reader.readAsDataURL(file);
};

canvas.addEventListener('mousedown', (e) => {
    if (!isImageLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    if (!centerPoint) {
        centerPoint = { x: rawX, y: rawY };
    } else if (!refPoint) {
        if (snapToggle.checked) {
            const dx = rawX - centerPoint.x;
            const dy = rawY - centerPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

            const interval = parseFloat(gridIntervalInput.value) || 2;
            const snappedAngleDeg = Math.round(angleDeg / interval) * interval;
            const snappedAngleRad = snappedAngleDeg * Math.PI / 180;

            refPoint = {
                x: centerPoint.x + Math.cos(snappedAngleRad) * dist,
                y: centerPoint.y + Math.sin(snappedAngleRad) * dist
            };
        } else {
            refPoint = { x: rawX, y: rawY };
        }
    }
    updateHint();
    draw();
});

function updateUI(step) {
    document.querySelectorAll('.status-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
}

function resetPoints() {
    centerPoint = null;
    refPoint = null;
    updateHint();
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isImageLoaded) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
        ctx.globalAlpha = 1.0;
    }

    if (centerPoint) {
        drawAngularGrid();
        drawPoint(centerPoint, '#6366f1', 'Center');
    }

    if (refPoint) {
        const deg = parseFloat(calibDegreeInput.value) || 0;
        drawPoint(refPoint, '#10b981', `${deg}° Ref`);
        drawVastuGrid();
    }
}

function drawAngularGrid() {
    const interval = parseFloat(gridIntervalInput.value) || 2;
    const radius = Math.max(canvas.width, canvas.height) * 2;

    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 0.5;

    for (let a = 0; a < 360; a += interval) {
        const rad = a * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(centerPoint.x, centerPoint.y);
        ctx.lineTo(centerPoint.x + Math.cos(rad) * radius, centerPoint.y + Math.sin(rad) * radius);

        if (a % 10 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.setLineDash([]);
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.setLineDash([2, 4]);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawPoint(p, color, label) {
    // Glow effect
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'black';
    ctx.fillText(label, p.x, p.y - 15);
    ctx.shadowBlur = 0;
}

function drawVastuGrid() {
    const dx = refPoint.x - centerPoint.x;
    const dy = refPoint.y - centerPoint.y;
    const clickAngleRad = Math.atan2(dy, dx);
    let clickAngleDeg = (clickAngleRad * 180 / Math.PI + 360) % 360;

    const calibDeg = parseFloat(calibDegreeInput.value) || 0;

    // Logic: NorthAngleCanvas + (Clockwise Offset) = clickAngleDeg
    // Clockwise offset is calibDeg if CW, and (360 - calibDeg) if ACW (or just -calibDeg)
    let northAngleCanvas;
    if (currentDirection === 'CW') {
        northAngleCanvas = (clickAngleDeg - calibDeg + 360) % 360;
    } else {
        // Anticlockwise from North means NorthAngleCanvas - calibDeg = clickAngleDeg
        // Wait, North is 0. If we go 30 deg Anti-CW, we are at 330 deg.
        // So NorthAngleCanvas + 330 = clickAngleDeg -> NorthAngleCanvas = clickAngleDeg - 330
        northAngleCanvas = (clickAngleDeg + calibDeg + 360) % 360;
    }

    const radius = Math.max(canvas.width, canvas.height) * 2;

    ctx.save();
    VASTU_ZONES.forEach((zone, index) => {
        const startAngle = (northAngleCanvas + zone.angle - 11.25) * Math.PI / 180;
        const midAngle = (northAngleCanvas + zone.angle) * Math.PI / 180;

        // Sector line
        ctx.beginPath();
        ctx.moveTo(centerPoint.x, centerPoint.y);
        ctx.lineTo(centerPoint.x + Math.cos(startAngle) * radius, centerPoint.y + Math.sin(startAngle) * radius);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlighting major directions
        if (zone.angle % 90 === 0) {
            ctx.beginPath();
            ctx.moveTo(centerPoint.x, centerPoint.y);
            ctx.lineTo(centerPoint.x + Math.cos(midAngle) * radius, centerPoint.y + Math.sin(midAngle) * radius);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Label Position
        const labelRadius = Math.min(canvas.width, canvas.height) * 0.44;
        const lx = centerPoint.x + Math.cos(midAngle) * labelRadius;
        const ly = centerPoint.y + Math.sin(midAngle) * labelRadius;

        ctx.save();
        ctx.translate(lx, ly);

        // Text readability logic
        let rotate = midAngle + Math.PI / 2;
        if (midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2) {
            rotate -= Math.PI;
        }
        ctx.rotate(rotate);

        // Label background for extreme readability
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.roundRect(-25, -12, 50, 24, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name, 0, -2);

        ctx.font = '8px Inter';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(zone.angle + '°', 0, 7);
        ctx.restore();
    });
    ctx.restore();
}

function downloadResult() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw background color (dark) to preserve professional look in exported image
    tempCtx.fillStyle = '#020617';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Re-draw current canvas content onto temp canvas
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `VastuAlign_${new Date().getTime()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}
