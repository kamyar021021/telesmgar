import * as THREE from "three";
import type {
  CharacterDef,
  BiomeDef,
  HudState,
  SkillOffer,
  GameResult,
  EnemyDef,
} from "../types";
import {
  CHARACTERS,
  BIOMES,
  SKILLS,
  ENEMY_TYPES,
  ORB_COLORS,
  xpNeeded,
  SYNERGIES,
} from "./data";
import {
  buildWizard,
  buildEnemy,
  buildDecoration,
  makeGroundTexture,
  bas,
  G,
  buildHeart,
  buildChest,
} from "./models";
import { sfx, playBGM, stopBGM } from "./audio";
import { loadGame, addGold, updateHighScore } from "./save";

interface Enemy {
  mesh: THREE.Group;
  type: string;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  x: number;
  z: number;
  radius: number;
  speed: number;
  dmg: number;
  xp: number;
  atkCd: number;
  atkTimer: number;
  dead: boolean;
  hitFlash: number;
  blinkTimer?: number;
  summonTimer?: number;
  slow: number;
  stun?: number;
}

interface Projectile {
  mesh: THREE.Object3D;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  dmg: number;
  radius: number;
  pierce: number;
  life: number;
  friendly: boolean;
  color: number;
  explosive?: number;
  slow?: number;
  chain?: number;
  hitSet?: Set<Enemy>;
  kind?: "proj" | "meteor" | "mine";
  mineArm?: number;
  isActive?: boolean;
}

interface Orb {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  y: number;
  vy: number;
  xp: number;
  color: number;
  age: number;
  collected: boolean;
}
interface Heart {
  mesh: THREE.Group;
  x: number;
  z: number;
  y: number;
  age: number;
  collected: boolean;
}
interface Chest {
  mesh: THREE.Group;
  x: number;
  z: number;
  collected: boolean;
}
interface Effect {
  mesh: THREE.Mesh | THREE.Group;
  x: number;
  z: number;
  y: number;
  life: number;
  maxLife: number;
  kind: "ring" | "beam" | "aura" | "orbit" | "pulse" | "chain" | "vortex";
  radius?: number;
  damage?: number;
  hitSet?: Set<Enemy>;
  angle?: number;
  data?: any;
}
interface OrbitBody {
  mesh: THREE.Object3D;
  angle: number;
  radius: number;
  speed: number;
  dmg: number;
  kind: "aegis" | "scythe" | "spirit";
  fireTimer?: number;
  level: number;
}
interface FloatingText {
  mesh: THREE.Sprite;
  life: number;
  y: number;
  vy: number;
}

interface Callbacks {
  onHud: (hud: HudState) => void;
  onSkillOffer: (offer: SkillOffer) => void;
  onGameOver: (result: GameResult) => void;
}

const SKILL_CD: Record<string, number> = {
  blade: 0.65,
  fireball: 1.4,
  iceSpear: 1.1,
  chain: 1.9,
  vortex: 3.8,
  aegis: 0,
  meteor: 2.6,
  nova: 2.2,
  spirits: 0,
  beam: 1.6,
  frostMine: 2.6,
  flameAura: 0,
  timeWarp: 8,
  scythe: 0,
  storm: 1.6,
  vamp: 0,
};

function createGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function createVortexTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.translate(64, 64);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(20, 20, 40, 60, 0, 64);
    ctx.bezierCurveTo(-20, 40, -10, 20, 0, 0);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}
const GLOW_TEX = createGlowTexture();
const VORTEX_TEX = createVortexTexture();

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private char: CharacterDef;
  private biome: BiomeDef;
  private cb: Callbacks;
  private player!: THREE.Group;
  private playerX = 0;
  private playerZ = 0;
  private playerHp = 0;
  private playerMaxHp = 0;
  private playerSpeed = 0;
  private playerRadius = 0.7;
  private pickupRadius = 3;
  private damageMult = 1;
  private facingAngle = 0;
  private playerHurtTimer = 0;
  private ground!: THREE.Mesh;
  private chunks = new Map<string, THREE.Group>();
  private readonly chunkSize = 22;
  private readonly chunkRadius = 4;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private projectilePool: Projectile[] = [];
  private orbs: Orb[] = [];
  private hearts: Heart[] = [];
  private chests: Chest[] = [];
  private effects: Effect[] = [];
  private orbits: OrbitBody[] = [];
  private floatingTexts: FloatingText[] = [];
  private skills = new Map<string, number>();
  private skillTimers = new Map<string, number>();
  private saveData = loadGame();
  private xp = 0;
  private xpNeed = 20;
  private level = 1;
  private kills = 0;
  private playTime = 0;
  private screenShake = 0;
  private wave = 0;
  private waveState: "break" | "spawning" | "fighting" = "break";
  private breakTimer = 3;
  private spawnQueue: { type: string; delay: number }[] = [];
  private spawnTimer = 0;
  private timeWarpTimer = 0;
  private timeWarpLevel = 0;
  private bloodMoonTimer = 0;
  private keys = new Set<string>();
  private joystickInput = { x: 0, z: 0 };
  private paused = false;
  private gameOver = false;
  private disposed = false;
  private rafId = 0;
  private orbLifetime = 14;
  private hudTimer = 0;
  private flameAuraMesh: THREE.Mesh | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    characterId: string,
    biomeId: string,
    callbacks: Callbacks,
  ) {
    this.canvas = canvas;
    this.char = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
    this.biome = BIOMES[biomeId] || BIOMES.grass;
    this.cb = callbacks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.biome.sky);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(this.biome.fog, 40, 110);
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500,
    );
    this.setupLights();
    this.setupPlayer();
    this.setupGround();
    this.pickupRadius = this.char.pickup;
    this.skills.set("blade", 1);
    this.xpNeed = xpNeeded(1);
    this.bindInput();
    window.addEventListener("resize", this.onResize);
    this.emitHud();
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(
      this.biome.hemiSky,
      this.biome.hemiGround,
      1.0,
    );
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(15, 30, 10);
    this.scene.add(dir);
    const amb = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(amb);
  }
  private setupPlayer() {
    this.player = buildWizard(this.char);
    this.player.position.set(0, 0, 0);
    this.scene.add(this.player);
    this.playerMaxHp = this.char.hp + this.saveData.upgrades.hp * 20;
    this.playerHp = this.playerMaxHp;
    this.playerSpeed = this.char.speed + this.saveData.upgrades.speed * 0.5;
    this.damageMult =
      this.char.power * (1 + this.saveData.upgrades.damage * 0.1);
  }
  private setupGround() {
    const tex = makeGroundTexture(
      this.biome.ground,
      this.biome.accent,
      this.biome.dark,
    );
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(400, 400);
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.scene.add(this.ground);
  }

  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    if (e.key === "Escape") this.togglePause();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private onResize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public start() {
    this.clock.start();
    playBGM();
    this.loop();
  }
  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    stopBGM();
  }
  public togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
  }
  public setPaused(v: boolean) {
    if (this.gameOver) return;
    this.paused = v;
  }
  public setJoystickInput(x: number, z: number) {
    this.joystickInput.x = x;
    this.joystickInput.z = z;
  }

  public pickSkill(skillId: string) {
    const cur = this.skills.get(skillId) || 0;
    if (cur >= 5) return;
    const next = cur + 1;
    this.skills.set(skillId, next);
    this.skillTimers.set(skillId, 0.2);
    this.setupPassive(skillId, next);

    // چک کردن ترکیب مهارت‌ها
    for (const syn of SYNERGIES) {
      if (this.skills.has(syn.req[0]) && this.skills.has(syn.req[1])) {
        if (!this.skills.has(syn.id)) {
          this.skills.set(syn.id, 1);
          this.spawnFloatingTextRaw(
            this.playerX,
            this.playerZ,
            `ترکیب: ${syn.name}`,
            "#ffd76a",
          );
        }
      }
    }
    this.paused = false;
    sfx.level();
    this.emitHud();
  }

  private loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.paused && !this.gameOver) this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.playTime += dt;
    if (this.timeWarpTimer > 0) this.timeWarpTimer -= dt;
    if (this.bloodMoonTimer > 0) this.bloodMoonTimer -= dt;
    this.updatePlayer(dt);
    this.updateWaves(dt);
    this.updateEnemies(dt);
    this.updateSkills(dt);
    this.updateOrbits(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateOrbs(dt);
    this.updateHearts(dt);
    this.updateChests(dt);
    this.updateFloatingTexts(dt);
    this.updateGround();
    this.updateCamera(dt);
    this.hudTimer += dt;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number) {
    const speed = this.playerSpeed;
    let dx = this.joystickInput.x;
    let dz = this.joystickInput.z;
    if (this.keys.has("w") || this.keys.has("arrowup")) dz -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dz += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    const len = Math.hypot(dx, dz);
    if (len > 0.1) {
      dx /= len;
      dz /= len;
      this.playerX += dx * speed * dt;
      this.playerZ += dz * speed * dt;
    }
    const near = this.nearestEnemy(28);
    if (near) {
      const target = Math.atan2(near.x - this.playerX, near.z - this.playerZ);
      let diff = target - this.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingAngle += diff * Math.min(1, dt * 10);
    } else if (len > 0) {
      const target = Math.atan2(dx, dz);
      let diff = target - this.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingAngle += diff * Math.min(1, dt * 8);
    }
    this.player.position.set(this.playerX, 0, this.playerZ);
    this.player.rotation.y = this.facingAngle;
    if (this.player.userData.crystal) {
      const crystal = this.player.userData.crystal as THREE.Mesh;
      crystal.scale.setScalar(0.22 + Math.sin(this.playTime * 5) * 0.03);
    }
    if (this.playerHurtTimer > 0) this.playerHurtTimer -= dt;
  }

  private updateCamera(dt: number) {
    let targetX = this.playerX;
    let targetZ = this.playerZ + 15;
    let targetY = 22;
    if (this.screenShake > 0) {
      this.screenShake -= dt * 2;
      targetX += (Math.random() - 0.5) * this.screenShake;
      targetZ += (Math.random() - 0.5) * this.screenShake;
      targetY += (Math.random() - 0.5) * this.screenShake;
    }
    this.camera.position.x +=
      (targetX - this.camera.position.x) * Math.min(1, dt * 6);
    this.camera.position.z +=
      (targetZ - this.camera.position.z) * Math.min(1, dt * 6);
    this.camera.position.y +=
      (targetY - this.camera.position.y) * Math.min(1, dt * 6);
    this.camera.lookAt(this.playerX, 0, this.playerZ);
  }

  private updateGround() {
    const snap = 400 / 60;
    this.ground.position.x = Math.floor(this.playerX / snap) * snap;
    this.ground.position.z = Math.floor(this.playerZ / snap) * snap;
    const px = Math.floor(this.playerX / this.chunkSize);
    const pz = Math.floor(this.playerZ / this.chunkSize);
    for (const [key, group] of this.chunks) {
      const [cx, cz] = key.split(",").map(Number);
      if (
        Math.abs(cx - px) > this.chunkRadius ||
        Math.abs(cz - pz) > this.chunkRadius
      ) {
        this.scene.remove(group);
        this.chunks.delete(key);
      }
    }
    for (let dx = -this.chunkRadius; dx <= this.chunkRadius; dx++) {
      for (let dz = -this.chunkRadius; dz <= this.chunkRadius; dz++) {
        const cx = px + dx;
        const cz = pz + dz;
        const key = `${cx},${cz}`;
        if (!this.chunks.has(key)) {
          const g = new THREE.Group();
          const seedBase = cx * 10000 + cz * 37;
          const count = 3 + Math.floor(Math.abs(Math.sin(seedBase)) * 3);
          for (let i = 0; i < count; i++) {
            const dec = buildDecoration(
              this.biome.id as "desert" | "grass",
              seedBase + i * 17,
            );
            dec.position.set(
              cx * this.chunkSize + Math.random() * this.chunkSize,
              0,
              cz * this.chunkSize + Math.random() * this.chunkSize,
            );
            dec.scale.setScalar(0.7 + Math.random() * 0.6);
            g.add(dec);
          }
          this.scene.add(g);
          this.chunks.set(key, g);
        }
      }
    }
  }

  private updateWaves(dt: number) {
    if (this.waveState === "break") {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) this.startWave();
    } else if (this.waveState === "spawning") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
        const item = this.spawnQueue.shift()!;
        this.spawnEnemy(item.type);
        this.spawnTimer = item.delay;
      }
      if (this.spawnQueue.length === 0) this.waveState = "fighting";
    } else if (this.waveState === "fighting") {
      if (this.enemies.filter((e) => !e.dead).length === 0) {
        this.waveState = "break";
        this.breakTimer = 4;
        sfx.wave();
        this.emitHud();
      }
    }
  }

  private startWave() {
    this.wave += 1;
    this.waveState = "spawning";
    this.spawnTimer = 0.2;
    const w = this.wave;
    const isBossWave = w % 5 === 0;
    const count = Math.floor(8 + Math.pow(w, 1.7) * 2.5);

    // رویداد ماه خونین هر ۳ موج
    if (w > 1 && w % 3 === 0) {
      this.bloodMoonTimer = 30; // ۳۰ ثانیه
      this.spawnFloatingTextRaw(
        this.playerX,
        this.playerZ,
        "ماه خونین! طلا ۲ برابر",
        "#ff0044",
      );
    }

    // شانس افتادن صندوق گنج
    if (Math.random() < 0.3 && this.chests.length === 0) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 10;
      this.spawnChest(
        this.playerX + Math.cos(ang) * dist,
        this.playerZ + Math.sin(ang) * dist,
      );
    }

    const available = Object.entries(ENEMY_TYPES).filter(
      ([, d]) => d.wave <= w && !d.boss,
    );
    const list: { type: string; delay: number }[] = [];
    if (isBossWave && w >= 5) {
      let bossType = "titan";
      if (w === 10) bossType = "crimson";
      if (w === 15) bossType = "voidmage";
      list.push({ type: bossType, delay: 0 });
      const extra = Math.floor(count / 2);
      for (let i = 0; i < extra; i++)
        list.push({ type: this.pickWeighted(available), delay: 0.1 });
    } else {
      for (let i = 0; i < count; i++)
        list.push({ type: this.pickWeighted(available), delay: 0.08 });
    }
    this.spawnQueue = list;
    sfx.wave();
    this.emitHud();
  }

  private pickWeighted(available: [string, EnemyDef][]): string {
    const total = available.reduce((s, [, d]) => s + d.weight, 0);
    let r = Math.random() * total;
    for (const [id, d] of available) {
      r -= d.weight;
      if (r <= 0) return id;
    }
    return available[0][0];
  }

  private spawnEnemy(type: string) {
    const def = ENEMY_TYPES[type];
    if (!def) return;
    const mesh = buildEnemy(type, def);
    const angle = Math.random() * Math.PI * 2;
    const dist = 32 + Math.random() * 8;
    const x = this.playerX + Math.cos(angle) * dist;
    const z = this.playerZ + Math.sin(angle) * dist;
    const hpScale = 1 + (this.wave - 1) * 0.18;
    const hp = def.hp * hpScale;
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.enemies.push({
      mesh,
      type,
      def,
      hp,
      maxHp: hp,
      x,
      z,
      radius: def.radius,
      speed: def.speed * (1 + (this.wave - 1) * 0.012),
      dmg: def.dmg * (1 + (this.wave - 1) * 0.05),
      xp: def.xp,
      atkCd: def.atkCd || 1.0,
      atkTimer: 0.5,
      dead: false,
      hitFlash: 0,
      slow: 0,
      blinkTimer: def.blink ? 2 + Math.random() * 2 : undefined,
      summonTimer: def.summon ? 2 : undefined,
    });
  }

  private nearestEnemy(maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = (e.x - this.playerX) ** 2 + (e.z - this.playerZ) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = this.playerX - e.x;
      const dz = this.playerZ - e.z;
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist;
      const nz = dz / dist;
      e.atkTimer -= dt;
      if (e.slow > 0) e.slow -= dt;
      let speedMult = 1;
      if (this.timeWarpTimer > 0) {
        const slowPct = [0, 0.3, 0.4, 0.5, 0.6, 0.7][this.timeWarpLevel] || 0.3;
        speedMult = 1 - slowPct;
      }
      if (this.bloodMoonTimer > 0) speedMult *= 1.2; // سرعت بیشتر در ماه خونین

      if (e.def.ranged) {
        const range = e.def.ranged;
        const stopDist = Math.max(3, range * 0.5);
        if (dist > range) {
          e.x += nx * (e.speed * speedMult) * dt;
          e.z += nz * (e.speed * speedMult) * dt;
        } else if (dist < stopDist) {
          e.x -= nx * (e.speed * 0.6 * speedMult) * dt;
          e.z -= nz * (e.speed * 0.6 * speedMult) * dt;
        }
        if (e.atkTimer <= 0 && dist <= range * 1.1) {
          e.atkTimer = e.atkCd;
          this.enemyShoot(e, nx, nz);
        }
      } else if (e.def.explode) {
        e.x += nx * (e.speed * speedMult) * dt;
        e.z += nz * (e.speed * speedMult) * dt;
        if (dist < e.radius + this.playerRadius + 0.6) {
          this.explodeBomber(e);
          continue;
        }
      } else if (e.def.boss) {
        e.x += nx * (e.speed * speedMult) * dt;
        e.z += nz * (e.speed * speedMult) * dt;
        if (dist < e.radius + this.playerRadius && e.atkTimer <= 0) {
          e.atkTimer = 1.2;
          this.damagePlayer(e.dmg);
        }
      } else {
        const stopDist = e.radius + this.playerRadius + 0.1;
        if (dist > stopDist) {
          const baseSp = e.slow > 0 ? e.speed * 0.5 : e.speed;
          const finalSp = baseSp * speedMult;
          e.x += nx * finalSp * dt;
          e.z += nz * finalSp * dt;
        }
        if (dist < e.radius + this.playerRadius + 0.3 && e.atkTimer <= 0) {
          e.atkTimer = e.atkCd;
          this.damagePlayer(e.dmg);
        }
      }

      if (e.blinkTimer !== undefined) {
        e.blinkTimer -= dt;
        if (e.blinkTimer <= 0 && dist > 6) {
          e.blinkTimer = e.def.blink! + Math.random() * 2;
          const blinkDist = Math.min(dist - 2, 8);
          e.x += nx * blinkDist;
          e.z += nz * blinkDist;
          this.spawnPulse(e.x, e.z, 0.9, 0x9a5ad0, 0.3);
        }
      }
      if (e.summonTimer !== undefined) {
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = e.def.summon!;
          for (let i = 0; i < 2; i++)
            this.spawnEnemyAt(
              "crawler",
              e.x + (Math.random() - 0.5) * 3,
              e.z + (Math.random() - 0.5) * 3,
            );
        }
      }

      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.atan2(nx, nz);
      if (e.type === "crawler" || e.type === "bomber" || e.type === "wraith")
        e.mesh.position.y = Math.sin(this.playTime * 4 + e.x) * 0.12;
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        const intensity = Math.max(0, e.hitFlash / 0.15);
        e.mesh.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.material && "emissive" in m.material)
            (m.material as any).emissive?.setRGB(
              intensity,
              intensity * 0.3,
              intensity * 0.3,
            );
        });
      }
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.dead) {
        this.scene.remove(e.mesh);
        return false;
      }
      return true;
    });
  }

  private spawnEnemyAt(type: string, x: number, z: number) {
    const def = ENEMY_TYPES[type];
    if (!def) return;
    const mesh = buildEnemy(type, def);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const hpScale = 1 + (this.wave - 1) * 0.15;
    const hp = def.hp * hpScale;
    this.enemies.push({
      mesh,
      type,
      def,
      hp,
      maxHp: hp,
      x,
      z,
      radius: def.radius,
      speed: def.speed,
      dmg: def.dmg * 0.8,
      xp: Math.floor(def.xp * 0.4),
      atkCd: 1,
      atkTimer: 1,
      dead: false,
      hitFlash: 0,
      slow: 0,
    });
  }
  private enemyShoot(e: Enemy, nx: number, nz: number) {
    const mesh = new THREE.Mesh(G.ico, bas(0x9aff5a));
    mesh.scale.setScalar(0.28);
    mesh.position.set(e.x, 0.9, e.z);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      x: e.x,
      z: e.z,
      y: 0.9,
      vx: nx * 12,
      vz: nz * 12,
      vy: 0,
      dmg: e.dmg,
      radius: 0.3,
      pierce: 1,
      life: 2.5,
      friendly: false,
      color: 0x9aff5a,
    });
  }
  private explodeBomber(e: Enemy) {
    e.dead = true;
    this.spawnPulse(e.x, e.z, 2.5, 0xff8a3a, 0.5);
    const d = Math.hypot(this.playerX - e.x, this.playerZ - e.z);
    if (d < 3.5) this.damagePlayer(e.dmg);
    sfx.hit();
  }

  private damageEnemy(
    e: Enemy,
    amount: number,
    source?: { x: number; z: number },
  ) {
    if (e.dead) return;
    let dmg = amount;
    if (e.def.armor) dmg *= 1 - e.def.armor;
    e.hp -= dmg;
    e.hitFlash = 0.15;
    this.spawnDamageText(e.x, e.z, dmg, e.def.armor ? "#a0a0a0" : "#ffffff");
    if (e.hp <= 0) this.killEnemy(e, source);
  }

  private killEnemy(e: Enemy, _source?: { x: number; z: number }) {
    if (e.dead) return;
    e.dead = true;
    this.kills += 1;
    this.addXp(e.xp);
    let goldDrop = e.def.boss
      ? 50
      : e.type === "brute" || e.type === "shielder"
        ? 5
        : 1;
    if (this.bloodMoonTimer > 0) goldDrop *= 2; // طلای ۲ برابر در ماه خونین
    addGold(goldDrop);
    if (e.def.boss) this.screenShake = 2;
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(G.box, bas(e.def.color));
      p.scale.setScalar(0.2);
      p.position.set(e.x, 0.5, e.z);
      this.scene.add(p);
      this.effects.push({
        mesh: p,
        x: e.x,
        z: e.z,
        y: 0.5,
        life: 0.5,
        maxLife: 0.5,
        kind: "pulse",
        data: {
          vx: (Math.random() - 0.5) * 8,
          vz: (Math.random() - 0.5) * 8,
          vy: 5,
        },
      });
    }
    if (e.def.boss || Math.random() < 0.08) this.spawnHeart(e.x, e.z);
    const orbCount = 2 + Math.floor(Math.random() * 2) + (e.def.boss ? 8 : 0);
    for (let i = 0; i < orbCount; i++)
      this.spawnOrb(
        e.x + (Math.random() - 0.5) * 1.5,
        e.z + (Math.random() - 0.5) * 1.5,
      );
    this.spawnPulse(e.x, e.z, e.radius * 1.5, e.def.color, 0.3);
    const vamp = this.skills.get("vamp") || 0;
    if (vamp > 0) {
      const heal = [0, 2, 4, 6, 9, 13][vamp];
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
    }
    sfx.kill();
  }

  private damagePlayer(amount: number) {
    if (this.playerHurtTimer > 0) return;
    this.playerHp -= amount;
    this.playerHurtTimer = 0.6;
    this.screenShake = 1.5;
    sfx.hurt();
    this.spawnPulse(this.playerX, this.playerZ, 1.2, 0xff3b3b, 0.3);
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.endGame();
    }
  }
  private endGame() {
    this.gameOver = true;
    stopBGM();
    sfx.gameover();
    updateHighScore(this.wave, this.kills, this.level);
    this.cb.onGameOver({
      wave: this.wave,
      kills: this.kills,
      level: this.level,
      time: this.playTime,
    });
  }

  private addXp(amount: number) {
    this.xp += amount;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level += 1;
      this.xpNeed = xpNeeded(this.level);
      this.openSkillChoice();
    }
  }
  private openSkillChoice() {
    const pool = SKILLS.filter((s) => (this.skills.get(s.id) || 0) < 5);
    if (pool.length === 0) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3).map((s) => s.id);
    this.paused = true;
    this.cb.onSkillOffer({ choices });
    sfx.level();
  }

  private setupPassive(skillId: string, level: number) {
    if (skillId === "aegis") {
      this.orbits = this.orbits.filter((o) => o.kind !== "aegis");
      for (let i = 0; i < level; i++) {
        const mesh = new THREE.Mesh(G.oct, bas(0x8affd0));
        mesh.scale.setScalar(0.28);
        this.scene.add(mesh);
        this.orbits.push({
          mesh,
          angle: (i / level) * Math.PI * 2,
          radius: 2.6,
          speed: 2.5,
          dmg: 6 + level * 3,
          kind: "aegis",
          level,
        });
      }
    } else if (skillId === "scythe") {
      this.orbits = this.orbits.filter((o) => o.kind !== "scythe");
      for (let i = 0; i < level; i++) {
        const mesh = new THREE.Mesh(
          G.box,
          bas(0x9affc8, { transparent: true, opacity: 0.85 }),
        );
        mesh.scale.set(0.15, 0.15, 1.4 + level * 0.2);
        this.scene.add(mesh);
        this.orbits.push({
          mesh,
          angle: (i / level) * Math.PI * 2,
          radius: 3.0 + level * 0.15,
          speed: 3.2,
          dmg: 5 + level * 4,
          kind: "scythe",
          level,
        });
      }
    } else if (skillId === "spirits") {
      this.orbits = this.orbits.filter((o) => o.kind !== "spirit");
      for (let i = 0; i < level; i++) {
        const mesh = new THREE.Mesh(
          G.ico,
          bas(0xa0f0ff, { transparent: true, opacity: 0.9 }),
        );
        mesh.scale.setScalar(0.24);
        this.scene.add(mesh);
        this.orbits.push({
          mesh,
          angle: (i / level) * Math.PI * 2,
          radius: 3.2,
          speed: 1.8,
          dmg: 4 + level * 2,
          kind: "spirit",
          fireTimer: Math.random() * 1.5,
          level,
        });
      }
    }
  }

  private updateSkills(dt: number) {
    for (const [id, level] of this.skills) {
      if (id === "fire_blades" || id === "frozen_storm" || id === "plasma_aura")
        continue; // ترکیب‌ها تایمر ندارند
      const cd = SKILL_CD[id];
      if (!cd || cd === 0) {
        if (id === "flameAura") this.updateFlameAura(dt, level);
        continue;
      }
      let t = this.skillTimers.get(id) ?? 0;
      t -= dt;
      if (t <= 0) {
        t = Math.max(0.15, cd - level * 0.04);
        this.fireSkill(id, level);
      }
      this.skillTimers.set(id, t);
    }
  }

  private fireSkill(id: string, lvl: number) {
    switch (id) {
      case "blade":
        this.fireBlade(lvl);
        break;
      case "fireball":
        this.fireFireball(lvl);
        break;
      case "iceSpear":
        this.fireIceSpear(lvl);
        break;
      case "chain":
        this.fireChain(lvl);
        break;
      case "vortex":
        this.fireVortex(lvl);
        break;
      case "meteor":
        this.fireMeteor(lvl);
        break;
      case "nova":
        this.fireNova(lvl);
        break;
      case "beam":
        this.fireBeam(lvl);
        break;
      case "frostMine":
        this.fireFrostMine(lvl);
        break;
      case "timeWarp":
        this.fireTimeWarp(lvl);
        break;
      case "storm":
        this.fireStorm(lvl);
        break;
    }
  }

  private aimDir(): { dx: number; dz: number; has: boolean } {
    const e = this.nearestEnemy(35);
    if (!e)
      return {
        dx: Math.sin(this.facingAngle),
        dz: Math.cos(this.facingAngle),
        has: false,
      };
    const dx = e.x - this.playerX;
    const dz = e.z - this.playerZ;
    const l = Math.hypot(dx, dz) || 1;
    return { dx: dx / l, dz: dz / l, has: true };
  }

  // ====== OBJECT POOLING ======
  private getProjectileMesh(
    color: number,
    radius: number,
    isGroup: boolean = false,
  ): THREE.Object3D {
    const pooled = this.projectilePool.pop();
    if (pooled) {
      pooled.isActive = true;
      return pooled.mesh;
    } // در یک سیستم کامل باید متریال و مقیاس ریست شود
    // اگر در استخر نبود، جدید بساز
    const group = new THREE.Group();
    const outerMat = new THREE.MeshBasicMaterial({
      color,
      map: GLOW_TEX,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outer = new THREE.Mesh(G.plane, outerMat);
    outer.rotation.x = -Math.PI / 2;
    outer.scale.setScalar(radius * 4);
    group.add(outer);
    const core = new THREE.Mesh(G.sphere, bas(0xffffff));
    core.scale.setScalar(radius * 0.8);
    group.add(core);
    return group;
  }

  private spawnProjectile(
    opts: Partial<Projectile> & {
      x: number;
      z: number;
      vx: number;
      vz: number;
    },
  ) {
    const color = opts.color ?? 0xffffff;
    const group = this.getProjectileMesh(color, opts.radius ?? 0.3);
    group.position.set(opts.x, opts.y ?? 0.9, opts.z);
    this.scene.add(group);
    this.projectiles.push({
      mesh: group,
      x: opts.x,
      z: opts.z,
      y: opts.y ?? 0.9,
      vx: opts.vx,
      vz: opts.vz,
      vy: opts.vy ?? 0,
      dmg: (opts.dmg ?? 10) * this.damageMult,
      radius: opts.radius ?? 0.3,
      pierce: opts.pierce ?? 1,
      life: opts.life ?? 2.5,
      friendly: opts.friendly ?? true,
      color,
      explosive: opts.explosive,
      slow: opts.slow,
      chain: opts.chain,
      hitSet: opts.friendly ? new Set() : undefined,
      kind: opts.kind ?? "proj",
      mineArm: opts.mineArm,
      isActive: true,
    });
  }

  private fireBlade(lvl: number) {
    const count = [0, 1, 2, 3, 4, 6][lvl];
    const dmg = 12 + lvl * 5;
    const hasSynergy = this.skills.has("fire_blades");
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.15;
      const base = this.aimDir();
      const ang = Math.atan2(base.dx, base.dz) + spread;
      const sp = 22;
      const mesh = new THREE.Group();
      const blade = new THREE.Mesh(
        G.tetra,
        bas(hasSynergy ? 0xff4400 : 0xc9a4ff),
      );
      blade.scale.set(0.15, 0.8, 0.05);
      blade.rotation.x = Math.PI / 2;
      mesh.add(blade);
      const glowMat = new THREE.MeshBasicMaterial({
        color: hasSynergy ? 0xff4400 : 0xc9a4ff,
        map: GLOW_TEX,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(G.plane, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.scale.setScalar(1.2);
      mesh.add(glow);
      mesh.rotation.y = ang;
      mesh.position.set(this.playerX, 0.9, this.playerZ);
      this.scene.add(mesh);
      this.projectiles.push({
        mesh,
        x: this.playerX,
        z: this.playerZ,
        y: 0.9,
        vx: Math.sin(ang) * sp,
        vz: Math.cos(ang) * sp,
        vy: 0,
        dmg: dmg * this.damageMult,
        radius: 0.3,
        pierce: 1,
        life: 1.6,
        friendly: true,
        color: hasSynergy ? 0xff4400 : 0xc9a4ff,
        hitSet: new Set(),
        kind: "proj",
        explosive: hasSynergy ? 1.5 : undefined,
      });
    }
    sfx.shoot();
  }

  private fireFireball(lvl: number) {
    const count = lvl >= 3 ? (lvl >= 5 ? 3 : 2) : 1;
    const base = this.aimDir();
    const ang0 = Math.atan2(base.dx, base.dz);
    const dmg = 22 + lvl * 8;
    const explodeR = 1.6 + lvl * 0.3;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.18;
      const ang = ang0 + spread;
      this.spawnProjectile({
        x: this.playerX,
        z: this.playerZ,
        vx: Math.sin(ang) * 15,
        vz: Math.cos(ang) * 15,
        dmg,
        radius: 0.5,
        pierce: 1,
        life: 2,
        color: 0xff4400,
        explosive: explodeR,
      });
    }
    sfx.shoot();
  }

  private fireIceSpear(lvl: number) {
    const base = this.aimDir();
    const pierce = 2 + lvl;
    const dmg = 14 + lvl * 4;
    const ang = Math.atan2(base.dx, base.dz);
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(G.cyl6, bas(0xd0f0ff));
    shaft.scale.set(0.08, 1.5, 0.08);
    shaft.rotation.x = Math.PI / 2;
    group.add(shaft);
    const tip = new THREE.Mesh(G.cone6, bas(0xffffff));
    tip.scale.set(0.15, 0.5, 0.15);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.9;
    group.add(tip);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6fd8ff,
      map: GLOW_TEX,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(G.plane, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.scale.setScalar(2);
    group.add(glow);
    group.rotation.y = ang;
    group.position.set(this.playerX, 0.9, this.playerZ);
    this.scene.add(group);
    this.projectiles.push({
      mesh: group,
      x: this.playerX,
      z: this.playerZ,
      y: 0.9,
      vx: base.dx * 30,
      vz: base.dz * 30,
      vy: 0,
      dmg: dmg * this.damageMult,
      radius: 0.32,
      pierce,
      life: 2,
      friendly: true,
      color: 0x6fd8ff,
      slow: lvl >= 3 ? 1.5 : 0,
      hitSet: new Set(),
      kind: "proj",
    });
    sfx.shoot();
  }

  private fireChain(lvl: number) {
    const targets = 1 + lvl;
    let cur = this.nearestEnemy(20);
    if (!cur) return;
    let fromX = this.playerX,
      fromZ = this.playerZ,
      dmg = 14 + lvl * 4;
    const used = new Set<Enemy>();
    for (let i = 0; i < targets; i++) {
      if (!cur || used.has(cur)) break;
      used.add(cur);
      this.spawnBeam(fromX, fromZ, cur.x, cur.z, 0xffe14d, 0.18);
      this.damageEnemy(cur, dmg);
      fromX = cur.x;
      fromZ = cur.z;
      dmg *= 0.8;
      let next: Enemy | null = null,
        bd = 100;
      for (const e of this.enemies) {
        if (e.dead || used.has(e)) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d < bd && d < 100) {
          bd = d;
          next = e;
        }
      }
      cur = next!;
    }
    sfx.shoot();
  }

  private fireVortex(lvl: number) {
    const e = this.nearestEnemy(22);
    const tx = e ? e.x : this.playerX + Math.sin(this.facingAngle) * 6;
    const tz = e ? e.z : this.playerZ + Math.cos(this.facingAngle) * 6;
    const group = new THREE.Group();
    group.position.set(tx, 0.15, tz);
    const radius = 2.2 + lvl * 0.5;
    const core = new THREE.Mesh(G.sphere, bas(0x220044));
    core.scale.set(radius * 0.3, 0.1, radius * 0.3);
    group.add(core);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0x8a5cff,
      map: VORTEX_TEX,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const swirl = new THREE.Mesh(G.plane, vortexMat);
    swirl.rotation.x = -Math.PI / 2;
    swirl.scale.setScalar(radius * 2.5);
    group.add(swirl);
    this.scene.add(group);
    this.effects.push({
      mesh: group,
      x: tx,
      z: tz,
      y: 0.15,
      life: 1.6 + lvl * 0.35,
      maxLife: 1.6 + lvl * 0.35,
      kind: "vortex",
      radius: radius,
      damage: (5 + lvl * 5) * this.damageMult,
      hitSet: new Set(),
      data: { tick: 0, swirl },
    });
    sfx.shoot();
  }

  private fireTimeWarp(lvl: number) {
    this.timeWarpTimer = 3 + lvl;
    this.timeWarpLevel = lvl;
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1, 32),
      bas(0xc08cff, {
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(this.playerX, 0.1, this.playerZ);
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      x: this.playerX,
      z: this.playerZ,
      y: 0.1,
      life: 1.5,
      maxLife: 1.5,
      kind: "ring",
      radius: 40,
      damage: 0,
      hitSet: new Set(),
    });
    sfx.shoot();
  }

  private fireMeteor(lvl: number) {
    const count = [0, 1, 2, 3, 4, 6][lvl];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.disposed || this.paused) return;
        const ang = Math.random() * Math.PI * 2,
          dist = 3 + Math.random() * 10;
        this.spawnMeteor(
          this.playerX + Math.cos(ang) * dist,
          this.playerZ + Math.sin(ang) * dist,
          25 + lvl * 8,
          3.2,
        );
      }, i * 90);
    }
  }
  private fireNova(lvl: number) {
    const waves = lvl >= 4 ? 2 : 1;
    for (let i = 0; i < waves; i++) {
      setTimeout(() => {
        if (this.disposed) return;
        this.spawnRing(
          this.playerX,
          this.playerZ,
          5 + lvl * 1.2,
          16 + lvl * 6,
          0xffd166,
        );
      }, i * 200);
    }
    sfx.shoot();
  }
  private fireBeam(lvl: number) {
    const base = this.aimDir();
    const count = lvl >= 2 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.2;
      const ang = Math.atan2(base.dx, base.dz) + spread;
      const ex = this.playerX + Math.sin(ang) * 25,
        ez = this.playerZ + Math.cos(ang) * 25;
      this.spawnBeam(
        this.playerX,
        this.playerZ,
        ex,
        ez,
        0xfff3a0,
        0.3,
        18 + lvl * 6,
        0.9 + lvl * 0.1,
      );
    }
    sfx.shoot();
  }
  private fireFrostMine(lvl: number) {
    for (let i = 0; i < lvl + 1; i++) {
      const ang = Math.random() * Math.PI * 2,
        dist = 2 + Math.random() * 6;
      this.spawnMine(
        this.playerX + Math.cos(ang) * dist,
        this.playerZ + Math.sin(ang) * dist,
        20 + lvl * 8,
        2.5,
      );
    }
  }
  private fireStorm(lvl: number) {
    const count = [0, 8, 12, 16, 20, 28][lvl];
    const hasSynergy = this.skills.has("frozen_storm");
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      this.spawnProjectile({
        x: this.playerX,
        z: this.playerZ,
        vx: Math.sin(ang) * 16,
        vz: Math.cos(ang) * 16,
        dmg: 8 + lvl * 3,
        radius: 0.25,
        pierce: 1,
        life: 1.6,
        color: hasSynergy ? 0x6fd8ff : 0xd0a0ff,
        slow: hasSynergy ? 1.5 : 0,
      });
    }
    sfx.shoot();
  }

  private updateFlameAura(dt: number, lvl: number) {
    const radius = 2 + lvl;
    const hasSynergy = this.skills.has("plasma_aura");
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (
        Math.hypot(e.x - this.playerX, e.z - this.playerZ) <
        radius + e.radius
      ) {
        this.damageEnemy(e, (6 + lvl * 2) * dt * 4);
        if (lvl >= 5) e.slow = 0.3;
        if (hasSynergy && Math.random() < 0.05) this.damageEnemy(e, 10); // آسیب برق اضافه
      }
    }
    if (!this.flameAuraMesh) {
      const mat = new THREE.MeshBasicMaterial({
        color: hasSynergy ? 0xffaa00 : 0xff4400,
        map: GLOW_TEX,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.flameAuraMesh = new THREE.Mesh(G.plane, mat);
      this.flameAuraMesh.rotation.x = -Math.PI / 2;
      this.flameAuraMesh.position.y = 0.06;
      this.scene.add(this.flameAuraMesh);
    }
    this.flameAuraMesh.scale.setScalar(radius * 2.5);
    this.flameAuraMesh.position.set(this.playerX, 0.06, this.playerZ);
    this.flameAuraMesh.rotation.z += dt * 2;
  }

  private updateOrbits(dt: number) {
    for (const o of this.orbits) {
      o.angle += o.speed * dt;
      const x = this.playerX + Math.cos(o.angle) * o.radius;
      const z = this.playerZ + Math.sin(o.angle) * o.radius;
      o.mesh.position.set(x, 1.0, z);
      if (o.kind === "scythe") o.mesh.rotation.y = -o.angle;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - x, e.z - z) < e.radius + 0.4) {
          if (!o.mesh.userData.hitCd)
            o.mesh.userData.hitCd = new Map<Enemy, number>();
          const cd = o.mesh.userData.hitCd.get(e) ?? 0;
          if (cd <= 0) {
            this.damageEnemy(e, o.dmg);
            o.mesh.userData.hitCd.set(e, 0.35);
          }
        }
      }
      if (o.mesh.userData.hitCd) {
        for (const [en, t] of o.mesh.userData.hitCd)
          o.mesh.userData.hitCd.set(en, t - dt);
      }
      if (o.kind === "spirit") {
        o.fireTimer = (o.fireTimer ?? 0) - dt;
        if (o.fireTimer <= 0) {
          o.fireTimer = 1.4;
          const e = this.nearestEnemy(20);
          if (e) {
            const dx = e.x - x,
              dz = e.z - z,
              l = Math.hypot(dx, dz) || 1;
            this.spawnProjectile({
              x,
              z,
              y: 1,
              vx: (dx / l) * 18,
              vz: (dz / l) * 18,
              dmg: o.dmg,
              radius: 0.22,
              pierce: 1,
              life: 1.4,
              color: 0xa0f0ff,
            });
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === "meteor") {
        p.vy -= 30 * dt;
        if (p.y <= 0) {
          this.spawnPulse(p.x, p.z, 3, 0xff8a3c, 0.6);
          for (const e of this.enemies) {
            if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 3.2)
              this.damageEnemy(e, p.dmg);
          }
          this.removeProjectile(p);
          continue;
        }
      } else if (p.kind === "mine") {
        p.mineArm = (p.mineArm ?? 0) - dt;
        if (p.mineArm <= 0) {
          const triggered = this.enemies.some(
            (e) => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 1.4,
          );
          if (triggered) {
            this.spawnPulse(p.x, p.z, 2.5, 0x9fe8ff, 0.5);
            for (const e of this.enemies) {
              if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 2.8) {
                this.damageEnemy(e, p.dmg);
                e.slow = 1.5;
              }
            }
            this.removeProjectile(p);
            continue;
          }
        }
      } else {
        if (p.friendly) {
          for (const e of this.enemies) {
            if (e.dead || p.hitSet?.has(e)) continue;
            if (Math.hypot(e.x - p.x, e.z - p.z) < e.radius + p.radius) {
              this.damageEnemy(e, p.dmg);
              p.hitSet?.add(e);
              if (p.slow) e.slow = p.slow;
              if (p.explosive) {
                this.spawnPulse(p.x, p.z, p.explosive, p.color, 0.35);
                for (const en of this.enemies) {
                  if (
                    !en.dead &&
                    en !== e &&
                    Math.hypot(en.x - p.x, en.z - p.z) < p.explosive
                  )
                    this.damageEnemy(en, p.dmg * 0.6);
                }
                p.pierce = 0;
              }
              p.pierce -= 1;
              if (p.pierce <= 0) {
                this.removeProjectile(p);
                break;
              }
            }
          }
        } else {
          if (
            Math.hypot(this.playerX - p.x, this.playerZ - p.z) <
            this.playerRadius + p.radius
          ) {
            this.damagePlayer(p.dmg);
            this.removeProjectile(p);
          }
        }
      }
      if (p.life <= 0) this.removeProjectile(p);
      else {
        p.mesh.position.set(p.x, p.y, p.z);
        if (p.kind !== "mine" && p.kind !== "meteor") {
          p.mesh.rotation.x += dt * 5;
          p.mesh.rotation.y += dt * 5;
        }
      }
    }
    this.projectiles = this.projectiles.filter(
      (p) => p.life > 0 && p.pierce >= 0,
    );
  }

  private removeProjectile(p: Projectile) {
    p.life = -1;
    p.isActive = false;
    this.scene.remove(p.mesh);
    this.projectilePool.push(p);
  }

  private spawnMeteor(tx: number, tz: number, dmg: number, radius: number) {
    const mesh = new THREE.Mesh(G.ico, bas(0xff8a3c));
    mesh.scale.setScalar(0.6);
    mesh.position.set(tx, 25, tz);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      x: tx,
      z: tz,
      y: 25,
      vx: 0,
      vz: 0,
      vy: 0,
      dmg: dmg * this.damageMult,
      radius,
      pierce: 1,
      life: 4,
      friendly: true,
      color: 0xff8a3c,
      kind: "meteor",
    });
  }
  private spawnMine(x: number, z: number, dmg: number, arm: number) {
    const mesh = new THREE.Mesh(G.oct, bas(0x9fe8ff));
    mesh.scale.setScalar(0.35);
    mesh.position.set(x, 0.35, z);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      x,
      z,
      y: 0.35,
      vx: 0,
      vz: 0,
      vy: 0,
      dmg: dmg * this.damageMult,
      radius: 0.4,
      pierce: 1,
      life: 8,
      friendly: true,
      color: 0x9fe8ff,
      kind: "mine",
      mineArm: arm,
    });
  }
  private spawnPulse(
    x: number,
    z: number,
    radius: number,
    color: number,
    life: number,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.4, 16),
      bas(color, {
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      x,
      z,
      y: 0.06,
      life,
      maxLife: life,
      kind: "pulse",
      radius,
      damage: 0,
    });
  }
  private spawnRing(
    x: number,
    z: number,
    maxR: number,
    dmg: number,
    color: number,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.9, 32),
      bas(color, {
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.07, z);
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      x,
      z,
      y: 0.07,
      life: 0.6,
      maxLife: 0.6,
      kind: "ring",
      radius: maxR,
      damage: dmg * this.damageMult,
      hitSet: new Set(),
    });
    sfx.shoot();
  }
  private spawnBeam(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    color: number,
    life: number,
    dmg?: number,
    width = 0.4,
  ) {
    const dx = x2 - x1,
      dz = z2 - z1,
      len = Math.hypot(dx, dz),
      ang = Math.atan2(dx, dz);
    const mesh = new THREE.Mesh(
      G.box,
      bas(color, { transparent: true, opacity: 0.8, depthWrite: false }),
    );
    mesh.scale.set(width, 0.15, len);
    mesh.position.set((x1 + x2) / 2, 1, (z1 + z2) / 2);
    mesh.rotation.y = ang;
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      x: (x1 + x2) / 2,
      z: (z1 + z2) / 2,
      y: 1,
      life,
      maxLife: life,
      kind: "beam",
      damage: 0,
    });
    if (dmg) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const px = e.x - x1,
          pz = e.z - z1;
        const t = (px * dx + pz * dz) / (len * len);
        if (t >= 0 && t <= 1) {
          const cx = x1 + dx * t,
            cz = z1 + dz * t;
          if (Math.hypot(e.x - cx, e.z - cz) < width + e.radius)
            this.damageEnemy(e, dmg);
        }
      }
    }
  }

  private updateEffects(dt: number) {
    for (const e of this.effects) {
      e.life -= dt;
      const t = 1 - e.life / e.maxLife;
      if (e.kind === "ring") {
        e.mesh.scale.setScalar(1 + t * e.radius!);
        ((e.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          0.7 * (1 - t);
        for (const en of this.enemies) {
          if (en.dead || e.hitSet?.has(en)) continue;
          if (Math.hypot(en.x - e.x, en.z - e.z) < t * e.radius!) {
            this.damageEnemy(en, e.damage!);
            e.hitSet?.add(en);
          }
        }
      } else if (e.kind === "pulse") {
        if (e.data) {
          e.mesh.position.x += e.data.vx * dt;
          e.mesh.position.z += e.data.vz * dt;
          e.mesh.position.y += e.data.vy * dt;
          e.data.vy -= 15 * dt;
          ((e.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
            1 - t;
        } else {
          e.mesh.scale.setScalar(1 + t * e.radius!);
          ((e.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
            0.8 * (1 - t);
        }
      } else if (e.kind === "beam") {
        ((e.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          0.8 * (1 - t);
      } else if (e.kind === "vortex") {
        e.data.swirl.rotation.z += dt * 8;
        (e.data.swirl.material as THREE.MeshBasicMaterial).opacity =
          0.9 * (1 - t * 0.6);
        for (const en of this.enemies) {
          if (en.dead) continue;
          const dx = e.x - en.x,
            dz = e.z - en.z,
            d = Math.hypot(dx, dz);
          if (d < e.radius! * 2) {
            const pull = (e.radius! * 2 - d) / (e.radius! * 2);
            en.x += (dx / d) * pull * 4 * dt;
            en.z += (dz / d) * pull * 4 * dt;
            if (d < e.radius!) {
              const data = e.data as any;
              data.tick -= dt;
              if (data.tick <= 0) {
                data.tick = 0.3;
                this.damageEnemy(en, e.damage! * 0.3);
              }
            }
          }
        }
      }
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        if (
          (e.mesh as THREE.Mesh).geometry &&
          !(Object.values(G) as any[]).includes((e.mesh as any).geometry)
        ) {
          (e.mesh as THREE.Mesh).geometry.dispose();
        }
      }
    }
    this.effects = this.effects.filter((e) => e.life > 0);
  }

  private spawnFloatingTextRaw(
    x: number,
    z: number,
    text: string,
    color: string,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 24px Vazirmatn, Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6, 1.5, 1);
    sprite.position.set(x, 3, z);
    this.scene.add(sprite);
    this.floatingTexts.push({ mesh: sprite, life: 1.5, y: 3, vy: 2 });
  }

  private spawnDamageText(x: number, z: number, amount: number, color: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 28px Vazirmatn, Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.floor(amount).toString(), 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 2, 1);
    sprite.position.set(
      x + (Math.random() - 0.5),
      2,
      z + (Math.random() - 0.5),
    );
    this.scene.add(sprite);
    this.floatingTexts.push({ mesh: sprite, life: 0.8, y: 2, vy: 3 });
  }

  private updateFloatingTexts(dt: number) {
    for (const t of this.floatingTexts) {
      t.life -= dt;
      t.y += t.vy * dt;
      t.mesh.position.y = t.y;
      t.mesh.material.opacity = t.life / (t.vy > 2 ? 0.8 : 1.5);
      if (t.life <= 0) this.scene.remove(t.mesh);
    }
    this.floatingTexts = this.floatingTexts.filter((t) => t.life > 0);
  }
  private spawnOrb(x: number, z: number) {
    const color = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
    const mesh = new THREE.Mesh(G.oct, bas(color));
    mesh.scale.setScalar(0.22);
    mesh.position.set(x, 0.4, z);
    this.scene.add(mesh);
    this.orbs.push({
      mesh,
      x,
      z,
      y: 0.4,
      vy: 0,
      xp: 1,
      color,
      age: 0,
      collected: false,
    });
  }

  private updateOrbs(dt: number) {
    for (const o of this.orbs) {
      o.age += dt;
      const dx = this.playerX - o.x,
        dz = this.playerZ - o.z,
        d = Math.hypot(dx, dz);
      if (d < this.pickupRadius) {
        const pull = (1 - d / this.pickupRadius) * 12;
        o.x += (dx / (d || 1)) * pull * dt;
        o.z += (dz / (d || 1)) * pull * dt;
      }
      if (d < 0.7) {
        o.collected = true;
        this.addXp(o.xp);
        sfx.orb();
        this.scene.remove(o.mesh);
        continue;
      }
      if (o.age > this.orbLifetime) {
        o.collected = true;
        this.scene.remove(o.mesh);
        continue;
      }
      o.mesh.position.set(o.x, o.y + Math.sin(o.age * 4) * 0.1, o.z);
      o.mesh.rotation.y += dt * 3;
      o.mesh.rotation.x += dt * 2;
    }
    this.orbs = this.orbs.filter((o) => !o.collected);
  }

  private spawnHeart(x: number, z: number) {
    const mesh = buildHeart();
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);
    this.hearts.push({ mesh, x, z, y: 0.6, age: 0, collected: false });
  }
  private updateHearts(dt: number) {
    for (const h of this.hearts) {
      h.age += dt;
      const dx = this.playerX - h.x,
        dz = this.playerZ - h.z,
        d = Math.hypot(dx, dz);
      if (d < this.pickupRadius) {
        const pull = (1 - d / this.pickupRadius) * 12;
        h.x += (dx / (d || 1)) * pull * dt;
        h.z += (dz / (d || 1)) * pull * dt;
      }
      if (d < 0.8) {
        h.collected = true;
        this.playerHp = Math.min(
          this.playerMaxHp,
          this.playerHp + this.playerMaxHp * 0.25,
        );
        this.spawnPulse(h.x, h.z, 1.5, 0xff3366, 0.4);
        this.scene.remove(h.mesh);
        continue;
      }
      if (h.age > 20) {
        h.collected = true;
        this.scene.remove(h.mesh);
        continue;
      }
      h.mesh.position.set(h.x, h.y + Math.sin(h.age * 5) * 0.15, h.z);
      h.mesh.rotation.y += dt * 2;
    }
    this.hearts = this.hearts.filter((h) => !h.collected);
  }

  private spawnChest(x: number, z: number) {
    const mesh = buildChest();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.chests.push({ mesh, x, z, collected: false });
  }
  private updateChests(dt: number) {
    for (const c of this.chests) {
      const d = Math.hypot(this.playerX - c.x, this.playerZ - c.z);
      if (d < 1.5) {
        c.collected = true;
        addGold(50);
        this.spawnFloatingTextRaw(c.x, c.z, "+50 طلا", "#ffd76a");
        this.scene.remove(c.mesh);
        for (let i = 0; i < 5; i++) this.spawnOrb(c.x, c.z);
      }
    }
    this.chests = this.chests.filter((c) => !c.collected);
  }

  private emitHud() {
    const skillsList = Array.from(this.skills.entries()).map(([id, level]) => ({
      id,
      level,
    }));
    this.cb.onHud({
      hp: Math.max(0, Math.ceil(this.playerHp)),
      maxHp: Math.ceil(this.playerMaxHp),
      xp: this.xp,
      xpNeed: this.xpNeed,
      wave: this.wave,
      level: this.level,
      kills: this.kills,
      skills: skillsList,
    });
  }
}
