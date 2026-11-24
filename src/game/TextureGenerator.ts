import Phaser from 'phaser';
import { HERO_LIST } from '../data/heroes';
import { HeroId } from '../types/game';

function createCanvasTex(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void {
  if (scene.textures.exists(key)) return;
  const canvasTex = scene.textures.createCanvas(key, width, height);
  if (!canvasTex) return;
  const ctx = canvasTex.getContext();
  ctx.clearRect(0, 0, width, height);
  draw(ctx, width, height);
  canvasTex.refresh();
}

export function generateAllGameTextures(scene: Phaser.Scene): void {
  // 1. Hero textures (stylized faceless 2.5D top-down fantasy characters)
  for (const hero of HERO_LIST) {
    generateHeroTexture(scene, hero.id, hero.primaryColor, hero.secondaryColor);
  }

  // 2. Minions (Blue & Red, Melee & Ranged)
  generateMinionTexture(scene, 'minion_blue_melee', '#1d4ed8', '#38bdf8', '#d4af37', false);
  generateMinionTexture(scene, 'minion_blue_ranged', '#0369a1', '#2dd4bf', '#fdfbf7', true);
  generateMinionTexture(scene, 'minion_red_melee', '#b91c1c', '#f87171', '#f59e0b', false);
  generateMinionTexture(scene, 'minion_red_ranged', '#991b1b', '#fb923c', '#fef3c7', true);

  // 3. Turrets & Energy Cores
  generateTurretTexture(scene, 'turret_blue', '#0ea5e9', '#38bdf8');
  generateTurretTexture(scene, 'turret_red', '#ef4444', '#fb923c');
  generateCoreTexture(scene, 'core_blue', '#0284c7', '#38bdf8');
  generateCoreTexture(scene, 'core_red', '#dc2626', '#f97316');

  // 4. Neutral Crystal Guardians
  generateGuardianTexture(scene, 'guardian_emerald', '#059669', '#6ee7b7');
  generateGuardianTexture(scene, 'guardian_gold', '#d97706', '#fde68a');

  // 5. Projectiles & FX
  createCanvasTex(scene, 'proj_arrow', 28, 12, (ctx) => {
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.lineTo(24, 6);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(27, 6);
    ctx.lineTo(18, 2);
    ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
  });

  createCanvasTex(scene, 'proj_orb_teal', 24, 24, (ctx) => {
    const grad = ctx.createRadialGradient(12, 12, 2, 12, 12, 11);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#2dd4bf');
    grad.addColorStop(1, 'rgba(20, 184, 166, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  createCanvasTex(scene, 'proj_orb_blue', 22, 22, (ctx) => {
    const grad = ctx.createRadialGradient(11, 11, 2, 11, 11, 10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#38bdf8');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(11, 11, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  createCanvasTex(scene, 'proj_orb_red', 22, 22, (ctx) => {
    const grad = ctx.createRadialGradient(11, 11, 2, 11, 11, 10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#fb7185');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(11, 11, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  createCanvasTex(scene, 'proj_orb_gold', 24, 24, (ctx) => {
    const grad = ctx.createRadialGradient(12, 12, 2, 12, 12, 11);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  createCanvasTex(scene, 'particle_light', 16, 16, (ctx) => {
    const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 6. Garden Tree / Palm & Pillar textures
  createCanvasTex(scene, 'garden_tree', 140, 140, (ctx) => {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(74, 78, 56, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone planter rim
    ctx.fillStyle = '#c8b282';
    ctx.strokeStyle = '#8b6f3d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(70, 70, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lush emerald foliage cluster
    const leaves = [
      { x: 70, y: 70, r: 44, c: '#065f46' },
      { x: 54, y: 58, r: 28, c: '#047857' },
      { x: 86, y: 60, r: 28, c: '#059669' },
      { x: 70, y: 84, r: 26, c: '#047857' },
      { x: 70, y: 66, r: 22, c: '#10b981' },
    ];
    for (const l of leaves) {
      ctx.fillStyle = l.c;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Small white blossoms
    ctx.fillStyle = '#fdfbf7';
    for (const [bx, by] of [[52, 52], [88, 62], [66, 86], [76, 48]]) {
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  createCanvasTex(scene, 'palace_pillar', 124, 124, (ctx) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(66, 68, 50, 0, Math.PI * 2);
    ctx.fill();

    // Octagonal marble base
    ctx.fillStyle = '#e7dec8';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const px = 62 + Math.cos(a) * 48;
      const py = 62 + Math.sin(a) * 48;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden dome cap
    const grad = ctx.createRadialGradient(56, 54, 4, 62, 62, 34);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(1, '#92400e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(62, 62, 32, 0, Math.PI * 2);
    ctx.fill();
  });
}

function generateHeroTexture(
  scene: Phaser.Scene,
  heroId: HeroId,
  primary: string,
  secondary: string
): void {
  createCanvasTex(scene, `hero_${heroId}`, 84, 84, (ctx) => {
    const cx = 42;
    const cy = 42;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing cloak / mantle (pointing slightly downward/back)
    ctx.fillStyle = primary;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 21, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shoulder pauldrons
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 14, cy, 8, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Faceless stylized hooded/helmeted head
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Luminous visor / ornament (facing right = +X in Phaser rotation=0)
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 2, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Unique weapon silhouettes facing +X
    if (heroId === 'amin') {
      // Golden Tower Shield in front
      ctx.fillStyle = '#065f46';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx + 12, cy - 16, 10, 32, 4);
      ctx.fill();
      ctx.stroke();
    } else if (heroId === 'faris') {
      // Curved desert bow
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + 10, cy, 18, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
    } else if (heroId === 'hakim') {
      // Floating crystal star orb
      ctx.fillStyle = '#2dd4bf';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 22, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (heroId === 'zahra') {
      // Emerald sanctuary staff
      ctx.strokeStyle = '#fdfbf7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy + 12);
      ctx.lineTo(cx + 24, cy - 12);
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(cx + 24, cy - 12, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (heroId === 'zaid') {
      // Twin wind scimitars
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 10);
      ctx.quadraticCurveTo(cx + 26, cy - 18, cx + 30, cy - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy + 10);
      ctx.quadraticCurveTo(cx + 26, cy + 18, cx + 30, cy + 2);
      ctx.stroke();
    }
  });
}

function generateMinionTexture(
  scene: Phaser.Scene,
  key: string,
  bodyColor: string,
  glowColor: string,
  trimColor: string,
  isRanged: boolean
): void {
  createCanvasTex(scene, key, 48, 48, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(24, 28, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, isRanged ? 11 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(28, 24, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function generateTurretTexture(
  scene: Phaser.Scene,
  key: string,
  crystalColor: string,
  glowColor: string
): void {
  createCanvasTex(scene, key, 110, 110, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(57, 63, 42, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sandstone octagonal pedestal
    ctx.fillStyle = '#d6c39b';
    ctx.strokeStyle = '#927238';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x = 55 + Math.cos(a) * 40;
      const y = 55 + Math.sin(a) * 40;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner gold ring
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(55, 55, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing crystal spire
    const grad = ctx.createRadialGradient(55, 55, 3, 55, 55, 22);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, glowColor);
    grad.addColorStop(1, crystalColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(55, 34);
    ctx.lineTo(74, 55);
    ctx.lineTo(55, 76);
    ctx.lineTo(36, 55);
    ctx.closePath();
    ctx.fill();
  });
}

function generateCoreTexture(
  scene: Phaser.Scene,
  key: string,
  crystalColor: string,
  glowColor: string
): void {
  createCanvasTex(scene, key, 150, 150, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(77, 82, 62, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grand 8-pointed marble platform
    ctx.fillStyle = '#ede4cf';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.save();
    ctx.translate(75, 75);
    ctx.fillRect(-44, -44, 88, 88);
    ctx.strokeRect(-44, -44, 88, 88);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-44, -44, 88, 88);
    ctx.strokeRect(-44, -44, 88, 88);
    ctx.restore();

    // Deep sapphire/navy core basin
    ctx.fillStyle = '#091526';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(75, 75, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radiant central crystal
    const grad = ctx.createRadialGradient(75, 75, 4, 75, 75, 30);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, glowColor);
    grad.addColorStop(1, crystalColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(75, 44);
    ctx.lineTo(104, 75);
    ctx.lineTo(75, 106);
    ctx.lineTo(46, 75);
    ctx.closePath();
    ctx.fill();
  });
}

function generateGuardianTexture(
  scene: Phaser.Scene,
  key: string,
  primary: string,
  glow: string
): void {
  createCanvasTex(scene, key, 96, 96, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(48, 55, 30, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.strokeStyle = glow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const x = 48 + Math.cos(a) * 28;
      const y = 48 + Math.sin(a) * 28;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(48, 48, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(48, 48, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}
