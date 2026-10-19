// Gera os animais da fazenda em 3D (estilo cartoon, low-poly) e exporta em GLB com animação de "parado".
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import fs from "fs";

// Polyfill mínimo de FileReader para o exportador rodar no Node
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.({ target: this }); }); }
  readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = "data:" + (b.type || "application/octet-stream") + ";base64," + Buffer.from(r).toString("base64"); this.onloadend?.({ target: this }); }); }
};

const OUT = process.argv[2];
const mats = new Map();
const mat = (hex, rough = 0.85) => {
  const k = hex + ":" + rough;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, flatShading: false }));
  return mats.get(k);
};
const mesh = (geo, hex, name, rough) => { const m = new THREE.Mesh(geo, mat(hex, rough)); m.name = name; return m; };
const esfera = (r, hex, name, sx = 1, sy = 1, sz = 1, seg = 20) => { const m = mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), hex, name); m.scale.set(sx, sy, sz); return m; };
const capsula = (r, len, hex, name) => mesh(new THREE.CapsuleGeometry(r, len, 6, 14), hex, name);
const cil = (rt, rb, h, hex, name, seg = 14) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), hex, name);
const cone = (r, h, hex, name) => mesh(new THREE.ConeGeometry(r, h, 12), hex, name);
const grupo = (name, ...filhos) => { const g = new THREE.Group(); g.name = name; filhos.forEach((f) => g.add(f)); return g; };
const pos = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const rot = (o, x, y, z) => { o.rotation.set(x, y, z); return o; };

const olho = (lado, r, prefixo) => {
  const g = grupo(`${prefixo}_olho_${lado}`);
  g.add(esfera(r, 0xffffff, `${prefixo}_olhoBranco_${lado}`, 1, 1, 0.7));
  g.add(pos(esfera(r * 0.62, 0x1b1410, `${prefixo}_pupila_${lado}`, 1, 1, 0.6), 0, 0, r * 0.45));
  g.add(pos(esfera(r * 0.2, 0xffffff, `${prefixo}_brilho_${lado}`), r * 0.22, r * 0.25, r * 0.85));
  return g;
};

/** Quadrúpede genérico. Medidas em metros, origem nos pés, olhando para +Z. */
function quadrupede(p) {
  const n = p.nome;
  const raiz = grupo(n);
  const corpoG = grupo(`${n}_corpo`);
  raiz.add(corpoG);
  const alturaCorpo = p.perna + p.corpoH * 0.42;
  corpoG.position.y = alturaCorpo;

  // corpo
  const corpo = esfera(1, p.cor, `${n}_tronco`, p.corpoW / 2, p.corpoH / 2, p.corpoL / 2, 24);
  corpoG.add(corpo);
  (p.manchas || []).forEach(([x, y, z, r], i) => corpoG.add(pos(esfera(r, p.corMancha, `${n}_mancha${i}`, 1, 0.75, 1.2), x, y, z)));
  if (p.barriga) corpoG.add(pos(esfera(1, p.barriga, `${n}_barriga`, p.corpoW * 0.36, p.corpoH * 0.3, p.corpoL * 0.36), 0, -p.corpoH * 0.22, 0.02));
  if (p.la) {
    // lã fofa (lhama): bolinhas sobre o corpo
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, b = (i % 3) * 0.45 - 0.45;
      corpoG.add(pos(esfera(p.corpoW * 0.22, p.cor, `${n}_la${i}`), Math.cos(a) * p.corpoW * 0.42, b * p.corpoH * 0.4 + 0.05, Math.sin(a) * p.corpoL * 0.42));
    }
  }

  // pernas
  const pernas = [];
  const px = p.corpoW * 0.3, pz = p.corpoL * 0.32;
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
    const perna = grupo(`${n}_perna${i}`);
    perna.position.set(sx * px, alturaCorpo - p.corpoH * 0.15, sz * pz);
    const comp = alturaCorpo - p.corpoH * 0.15;
    perna.add(pos(cil(p.pernaR, p.pernaR * 0.85, comp - p.pernaR * 0.8, p.corPerna ?? p.cor, `${n}_canela${i}`), 0, -comp / 2 + p.pernaR * 0.2, 0));
    perna.add(pos(cil(p.pernaR * 1.05, p.pernaR * 1.15, p.pernaR * 1.1, p.casco, `${n}_casco${i}`), 0, -comp + p.pernaR * 0.55, 0));
    raiz.add(perna);
    pernas.push(perna);
  });

  // pescoço + cabeça
  const pescoco = grupo(`${n}_pescoco`);
  pescoco.position.set(0, p.corpoH * 0.18, p.corpoL * 0.4);
  pescoco.rotation.x = p.pescocoInc;
  corpoG.add(pescoco);
  pescoco.add(pos(capsula(p.pescocoR, p.pescocoL, p.corPescoco ?? p.cor, `${n}_pescocoMalha`), 0, p.pescocoL / 2, 0));
  if (p.crina) {
    for (let i = 0; i < 6; i++) pescoco.add(pos(rot(esfera(p.pescocoR * 0.55, p.crina, `${n}_crina${i}`, 0.6, 1.3, 1), 0.3, 0, 0), 0, p.pescocoL * (0.1 + i * 0.17), -p.pescocoR * 0.85));
  }

  const cabeca = grupo(`${n}_cabeca`);
  cabeca.position.set(0, p.pescocoL + p.cabeca * 0.25, 0);
  cabeca.rotation.x = -p.pescocoInc + p.cabecaInc;
  pescoco.add(cabeca);
  const h = p.cabeca;
  cabeca.add(esfera(h, p.corCabeca ?? p.cor, `${n}_cranio`, 0.9, 0.95, 1, 22));
  // focinho
  const fc = pos(esfera(h * 0.62, p.focinho, `${n}_focinho`, p.focinhoW ?? 1.05, 0.78, p.focinhoL ?? 1), 0, -h * 0.22, h * 0.72);
  cabeca.add(fc);
  [-1, 1].forEach((s) => cabeca.add(pos(esfera(h * 0.1, p.narina ?? 0x3a2a24, `${n}_narina${s}`, 1, 0.7, 0.5), s * h * 0.2, -h * 0.12, h * (0.72 + 0.6 * (p.focinhoL ?? 1)))));
  // olhos
  [-1, 1].forEach((s) => {
    const o = olho(s < 0 ? "e" : "d", h * 0.24, n);
    o.position.set(s * h * 0.42, h * 0.22, h * 0.68);
    o.rotation.y = s * 0.35;
    cabeca.add(o);
  });
  // orelhas
  const orelhas = [];
  [-1, 1].forEach((s) => {
    const o = grupo(`${n}_orelha${s < 0 ? "E" : "D"}`);
    o.position.set(s * h * (p.orelhaX ?? 0.62), h * (p.orelhaY ?? 0.62), -h * 0.05);
    o.rotation.z = s * -(p.orelhaAng ?? 0.9);
    const or = esfera(h * p.orelha, p.corOrelha ?? p.cor, `${n}_orelhaMalha${s}`, 0.45, 1, 0.25);
    or.position.y = h * p.orelha * 0.8;
    o.add(or);
    if (p.orelhaDentro) o.add(pos(esfera(h * p.orelha * 0.7, p.orelhaDentro, `${n}_orelhaDentro${s}`, 0.35, 0.85, 0.2), 0, h * p.orelha * 0.8, h * 0.05));
    cabeca.add(o);
    orelhas.push(o);
  });
  if (p.chifre) [-1, 1].forEach((s) => cabeca.add(rot(pos(cone(h * 0.11, h * 0.45, p.chifre, `${n}_chifre${s}`), s * h * 0.35, h * 0.85, -h * 0.05), 0, 0, s * -0.5)));
  if (p.topete) for (let i = 0; i < 3; i++) cabeca.add(pos(esfera(h * 0.22, p.topete, `${n}_topete${i}`), (i - 1) * h * 0.18, h * 0.88, h * 0.1 - i * 0.02));

  // rabo
  const rabo = grupo(`${n}_rabo`);
  rabo.position.set(0, p.corpoH * 0.15, -p.corpoL * 0.48);
  corpoG.add(rabo);
  if (p.rabo === "corda") {
    rabo.add(pos(rot(cil(p.pernaR * 0.25, p.pernaR * 0.2, p.corpoH * 0.8, p.cor, `${n}_raboCorda`), 0.25, 0, 0), 0, -p.corpoH * 0.38, -0.05));
    rabo.add(pos(esfera(p.pernaR * 0.7, p.raboPonta ?? p.cor, `${n}_raboPonta`, 0.8, 1.4, 0.8), 0, -p.corpoH * 0.82, -0.15));
  } else if (p.rabo === "crina") {
    rabo.add(pos(rot(esfera(p.corpoH * 0.18, p.crina, `${n}_raboCrina`, 0.6, 2.2, 0.7), 0.5, 0, 0), 0, -p.corpoH * 0.3, -p.corpoH * 0.15));
  } else if (p.rabo === "enrolado") {
    rabo.add(pos(rot(mesh(new THREE.TorusGeometry(p.corpoH * 0.09, p.corpoH * 0.03, 8, 16, Math.PI * 1.6), p.cor, `${n}_raboEnrolado`), 0, Math.PI / 2, 0), 0, 0.02, -0.04));
  } else if (p.rabo === "pompom") {
    rabo.add(pos(esfera(p.corpoH * 0.16, p.cor, `${n}_raboPompom`), 0, 0.05, -0.05));
  }
  if (p.extra) p.extra({ raiz, corpoG, cabeca, pescoco, h });

  // animação de parado: respira, mexe a cabeça, abana o rabo, mexe as orelhas
  const T = 4;
  const tempos = [0, 1, 2, 3, 4];
  const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const trilhas = [
    new THREE.VectorKeyframeTrack(`${n}_corpo.position`, tempos, [0, alturaCorpo, 0, 0, alturaCorpo + 0.012, 0, 0, alturaCorpo, 0, 0, alturaCorpo + 0.012, 0, 0, alturaCorpo, 0]),
    new THREE.QuaternionKeyframeTrack(`${n}_cabeca.quaternion`, tempos, [
      ...q(-p.pescocoInc + p.cabecaInc, 0, 0), ...q(-p.pescocoInc + p.cabecaInc + 0.12, 0.25, 0.05), ...q(-p.pescocoInc + p.cabecaInc, 0, 0),
      ...q(-p.pescocoInc + p.cabecaInc - 0.05, -0.3, -0.05), ...q(-p.pescocoInc + p.cabecaInc, 0, 0)]),
    new THREE.QuaternionKeyframeTrack(`${n}_rabo.quaternion`, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
      [0, 0.4, -0.4, 0, 0.4, -0.4, 0, 0.4, -0.4].flatMap((a) => q(0, 0, a))),
    ...orelhas.map((o, i) => {
      const s = i === 0 ? -1 : 1, base = s * -(p.orelhaAng ?? 0.9);
      return new THREE.QuaternionKeyframeTrack(`${o.name}.quaternion`, [0, 2.8, 3, 3.2, 4], [...q(0, 0, base), ...q(0, 0, base), ...q(0.4, 0, base + s * -0.35), ...q(0, 0, base), ...q(0, 0, base)]);
    }),
  ];
  const clip = new THREE.AnimationClip("Parado", T, trilhas);
  return { raiz, clip };
}

function galinha() {
  const n = "galinha";
  const raiz = grupo(n);
  const corpoG = grupo(`${n}_corpo`); corpoG.position.y = 0.2; raiz.add(corpoG);
  corpoG.add(esfera(0.13, 0xfaf6ee, `${n}_tronco`, 1, 0.95, 1.2));
  [-1, 1].forEach((s) => corpoG.add(rot(pos(esfera(0.08, 0xefe6d6, `${n}_asa${s}`, 0.35, 0.8, 1.2), s * 0.12, 0.0, -0.01), 0.2, 0, s * 0.15)));
  const rabo = grupo(`${n}_rabo`); rabo.position.set(0, 0.06, -0.13); corpoG.add(rabo);
  for (let i = 0; i < 3; i++) rabo.add(rot(pos(esfera(0.05, 0xf3ece0, `${n}_pena${i}`, 0.4, 1.4, 0.7), (i - 1) * 0.035, 0.05, -0.02), -0.6, 0, (i - 1) * 0.3));
  const cabeca = grupo(`${n}_cabeca`); cabeca.position.set(0, 0.17, 0.1); corpoG.add(cabeca);
  cabeca.add(esfera(0.075, 0xfaf6ee, `${n}_cranio`));
  cabeca.add(rot(pos(cone(0.025, 0.06, 0xf2a531, `${n}_bico`), 0, -0.005, 0.085), Math.PI / 2, 0, 0));
  for (let i = 0; i < 3; i++) cabeca.add(pos(esfera(0.022, 0xd8342c, `${n}_crista${i}`, 0.6, 1.2, 1), 0, 0.075, 0.03 - i * 0.025));
  cabeca.add(pos(esfera(0.018, 0xd8342c, `${n}_barbela`, 0.7, 1.3, 0.7), 0, -0.05, 0.06));
  [-1, 1].forEach((s) => { const o = olho(s < 0 ? "e" : "d", 0.017, n); o.position.set(s * 0.05, 0.02, 0.05); o.rotation.y = s * 0.7; cabeca.add(o); });
  [-1, 1].forEach((s) => {
    const perna = grupo(`${n}_perna${s}`); perna.position.set(s * 0.05, 0.1, 0); raiz.add(perna);
    perna.add(pos(cil(0.008, 0.008, 0.1, 0xf2a531, `${n}_canela${s}`), 0, -0.05, 0));
    for (let k = -1; k <= 1; k++) perna.add(rot(pos(cil(0.006, 0.006, 0.05, 0xf2a531, `${n}_dedo${s}${k}`), k * 0.012, -0.098, 0.022), Math.PI / 2, k * 0.5, 0));
  });
  const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const clip = new THREE.AnimationClip("Parado", 3, [
    new THREE.QuaternionKeyframeTrack(`${n}_cabeca.quaternion`, [0, 0.4, 0.6, 0.8, 1.6, 2.2, 2.4, 2.6, 3],
      [...q(0, 0, 0), ...q(0, 0.5, 0), ...q(0, 0.5, 0.2), ...q(0, 0.5, 0), ...q(0, 0, 0), ...q(0.7, 0, 0), ...q(0, 0, 0), ...q(0.7, 0, 0), ...q(0, 0, 0)]),
    new THREE.VectorKeyframeTrack(`${n}_cabeca.position`, [0, 2.2, 2.4, 2.6, 3], [0, 0.17, 0.1, 0, 0.12, 0.15, 0, 0.17, 0.1, 0, 0.12, 0.15, 0, 0.17, 0.1]),
    new THREE.QuaternionKeyframeTrack(`${n}_rabo.quaternion`, [0, 1, 2, 3], [...q(0, 0, 0), ...q(0, 0.3, 0), ...q(0, -0.3, 0), ...q(0, 0, 0)]),
  ]);
  return { raiz, clip };
}

const ANIMAIS = {
  vaca: () => quadrupede({
    nome: "vaca", cor: 0xfbf8f2, corMancha: 0x2b2522, manchas: [[0.3, 0.1, 0.2, 0.18], [-0.32, 0.05, -0.25, 0.2], [0.22, 0.2, -0.45, 0.14], [-0.2, 0.25, 0.35, 0.12]],
    corpoL: 1.6, corpoH: 0.8, corpoW: 0.72, perna: 0.55, pernaR: 0.075, casco: 0x3b2f2a, barriga: null,
    pescocoR: 0.17, pescocoL: 0.22, pescocoInc: 0.9, cabeca: 0.27, cabecaInc: 0.3, focinho: 0xf3b5b0, focinhoL: 0.9, focinhoW: 1.15, narina: 0x8a4f4b,
    orelha: 0.32, orelhaAng: 1.5, orelhaY: 0.45, orelhaX: 0.75, orelhaDentro: 0xf3b5b0, chifre: 0xf1e7cf, rabo: "corda", raboPonta: 0x2b2522,
    extra: ({ corpoG }) => corpoG.add(pos(esfera(0.13, 0xf3b5b0, "vaca_ubere", 1.2, 0.8, 1), 0, -0.38, -0.2)),
  }),
  cavalo: () => quadrupede({
    nome: "cavalo", cor: 0x8a5531, corPerna: 0x7a4a2a, corpoL: 1.7, corpoH: 0.72, corpoW: 0.6, perna: 0.85, pernaR: 0.065, casco: 0x2c221d,
    pescocoR: 0.16, pescocoL: 0.55, pescocoInc: 0.45, cabeca: 0.24, cabecaInc: 0.55, focinho: 0x6f432a, focinhoL: 1.35, focinhoW: 0.9, narina: 0x2c1a12,
    orelha: 0.26, orelhaAng: 0.2, orelhaY: 0.75, orelhaX: 0.35, crina: 0x2c1a12, rabo: "crina", topete: 0x2c1a12,
    extra: ({ cabeca, h }) => cabeca.add(pos(esfera(h * 0.18, 0xffffff, "cavalo_estrela", 1, 1.3, 0.4), 0, h * 0.35, h * 0.88)),
  }),
  lhama: () => quadrupede({
    nome: "lhama", cor: 0x8b5a3c, corPescoco: 0x9a6646, corCabeca: 0x9a6646, corpoL: 1.1, corpoH: 0.62, corpoW: 0.5, perna: 0.7, pernaR: 0.06, casco: 0x3a2a20, la: true,
    pescocoR: 0.13, pescocoL: 0.75, pescocoInc: 0.12, cabeca: 0.19, cabecaInc: 0.15, focinho: 0xd9b48c, focinhoL: 0.95, focinhoW: 0.95, narina: 0x3a2a20,
    orelha: 0.42, orelhaAng: 0.15, orelhaY: 0.7, orelhaX: 0.42, orelhaDentro: 0xd9a88a, rabo: "pompom", topete: 0x8b5a3c,
  }),
  porco: () => quadrupede({
    nome: "porco", cor: 0xf4b4b6, corpoL: 1.0, corpoH: 0.62, corpoW: 0.62, perna: 0.18, pernaR: 0.07, casco: 0xb87a7c,
    pescocoR: 0.2, pescocoL: 0.02, pescocoInc: 1.3, cabeca: 0.27, cabecaInc: 0.15, focinho: 0xee9ea2, focinhoL: 0.75, focinhoW: 0.85, narina: 0x9a4d55,
    orelha: 0.3, orelhaAng: 0.5, orelhaY: 0.6, orelhaX: 0.55, orelhaDentro: 0xee9ea2, rabo: "enrolado",
  }),
  galinha,
};

const exp = new GLTFExporter();
for (const [nome, fn] of Object.entries(ANIMAIS)) {
  mats.clear();
  const { raiz, clip } = fn();
  const cena = new THREE.Scene();
  cena.add(raiz);
  const glb = await exp.parseAsync(cena, { binary: true, animations: [clip] });
  fs.writeFileSync(`${OUT}/${nome}.glb`, Buffer.from(glb));
  const box = new THREE.Box3().setFromObject(raiz);
  console.log(nome, (Buffer.from(glb).length / 1024).toFixed(0) + " KB", box.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join(" x "));
}
