"use client";

import { useEffect, useRef } from "react";
import type * as THREE_TYPES from "three";

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let THREE: typeof import("three");

    async function init() {
      THREE = await import("three");

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050507, 0.015);

      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 8, 20);

      const renderer = new THREE.WebGLRenderer({ canvas: canvas!, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Black hole shader with amber/gold palette for finance
      const bhUniforms = { uTime: { value: 0 }, uScroll: { value: 0 } };

      const bhMaterial = new THREE.ShaderMaterial({
        uniforms: bhUniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          uniform float uTime; uniform float uScroll; varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
            return mix(mix(hash(i+vec2(0,0)),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
          }
          float fbm(vec2 p) {
            float v = 0.0; float a = 0.5;
            mat2 rot = mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
            for(int i=0;i<6;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; }
            return v;
          }
          void main() {
            vec2 uv = vUv*2.0-1.0; float r = length(uv);
            float coreRadius = 0.18;
            float core = smoothstep(coreRadius+0.02, coreRadius, r);
            float warpFactor = 0.12/(r+0.01);
            vec2 warpedUv = uv + normalize(uv)*warpFactor;
            float warpedR = length(warpedUv);
            float warpedAngle = atan(warpedUv.y, warpedUv.x);
            float swirlSpeed = uTime*0.08;
            float swirl = warpedAngle - warpedR*2.5 + swirlSpeed;
            vec2 noiseCoords = vec2(cos(swirl),sin(swirl))*1.8 - vec2(uTime*0.02);
            float n1 = fbm(noiseCoords*2.5);
            float n2 = fbm(noiseCoords*5.0+uTime*0.04);
            float diskMask = smoothstep(0.9, coreRadius, r);
            float innerGlowMask = smoothstep(coreRadius+0.3, coreRadius, r);
            float intensity = (n1*0.5+0.5)*diskMask;
            float highlight = (n2*0.5+0.5)*innerGlowMask*2.0;
            // Amber/gold finance palette
            vec3 deepSpace = vec3(0.01, 0.01, 0.02);
            vec3 darkAmber = vec3(0.25, 0.12, 0.01);
            vec3 goldFlame = vec3(0.9, 0.55, 0.1);
            vec3 coreWhite = vec3(1.0, 0.92, 0.75);
            vec3 color = mix(deepSpace, darkAmber, intensity*1.5);
            color = mix(color, goldFlame, highlight*0.9);
            color += coreWhite * pow(innerGlowMask,4.0) * (0.3+0.7*sin(swirlSpeed*3.0+warpedR*15.0));
            color = mix(color, vec3(0.0), core);
            float alpha = (intensity+highlight)*diskMask;
            alpha = max(alpha, core);
            alpha *= smoothstep(1.0, 0.5, r);
            float scrollGlow = 1.0+uScroll*0.4;
            float pulse = 0.95+0.05*sin(uTime*0.5);
            gl_FragColor = vec4(color*scrollGlow*pulse, alpha);
          }
        `,
        transparent: true, depthWrite: false, blending: THREE.NormalBlending, fog: false,
      });

      const bhMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), bhMaterial);
      bhMesh.position.set(0, 12, -45);
      bhMesh.renderOrder = -2;
      scene.add(bhMesh);

      // Smoke planes
      const smokeCanvas = document.createElement("canvas");
      smokeCanvas.width = smokeCanvas.height = 512;
      const ctx = smokeCanvas.getContext("2d")!;
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, "rgba(255,255,255,0.15)");
      grad.addColorStop(0.4, "rgba(255,255,255,0.04)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      const smokeTex = new THREE.CanvasTexture(smokeCanvas);

      const smokePlanes: import("three").Mesh[] = [];
      const smokeGeo = new THREE.PlaneGeometry(100, 100);
      for (let i = 0; i < 30; i++) {
        const rand = Math.random();
        const color = new THREE.Color(rand < 0.4 ? 0x1a0a00 : rand < 0.7 ? 0x0a0808 : 0x050505);
        const mat = new THREE.MeshBasicMaterial({ map: smokeTex, color, transparent: true, opacity: Math.random() * 0.4 + 0.1, depthWrite: false, blending: THREE.NormalBlending });
        const plane = new THREE.Mesh(smokeGeo, mat);
        plane.position.set((Math.random() - 0.5) * 140, (Math.random() - 0.5) * 80 + 5, -10 - Math.random() * 30);
        plane.rotation.z = Math.random() * Math.PI * 2;
        (plane as unknown as { userData: Record<string, number> }).userData = {
          rotSpeed: (Math.random() - 0.5) * 0.002, driftX: (Math.random() - 0.5) * 0.015,
          driftY: (Math.random() - 0.5) * 0.01, baseOpacity: (mat as THREE_TYPES.MeshBasicMaterial).opacity,
          phaseOffset: Math.random() * Math.PI * 2, baseX: plane.position.x, baseY: plane.position.y,
        };
        plane.renderOrder = -1;
        scene.add(plane); smokePlanes.push(plane);
      }

      // Grid
      const gridMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0xffffff) }, uOpacity: { value: 0.0 } },
        vertexShader: `varying vec3 vWorldPosition; void main() { vec4 wp=modelMatrix*vec4(position,1.0); vWorldPosition=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vWorldPosition; void main() { vec2 coord=vWorldPosition.xz*0.55; vec2 grid=abs(fract(coord-0.5)-0.5)/(fwidth(coord)*1.6); float line=min(grid.x,grid.y); float alpha=max(0.0,1.0-line); float dist=length(vWorldPosition.xyz-cameraPosition); float fade=1.0-smoothstep(12.0,70.0,dist); gl_FragColor=vec4(uColor,alpha*fade*uOpacity); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,       });
      const planeGeo = new THREE.PlaneGeometry(240, 240); planeGeo.rotateX(-Math.PI / 2);
      const gridPlane = new THREE.Mesh(planeGeo, gridMat); gridPlane.position.y = -4; scene.add(gridPlane);

      // Particles
      const pGeo = new THREE.BufferGeometry();
      const pts: number[] = [], vels: number[] = [];
      for (let i = 0; i < 500; i++) { pts.push((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 80 + 5, (Math.random() - 0.5) * 100 - 15); vels.push(Math.random() * 0.015 + 0.005); }
      pGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      pGeo.setAttribute("aSpeed", new THREE.Float32BufferAttribute(vels, 1));
      const pMat = new THREE.PointsMaterial({ color: 0xfde68a, size: 0.025, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Points(pGeo, pMat); scene.add(glow);

      let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0, scrollP = 0, targetScrollP = 0;
      const onMouse = (e: MouseEvent) => { targetX = e.clientX / window.innerWidth - 0.5; targetY = e.clientY / window.innerHeight - 0.5; };
      const onScroll = () => { targetScrollP = Math.min(1, Math.max(0, window.scrollY / window.innerHeight)); };
      const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
      window.addEventListener("mousemove", onMouse);
      window.addEventListener("scroll", onScroll);
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();

      function animate() {
        animId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        bhUniforms.uTime.value = elapsed;
        mouseX += (targetX - mouseX) * 0.05; mouseY += (targetY - mouseY) * 0.05;
        scrollP += (targetScrollP - scrollP) * 0.04;
        bhUniforms.uScroll.value = scrollP;
        (gridMat.uniforms.uOpacity as { value: number }).value += (0.06 * (1 - scrollP) - (gridMat.uniforms.uOpacity as { value: number }).value) * 0.05;
        camera.position.z += (20 - scrollP * 65 - camera.position.z) * 0.06;
        camera.position.y += ((8 - scrollP * 6 - mouseY * 2) - camera.position.y) * 0.06;
        camera.position.x += ((scrollP * 2 + mouseX * 3) - camera.position.x) * 0.06;
        camera.fov += (60 + scrollP * 45 - camera.fov) * 0.06; camera.updateProjectionMatrix();
        camera.lookAt(mouseX * 4, bhMesh.position.y - 4 + scrollP * 12, -20 - scrollP * 30);
        gridPlane.position.x = camera.position.x; gridPlane.position.z = camera.position.z;
        bhMesh.lookAt(camera.position);

        smokePlanes.forEach((plane) => {
          const ud = (plane as unknown as { userData: Record<string, number> }).userData;
          ud.baseX += ud.driftX; ud.baseY += ud.driftY;
          plane.position.x += (ud.baseX - plane.position.x) * 0.05;
          plane.position.y += (ud.baseY - plane.position.y) * 0.05;
          plane.rotation.z += ud.rotSpeed;
          (plane.material as THREE_TYPES.MeshBasicMaterial).opacity = ud.baseOpacity + Math.sin(plane.position.x * 0.02 + elapsed * 0.3 + ud.phaseOffset) * 0.08;
          if (ud.baseX > 70) ud.baseX = -70; if (ud.baseX < -70) ud.baseX = 70;
          if (ud.baseY > 50) ud.baseY = -10; if (ud.baseY < -10) ud.baseY = 50;
        });

        const positions = glow.geometry.attributes.position.array as Float32Array;
        const speeds = glow.geometry.attributes.aSpeed.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          const dx = bhMesh.position.x - positions[i], dy = bhMesh.position.y - positions[i + 1], dz = bhMesh.position.z - positions[i + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const speed = speeds[i / 3] * (1 + scrollP * 4);
          positions[i] += (dx / dist) * speed; positions[i + 1] += (dy / dist) * speed; positions[i + 2] += (dz / dist) * speed;
          positions[i] -= (dz / dist) * speed * 2; positions[i + 2] += (dx / dist) * speed * 2;
          if (dist < 5 || dist > 180) {
            const angle = Math.random() * Math.PI * 2, r = 90 + Math.random() * 60;
            positions[i] = Math.cos(angle) * r; positions[i + 1] = bhMesh.position.y + (Math.random() - 0.5) * 60; positions[i + 2] = bhMesh.position.z + Math.sin(angle) * r;
          }
        }
        glow.geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
      }
      animate();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: "#050507" }}
    />
  );
}
