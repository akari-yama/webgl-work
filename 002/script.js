import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0, 2.5, 25),
    lookAt: new THREE.Vector3(0, 0, 0),
  };

  static RENDERER_PARAM = {
    clearColor: 0xF1EEE7,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.5,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };

  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.5,
  };

  renderer;
  scene;
  camera;
  directionalLight;
  ambientLight;
  material;
  fanGroups = [];
  controls;
  isDown;
  targetFanSpeed;
  currentFanSpeed;
  targetNeckSpeed;
  currentNeckSpeed;
  acceleration;

  constructor(wrapper) {
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    this.material = new THREE.MeshPhongMaterial({
      color: 0x0ED12B,
      emissive: 0x00ff00,
    });

    this.isDown = false;
    this.targetFanSpeed = 0;
    this.currentFanSpeed = 0;
    this.targetNeckSpeed = 0;
    this.currentNeckSpeed = 0;
    this.acceleration = 0.01;

    window.addEventListener('keydown', (keyEvent) => {
      if (keyEvent.key === ' ') {
        this.isDown = true;
        this.targetFanSpeed = 0.1;
        this.targetNeckSpeed = 0.015;
      }
    }, false);

    window.addEventListener('keyup', () => {
      this.isDown = false;
      this.targetFanSpeed = 0;
      this.targetNeckSpeed = 0;
    }, false);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);

    this.initFans();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.render = this.render.bind(this);
  }

  initFans() {
    const fanCount = 10;
    const minPoleHeight = 3; // ポールの最小高さ
    const baseHeight = 0.05;

    for (let i = 0; i < fanCount; i++) {
      const fanGroup = new THREE.Group();
      this.scene.add(fanGroup);

      // ベース
      const baseGeometry = new THREE.CylinderGeometry(1, 1, baseHeight, 32);
      const baseMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = baseHeight / 2;
      fanGroup.add(base);

      // ポール
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.1, minPoleHeight, 32);
      const poleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.y = baseHeight + minPoleHeight / 2;
      fanGroup.add(pole);

      // 羽根
      const bladeCount = 8;
      const bladeGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0.1,
        0, 1.5, 0.1,
        -0.5, 1.5, 0.1,
      ]);
      bladeGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const bladeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
      });

      const blades = [];
      for (let j = 0; j < bladeCount; ++j) {
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.rotation.z = (j / bladeCount) * Math.PI * 2;
        blade.position.y = baseHeight + minPoleHeight;
        fanGroup.add(blade);
        blades.push(blade);
      }

      fanGroup.position.x = (i - (fanCount - 1) / 2) * 4;
      this.fanGroups.push({ group: fanGroup, baseHeight, minPoleHeight, pole, blades });
    }
  }

  updateSpeed(currentSpeed, targetSpeed) {
    if (currentSpeed < targetSpeed) {
      return Math.min(currentSpeed + this.acceleration, targetSpeed);
    } else if (currentSpeed > targetSpeed) {
      return Math.max(currentSpeed - this.acceleration, targetSpeed);
    }
    return currentSpeed;
  }

  render() {
    requestAnimationFrame(this.render);

    this.controls.update();

    const time = Date.now() * 0.001;

    this.fanGroups.forEach(({ group, baseHeight, minPoleHeight, pole, blades }, index) => {
      const waveHeight = this.isDown ? minPoleHeight + Math.sin(time + index) * 0.5 : minPoleHeight;

      pole.scale.set(1, waveHeight / minPoleHeight, 1);
      pole.position.y = baseHeight + waveHeight / 2;

      const bladeYPosition = baseHeight + waveHeight;
      blades.forEach((blade) => {
        blade.position.y = bladeYPosition;
        blade.rotation.z += this.currentFanSpeed;
      });

      group.rotation.y += this.currentNeckSpeed;
    });

    this.currentFanSpeed = this.updateSpeed(this.currentFanSpeed, this.targetFanSpeed);
    this.currentNeckSpeed = this.updateSpeed(this.currentNeckSpeed, this.targetNeckSpeed);

    this.renderer.render(this.scene, this.camera);
  }
}
