import * as THREE from '../lib/three.module.js';
import {OrbitControls} from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  static CAMERA_PARAM = {
    fovy    : 60,
    aspect  : window.innerWidth / window.innerHeight,
    near    : 0.1,
    far     : 300,
    position: new THREE.Vector3(-50, 25, 100),
    lookAt  : new THREE.Vector3(0.0, 0.0, 0.0),
  };

  static RENDERER_PARAM = {
    clearColor: 0xF1EEE7, // 画面をクリアする色
    width     : window.innerWidth, // レンダラーに設定する幅
    height    : window.innerHeight, // レンダラーに設定する高さ
  };

  static DIRECTIONAL_LIGHT_PARAM = {
    color    : 0xffffff, // 光の色
    intensity: 1.5, // 光の強度
    position : new THREE.Vector3(1.0, 1.0, 1.0), // 光の向き
  };

  static AMBIENT_LIGHT_PARAM = {
    color    : 0xfc6c85, // 光の色
    intensity: 2.0, // 光の強度
  };

  static MATERIAL_PARAM = {
    color: 0xfc6c85, // マテリアルの基本色
  };

  renderer; // レンダラ
  scene;    // シーン
  camera;   // カメラ
  geometry; // ジオメトリ
  material; // マテリアル
  box;      // ボックスメッシュ
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー

  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ディレクショナルライト
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // ジオメトリ・マテリアル
    this.createHeart();

    // 軸ヘルパー
    // const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // this のバインド
    this.render = this.render.bind(this);

    // ウィンドウリサイズのイベントハンドラ
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  createHeart() {
    const boxSize = 1;
    const heartCount = 150;
    const groupSpacing = 1.25;

    this.geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);

    // ハートの形状の定義
    const heartPositions = [
      [-1.5, 2.5, 0], [1.5, 2.5, 0],
      [-2, 2, 0], [-1, 2, 0], [0, 1.5, 0], [1, 2, 0], [2, 2, 0],
      [-2.5, 1, 0], [-2, 1, 0], [-1, 1, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [2.5, 1, 0],
      [-2, 0, 0], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 0, 0],
      [-1.5, -0.5, 0], [-1, -1, 0], [0, -1, 0], [1, -1, 0], [1.5, -0.5, 0],
      [-0.5, -1.5, 0], [0.5, -1.5, 0],
      [0, -2, 0],
    ];

    for (let i = 0; i < heartCount; ++i) {
      const heartGroup = new THREE.Group();
      this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

      heartPositions.forEach(pos => {
        const box = new THREE.Mesh(this.geometry, this.material);
        box.position.set(pos[0], pos[1], pos[2]);
        heartGroup.add(box);
      });

      const randomX = (Math.random() - 0.5) * groupSpacing * heartCount;
      const randomY = (Math.random() - 0.5) * groupSpacing * heartCount;
      const randomZ = (Math.random() - 0.5) * groupSpacing * heartCount;
      heartGroup.position.set(randomX, randomY, randomZ);

      this.scene.add(heartGroup);
    }
  }


  render() {
    requestAnimationFrame(this.render);

    this.controls.update();

    this.scene.traverse((object) => {
      if (object instanceof THREE.Group) {
        // ランダムなスケールを設定（0.5 〜 1.5）
        const scaleFactor = Math.sin(Date.now() * 0.003) * 0.25 + 1;
        object.scale.set(scaleFactor, scaleFactor, scaleFactor);
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}

