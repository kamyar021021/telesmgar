import * as THREE from "three";
import type { CharacterDef, EnemyDef } from "../types";

export const lam = (
  color: number,
  opts: THREE.MeshLambertMaterialParameters = {},
) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
export const bas = (
  color: number,
  opts: THREE.MeshBasicMaterialParameters = {},
) => new THREE.MeshBasicMaterial({ color, ...opts });

const G = {
  ico: new THREE.IcosahedronGeometry(1, 0),
  oct: new THREE.OctahedronGeometry(1, 0),
  tetra: new THREE.TetrahedronGeometry(1, 0),
  cone6: new THREE.ConeGeometry(1, 1, 6),
  cone7: new THREE.ConeGeometry(1, 1, 7),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 12),
  plane: new THREE.PlaneGeometry(1, 1),
};
export { G };

let _shadowTex: THREE.CanvasTexture | null = null;
function shadowTexture(): THREE.CanvasTexture {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(0,0,0,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

export function makeShadow(size: number): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    depthWrite: false,
  });
  const m = new THREE.Mesh(G.plane, mat);
  m.rotation.x = -Math.PI / 2;
  m.scale.setScalar(size);
  m.position.y = 0.02;
  return m;
}

export function buildWizard(c: CharacterDef): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const robeMat = lam(c.robe);
  const mainMat = lam(c.color);
  const skinMat = lam(c.skin);
  const robe = new THREE.Mesh(G.cone7, robeMat);
  robe.scale.set(0.85, 1.9, 0.85);
  robe.position.y = 1.0;
  body.add(robe);
  const head = new THREE.Mesh(G.sphere, skinMat);
  head.scale.set(0.38, 0.38, 0.38);
  head.position.y = 2.15;
  body.add(head);

  if (c.id === "pyra") {
    const hat = new THREE.Mesh(G.cone7, mainMat);
    hat.scale.set(0.5, 1.1, 0.5);
    hat.position.y = 2.8;
    hat.rotation.z = 0.15;
    body.add(hat);
    const staff = new THREE.Mesh(G.cyl6, lam(0x4a2a1a));
    staff.scale.set(0.06, 2.2, 0.06);
    staff.position.set(0.8, 1.1, 0);
    staff.rotation.z = -0.2;
    body.add(staff);
    const orb = new THREE.Mesh(
      G.sphere,
      bas(0xff4400, { transparent: true, opacity: 0.8 }),
    );
    orb.scale.setScalar(0.25);
    orb.position.set(0.95, 2.2, 0);
    body.add(orb);
  } else if (c.id === "frost") {
    const crown = new THREE.Mesh(G.tetra, bas(0xaaeaff));
    crown.scale.set(0.4, 0.4, 0.4);
    crown.position.y = 2.5;
    crown.rotation.x = Math.PI;
    body.add(crown);
    const staff = new THREE.Mesh(G.cyl6, lam(0xd0e0ff));
    staff.scale.set(0.04, 2.0, 0.04);
    staff.position.set(0.8, 1.1, 0);
    body.add(staff);
    const crystal = new THREE.Mesh(G.oct, bas(0xffffff));
    crystal.scale.set(0.2, 0.5, 0.2);
    crystal.position.set(0.8, 2.2, 0);
    body.add(crystal);
  } else if (c.id === "nyx") {
    const hood = new THREE.Mesh(G.sphere, lam(0x110022));
    hood.scale.set(0.45, 0.45, 0.45);
    hood.position.y = 2.15;
    body.add(hood);
    const staff = new THREE.Mesh(G.cyl6, lam(0x222222));
    staff.scale.set(0.05, 2.3, 0.05);
    staff.position.set(0.8, 1.1, 0);
    body.add(staff);
    const dagger = new THREE.Mesh(G.cone6, bas(0xaa00ff));
    dagger.scale.set(0.1, 0.4, 0.1);
    dagger.position.set(0.8, 2.3, 0);
    body.add(dagger);
  } else if (c.id === "verd") {
    const hat = new THREE.Mesh(G.cone6, lam(0x2d5a27));
    hat.scale.set(0.6, 0.8, 0.6);
    hat.position.y = 2.5;
    body.add(hat);
    const staff = new THREE.Mesh(G.cyl6, lam(0x5a3a1a));
    staff.scale.set(0.07, 2.0, 0.07);
    staff.position.set(0.8, 1.1, 0);
    body.add(staff);
    const leaf = new THREE.Mesh(G.tetra, bas(0x62e07a));
    leaf.scale.set(0.3, 0.3, 0.3);
    leaf.position.set(0.8, 2.1, 0);
    body.add(leaf);
  }

  root.add(makeShadow(2.2));
  root.userData.crystal = body.children.find(
    (c) => c.position.x > 0.5 && c.position.y > 2,
  );
  return root;
}

export function buildEnemy(type: string, def: EnemyDef): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const c = def.color;
  const mat = lam(c, { flatShading: false });
  const dark = lam(new THREE.Color(c).multiplyScalar(0.5).getHex(), {
    flatShading: false,
  });
  const eye = bas(0xff0000);
  const addEye = (x: number, y: number, z: number) => {
    const e = new THREE.Mesh(G.sphere, eye);
    e.scale.setScalar(0.08);
    e.position.set(x, y, z);
    body.add(e);
  };

  switch (type) {
    case "crawler": {
      const b = new THREE.Mesh(G.sphere, mat);
      b.scale.set(0.6, 0.4, 0.7);
      b.position.y = 0.4;
      body.add(b);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const s = new THREE.Mesh(G.cyl6, dark);
        s.scale.set(0.08, 0.4, 0.08);
        s.position.set(Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4);
        s.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
        body.add(s);
      }
      addEye(-0.15, 0.5, 0.5);
      addEye(0.15, 0.5, 0.5);
      root.add(makeShadow(1.5));
      break;
    }
    case "runner": {
      const b = new THREE.Mesh(G.cyl6, mat);
      b.scale.set(0.4, 0.8, 0.4);
      b.position.y = 0.6;
      b.rotation.x = 0.5;
      body.add(b);
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(G.sphere, dark);
        leg.scale.set(0.1, 0.5, 0.1);
        leg.position.set(s * 0.2, 0.25, 0);
        body.add(leg);
        const arm = new THREE.Mesh(G.sphere, dark);
        arm.scale.set(0.1, 0.6, 0.1);
        arm.position.set(s * 0.3, 0.6, 0.2);
        arm.rotation.x = 0.8;
        body.add(arm);
      }
      addEye(-0.1, 0.8, 0.3);
      addEye(0.1, 0.8, 0.3);
      root.add(makeShadow(1.2));
      break;
    }
    case "brute": {
      const b = new THREE.Mesh(G.sphere, mat);
      b.scale.set(0.8, 1.2, 0.6);
      b.position.y = 1.0;
      body.add(b);
      const hd = new THREE.Mesh(G.sphere, dark);
      hd.scale.set(0.4, 0.4, 0.4);
      hd.position.y = 2.0;
      body.add(hd);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(G.sphere, mat);
        arm.scale.set(0.3, 0.8, 0.3);
        arm.position.set(s * 0.9, 1.0, 0);
        body.add(arm);
        addEye(s * 0.15, 2.0, 0.35);
      }
      root.add(makeShadow(2.5));
      break;
    }
    case "crimson": {
      const b = new THREE.Mesh(G.box, mat);
      b.scale.set(1.5, 1.8, 1.0);
      b.position.y = 1.2;
      body.add(b);
      const hd = new THREE.Mesh(G.box, dark);
      hd.scale.set(0.8, 0.8, 0.8);
      hd.position.y = 2.4;
      body.add(hd);
      const sword = new THREE.Mesh(G.box, bas(0xff0000));
      sword.scale.set(0.1, 2.5, 0.3);
      sword.position.set(1.0, 1.5, 0.5);
      sword.rotation.z = -0.3;
      body.add(sword);
      addEye(-0.2, 2.4, 0.4);
      addEye(0.2, 2.4, 0.4);
      root.add(makeShadow(3));
      break;
    }
    case "voidmage": {
      const b = new THREE.Mesh(G.cone7, mat);
      b.scale.set(0.9, 2.5, 0.9);
      b.position.y = 1.2;
      body.add(b);
      const orb = new THREE.Mesh(G.sphere, bas(0xaa00ff));
      orb.scale.setScalar(0.5);
      orb.position.set(0, 2.8, 0);
      body.add(orb);
      addEye(-0.2, 2.0, 0.6);
      addEye(0.2, 2.0, 0.6);
      root.add(makeShadow(2.5));
      break;
    }
    default: {
      const b = new THREE.Mesh(G.sphere, mat);
      b.scale.set(0.5, 0.5, 0.5);
      b.position.y = 0.5;
      body.add(b);
      addEye(-0.15, 0.6, 0.4);
      addEye(0.15, 0.6, 0.4);
      root.add(makeShadow(1.2));
      break;
    }
  }
  return root;
}

export function buildHeart(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3366 });
  const s1 = new THREE.Mesh(G.sphere, mat);
  s1.scale.set(0.18, 0.18, 0.18);
  s1.position.set(-0.1, 0.1, 0);
  const s2 = new THREE.Mesh(G.sphere, mat);
  s2.scale.set(0.18, 0.18, 0.18);
  s2.position.set(0.1, 0.1, 0);
  const c = new THREE.Mesh(G.cone6, mat);
  c.scale.set(0.3, 0.35, 0.3);
  c.position.set(0, -0.05, 0);
  c.rotation.z = Math.PI;
  g.add(s1, s2, c);
  return g;
}

export function buildChest(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(G.box, lam(0x4a2a1a));
  base.scale.set(1.2, 0.8, 0.8);
  base.position.y = 0.4;
  g.add(base);
  const lid = new THREE.Mesh(G.cyl6, lam(0x6a4a2a));
  lid.scale.set(0.6, 1.2, 0.4);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = 0.8;
  g.add(lid);
  const lock = new THREE.Mesh(G.box, bas(0xffd76a));
  lock.scale.set(0.3, 0.4, 0.1);
  lock.position.set(0, 0.5, 0.45);
  g.add(lock);
  g.add(makeShadow(1.5));
  return g;
}

export function buildDecoration(
  biome: "desert" | "grass",
  seed: number,
): THREE.Group {
  const g = new THREE.Group();
  const r = (n: number) => (Math.sin(seed * 9301 + n * 49297) * 233280) % 1;
  const r1 = Math.abs(r(1)),
    r2 = Math.abs(r(2));
  if (biome === "desert") {
    if (r1 < 0.5) {
      const c = lam(0x2e7a2e);
      const t = new THREE.Mesh(G.cyl6, c);
      t.scale.set(0.2, 1.2, 0.2);
      t.position.y = 0.6;
      g.add(t);
      if (r2 > 0.5) {
        const a = new THREE.Mesh(G.cyl6, c);
        a.scale.set(0.12, 0.6, 0.12);
        a.position.set(0.3, 0.8, 0);
        a.rotation.z = -0.8;
        g.add(a);
      }
    } else {
      const rk = new THREE.Mesh(G.sphere, lam(0x7a6a54));
      rk.scale.set(0.4, 0.3, 0.5);
      rk.position.y = 0.2;
      g.add(rk);
    }
  } else {
    if (r1 < 0.6) {
      const trunk = new THREE.Mesh(G.cyl6, lam(0x4a3020));
      trunk.scale.set(0.25, 1.5, 0.25);
      trunk.position.y = 0.75;
      g.add(trunk);
      const f = new THREE.Mesh(G.sphere, lam(0x2f7a34));
      f.scale.set(1.0, 0.8, 1.0);
      f.position.y = 1.8;
      g.add(f);
    } else {
      const b = new THREE.Mesh(G.sphere, lam(0x3f8a44));
      b.scale.set(0.6, 0.4, 0.6);
      b.position.y = 0.3;
      g.add(b);
    }
  }
  return g;
}

export function makeGroundTexture(
  base: string,
  accent: string,
  dark: string,
): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? accent : dark;
    ctx.globalAlpha = Math.random() * 0.3;
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      Math.random() * 2,
      0,
      7,
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60, 60);
  return tex;
}
