import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// All geometry is generated locally. The hero uses the first path of the original SVG.
export default function Scene({
  particles = false,
  index = 0,
}: {
  particles?: boolean;
  index?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const selected = useRef(index);
  const redraw = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    selected.current = index;
    redraw.current?.();
  }, [index]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: el,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.z = particles ? 7.5 : 8.8;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const group = new THREE.Group();
    scene.add(group);
    let disposed = false,
      frame = 0,
      visible = true,
      previous = 0,
      elapsed = 0;
    const pointer = { x: 0, y: 0 },
      smooth = { x: 0, y: 0 };
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    let env: THREE.WebGLRenderTarget | undefined;
    const orbiters: THREE.Mesh[] = [];
    let logo: THREE.Mesh | undefined;
    let solanaCoin: THREE.Group | undefined;
    let orbitalRing: THREE.Mesh | undefined;
    let coinBaseY = 0;
    let positionCoin: (() => void) | undefined;
    let positions: Float32Array | undefined;
    let attribute: THREE.BufferAttribute | undefined;
    const targets: Float32Array[] = [];
    const count = innerWidth < 700 ? 2000 : 4200;
    function makeTarget(mode: number) {
      const points = new Float32Array(count * 3);
      // Sample strokes in 2D and give each a shallow volume to preserve legibility.
      const strokes: number[][][] =
        mode === 0
          ? [
              [
                [-0.9, -1.2],
                [-0.9, 1.2],
                [0.5, 1.2],
                [0.9, 0.8],
                [0.9, -1.2],
                [-0.9, -1.2],
              ],
              [
                [-0.5, 0.55],
                [0.45, 0.55],
              ],
              [
                [-0.5, 0.05],
                [0.5, 0.05],
              ],
              [
                [-0.5, -0.45],
                [0.2, -0.45],
              ],
            ]
          : mode === 1
            ? [
                Array.from({ length: 65 }, (_, i) => [
                  Math.cos((i / 64) * Math.PI * 2) * 0.9 - 0.2,
                  Math.sin((i / 64) * Math.PI * 2) * 0.9 + 0.2,
                ]),
                [
                  [0.45, -0.45],
                  [1.2, -1.2],
                ],
              ]
            : mode === 2
              ? [
                  [
                    [-1, 1],
                    [1, 1],
                    [1, -0.5],
                    [-0.25, -0.5],
                    [-0.9, -1.1],
                    [-0.9, -0.5],
                    [-1, -0.5],
                    [-1, 1],
                  ],
                  [
                    [-0.6, 0.45],
                    [0.6, 0.45],
                  ],
                  [
                    [-0.6, 0],
                    [0.2, 0],
                  ],
                ]
              : [
                  [
                    [-0.9, -1],
                    [0.9, -1],
                    [0.9, 0.35],
                    [-0.9, 0.35],
                    [-0.9, -1],
                  ],
                  Array.from({ length: 33 }, (_, i) => [
                    Math.cos((i / 32) * Math.PI) * 0.58,
                    0.35 + Math.sin((i / 32) * Math.PI) * 0.85,
                  ]),
                  [
                    [0, -0.2],
                    [0, -0.6],
                  ],
                ];
      const segments: { a: number[]; b: number[]; length: number }[] = [];
      strokes.forEach((stroke) =>
        stroke.slice(1).forEach((b, i) => {
          const a = stroke[i];
          segments.push({ a, b, length: Math.hypot(b[0] - a[0], b[1] - a[1]) });
        }),
      );
      const total = segments.reduce((sum, s) => sum + s.length, 0);
      for (let i = 0; i < count; i++) {
        let distance = Math.random() * total;
        let s = segments[0];
        for (const segment of segments) {
          s = segment;
          if (distance <= s.length) break;
          distance -= s.length;
        }
        const t = distance / s.length;
        points[i * 3] =
          s.a[0] + (s.b[0] - s.a[0]) * t + (Math.random() - 0.5) * 0.13;
        points[i * 3 + 1] =
          s.a[1] + (s.b[1] - s.a[1]) * t + (Math.random() - 0.5) * 0.13;
        points[i * 3 + 2] = (Math.random() - 0.5) * 0.28;
      }
      return points;
    }
    if (particles) {
      for (let i = 0; i < 4; i++) targets.push(makeTarget(i));
      positions = new Float32Array(targets[selected.current]);
      const geometry = new THREE.BufferGeometry();
      attribute = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute("position", attribute);
      geometries.push(geometry);
      const material = new THREE.PointsMaterial({
        color: "#070811",
        size: 0.035,
        transparent: false,
        depthWrite: false,
      });
      materials.push(material);
      group.add(new THREE.Points(geometry, material));
    } else {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      env = pmrem.fromScene(room, 0.04);
      scene.environment = env.texture;
      room.dispose();
      pmrem.dispose();
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const key = new THREE.DirectionalLight(0xffffff, 4);
      key.position.set(-3, 5, 5);
      scene.add(key);
      const rim = new THREE.PointLight(0x7148ff, 30);
      rim.position.set(3, -1, 3);
      scene.add(rim);
      const solanaLight = new THREE.PointLight(0x14f195, 12);
      solanaLight.position.set(2.5, 2, 3);
      scene.add(solanaLight);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x7148ff,
        metalness: 0.58,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.13,
        envMapIntensity: 1.6,
      });
      materials.push(material);
      new SVGLoader().load(
        "/img/SolWarranty_logo.svg",
        (data) => {
          if (disposed) return;
          const geometry = new THREE.ExtrudeGeometry(
            data.paths[0].toShapes(),
            {
              depth: 26,
              bevelEnabled: true,
              bevelThickness: 3,
              bevelSize: 2.5,
              bevelSegments: 4,
              curveSegments: 24,
            },
          );
          geometry.center();
          geometry.scale(0.015, -0.015, 0.015);
          geometry.computeVertexNormals();
          geometries.push(geometry);
          logo = new THREE.Mesh(geometry, material);
          logo.rotation.set(-0.12, -0.35, -0.12);
          group.add(logo);
          render();
        },
        undefined,
        () => {
          if (!disposed) setFailed(true);
        },
      );
      const silver = new THREE.MeshStandardMaterial({
        color: 0xd9d4f0,
        metalness: 0.88,
        roughness: 0.22,
      });
      materials.push(silver);
      [
        new THREE.TorusGeometry(0.22, 0.055, 12, 40),
        new THREE.OctahedronGeometry(0.2),
        new THREE.BoxGeometry(0.21, 0.21, 0.21),
      ].forEach((geometry, i) => {
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, i === 1 ? material : silver);
        mesh.position.set(i === 0 ? 2.1 : -1.9, i === 1 ? 1.8 : -1.35, 0.3);
        group.add(mesh);
        orbiters.push(mesh);
      });
      const ringGeo = new THREE.TorusGeometry(2.55, 0.007, 6, 120);
      geometries.push(ringGeo);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7148ff,
        transparent: true,
        opacity: 0.28,
      });
      materials.push(ringMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(1.05, 0.3, 0.2);
      group.add(ring);
      orbitalRing = ring;

      // A small 3D Solana emblem accompanies the SolWarranty mark.
      solanaCoin = new THREE.Group();
      positionCoin = () => {
        const compact = innerWidth < 700;
        const coinX = compact ? 1.15 : innerWidth < 1100 ? 1.45 : 2.1;
        coinBaseY = compact ? 1.7 : innerWidth < 1100 ? 0.85 : 0.75;
        solanaCoin!.position.set(coinX, coinBaseY, 1.15);
        solanaCoin!.scale.setScalar(compact ? 0.7 : 0.85);
      };
      positionCoin();
      solanaCoin.rotation.set(-0.13, -0.25, 0.12);
      group.add(solanaCoin);
      const coinGeometry = new THREE.CylinderGeometry(0.58, 0.58, 0.13, 64);
      const coinFace = new THREE.MeshBasicMaterial({ color: 0x0b0b17 });
      const coinSide = new THREE.MeshStandardMaterial({
        color: 0x9282bd,
        metalness: 0.65,
        roughness: 0.3,
      });
      geometries.push(coinGeometry);
      materials.push(coinFace, coinSide);
      const coin = new THREE.Mesh(coinGeometry, [coinFace, coinFace, coinSide]);
      coin.rotation.x = Math.PI / 2;
      solanaCoin.add(coin);

      const coinRimGeometry = new THREE.TorusGeometry(0.575, 0.018, 8, 64);
      const coinRimMaterial = new THREE.MeshStandardMaterial({
        color: 0xd9d1ff,
        metalness: 0.9,
        roughness: 0.16,
      });
      geometries.push(coinRimGeometry);
      materials.push(coinRimMaterial);
      const coinRim = new THREE.Mesh(coinRimGeometry, coinRimMaterial);
      coinRim.position.z = 0.073;
      solanaCoin.add(coinRim);

      const barColors = [0x14f195, 0xb28cff, 0x9945ff];
      [0.2, 0, -0.2].forEach((y, index) => {
        const direction = index === 1 ? -1 : 1;
        const shape = new THREE.Shape();
        shape.moveTo(-0.29 - direction * 0.06, y - 0.052);
        shape.lineTo(0.29 - direction * 0.06, y - 0.052);
        shape.lineTo(0.29 + direction * 0.06, y + 0.052);
        shape.lineTo(-0.29 + direction * 0.06, y + 0.052);
        shape.closePath();
        const barGeometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.055,
          bevelEnabled: true,
          bevelSize: 0.008,
          bevelThickness: 0.008,
          bevelSegments: 2,
        });
        const barFace = new THREE.MeshBasicMaterial({ color: barColors[index] });
        const barSide = new THREE.MeshStandardMaterial({
          color: barColors[index],
          metalness: 0.3,
          roughness: 0.32,
        });
        geometries.push(barGeometry);
        materials.push(barFace, barSide);
        const bar = new THREE.Mesh(barGeometry, [barFace, barSide]);
        bar.position.z = 0.085;
        solanaCoin!.add(bar);
      });
    }
    function render() {
      if (!disposed) renderer.render(scene, camera);
    }
    function resize() {
      if (!el) return;
      positionCoin?.();
      const width = el.clientWidth,
        height = el.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      render();
    }
    function tick(now: number) {
      frame = 0;
      if (disposed) return;
      const dt = Math.min((now - previous) / 1000 || 0.016, 0.04);
      previous = now;
      elapsed += dt;
      smooth.x += (pointer.x - smooth.x) * 0.06;
      smooth.y += (pointer.y - smooth.y) * 0.06;
      group.rotation.y =
        smooth.x * 0.24 + (particles ? Math.sin(elapsed * 0.35) * 0.22 : 0);
      group.rotation.x = smooth.y * 0.12;
      if (logo) {
        logo.rotation.y = -0.28 + Math.sin(elapsed * 0.42) * 0.38;
        logo.rotation.x = -0.12 + Math.sin(elapsed * 0.31) * 0.1;
        logo.rotation.z = -0.12 + Math.sin(elapsed * 0.27) * 0.06;
        logo.position.y = Math.sin(elapsed * 0.8) * 0.14;
      }
      if (solanaCoin) {
        solanaCoin.rotation.y = -0.25 + Math.sin(elapsed * 0.65) * 0.34;
        solanaCoin.rotation.z = 0.12 + Math.sin(elapsed * 0.38) * 0.09;
        solanaCoin.position.y = coinBaseY + Math.sin(elapsed * 0.9) * 0.13;
      }
      if (orbitalRing) orbitalRing.rotation.z += dt * 0.18;
      orbiters.forEach((mesh, i) => {
        mesh.rotation.x += dt * 0.3;
        mesh.rotation.y += dt * 0.4;
        mesh.position.y += Math.sin(elapsed + i) * 0.0015;
      });
      if (positions && attribute) {
        const target = targets[selected.current];
        for (let i = 0; i < positions.length; i++)
          positions[i] += (target[i] - positions[i]) * (1 - Math.exp(-dt * 5));
        attribute.needsUpdate = true;
      }
      render();
      if (visible && !document.hidden && !reduced)
        frame = requestAnimationFrame(tick);
    }
    function start() {
      if (visible && !document.hidden && !reduced && !frame)
        frame = requestAnimationFrame(tick);
    }
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    }
    function move(event: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    }
    redraw.current = () => {
      if (reduced && positions && attribute) {
        positions.set(targets[selected.current]);
        attribute.needsUpdate = true;
        render();
      } else start();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(el);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    el.parentElement?.addEventListener("pointermove", move);
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      ro.disconnect();
      el.parentElement?.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", onVisibility);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      env?.dispose();
      renderer.dispose();
      redraw.current = null;
    };
  }, [particles]);
  return failed ? (
    <div className="sw-webgl-fallback">
      <img src="/img/SolWarranty_logo.svg" alt="SolWarranty" />
    </div>
  ) : (
    <canvas ref={canvas} aria-hidden="true" />
  );
}
