// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 8.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0xF1EEE7,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xF1EEE7,
    intensity: 3.5,
    position: new THREE.Vector3(0.0, 5.0, 0.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xF1EEE7,
    near: 10.0,
    far: 20.0,
  };

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  raycaster;        // レイキャスター
  gltfScenes = []; // glTF
  objects = []; // 動かしたいオブジェクトを管理する配列
  selectedObject = null;
  isDragging = false; // オブジェクトをドラッグ中かどうかを管理
  isRotating = true;  // 回転フラグ
  rotationSpeed = 0.01;  // 回転速度
  rotationTimeout = null;  // 選択解除後に回転を再開するためのタイマー

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    this.wrapper = wrapper;
    this.render = this.render.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.raycaster = new THREE.Raycaster();

    // その他のイベントリスナー
    window.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('mousedown', this.handleAltClick.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // フォグ
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // シーンにグループを作成し、その中でオブジェクトを管理する
    this.rotationGroup = new THREE.Group();
    this.scene.add(this.rotationGroup);

    // シーンに glTF を追加
    this.gltfScenes.forEach((gltfScene) => {
      this.rotationGroup.add(gltfScene);  // 全てのglTFシーンを回転グループに追加
    });

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enabled = true;
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      const gltfPaths = [
        { path: './assets/ice.glb' },
        { path: './assets/cherry.glb', position: { x: 0, y: 1.2, z: 0 }, name: 'cherry' },
        { path: './assets/mikan.glb', position: { x: 0, y: -0.8, z: 2.3 }, rotation: { x: Math.PI / 1.5, y: Math.PI / 4.5, z: 0 }, name: 'mikan01' },
        { path: './assets/mikan.glb', position: { x: -2.3, y: -1, z: 0 }, rotation: { x: 0, y: Math.PI / 1.5, z: 0 }, name: 'mikan03' },
        { path: './assets/mikan.glb', position: { x: 0, y: -0.8, z: -2.1 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, name: 'mikan03' },
        { path: './assets/pine.glb', position: { x: -1.5, y: -0.6, z: 1.7 }, rotation: { x: 0, y: Math.PI / 12, z: 0 }, name: 'pine1' },
        { path: './assets/pine.glb', position: { x: -0.8, y: 0, z: -1.5 }, rotation: { x: 0, y: Math.PI / 2, z: Math.PI / 3.5 }, name: 'pine2' },
        { path: './assets/pine.glb', position: { x: 1.7, y: -0.8, z: -1.2 }, name: 'pine3' },
        { path: './assets/melon.glb', position: { x: 2, y: -0.5, z: 0.5 }, name: 'melon' },
        { path: './assets/banana.glb', position: { x: 1.5, y: -1, z: 1.6 }, rotation: { x: Math.PI / 1.8, y: 0, z: 0 }, name: 'banana01' },
        { path: './assets/banana.glb', position: { x: -1.5, y: -1, z: -1.5 }, rotation: { x: 0, y: Math.PI / 2.5, z: 0 }, name: 'banana02' },
        { path: './assets/strawberry.glb', position: { x: -1.5, y: 0.2, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, name: 'strawberry01' },
        { path: './assets/strawberry.glb', position: { x: 1.5, y: 0.2, z: -0.3 }, rotation: { x: 0, y: Math.PI / -1.5, z: 0 }, name: 'strawberry02' },
        { path: './assets/jelly_green.glb', position: { x: -1, y: -1.4, z: 2.2 }, name: 'jelly_green01' },
        { path: './assets/jelly_green.glb', position: { x: 0.8, y: 0.2, z: -1.5 }, name: 'jelly_green02' },
        { path: './assets/jelly_red.glb', position: { x: 1.2, y: -0.1, z: 1 }, name: 'jelly_red01' },
        { path: './assets/peach.glb', position: { x: 0, y: 0.7, z: -1 }, rotation: { x: 0, y: Math.PI / -1.5, z: 0 }, name: 'peach01' },
        { path: './assets/beans.glb', position: { x: 2.2, y: -1.0, z: -0.3 }, rotation: { x: 0, y: Math.PI / -1.5, z: 0 }, name: 'beans' },
        { path: './assets/raisin.glb', position: { x: -0.8, y: 0.5, z: 1.2 }, rotation: { x: Math.PI / 4, y: 0, z: 0 }, name: 'raisin01' },
        { path: './assets/raisin.glb', position: { x: 0.8, y: 0.5, z: 0.8 }, name: 'raisin02' },
        { path: './assets/raisin.glb', position: { x: 0, y: 0, z: 1.6 }, rotation: { x: Math.PI / 2, y: 0, z: 0 }, name: 'raisin03' }
      ];

      const loader = new GLTFLoader();
      const promises = gltfPaths.map(({ path, position, rotation, name }) =>
        new Promise((res) => {
          loader.load(path, (gltf) => {
            const scene = gltf.scene;

            if (rotation) {
              scene.rotation.set(rotation.x, rotation.y, rotation.z);
            }

            if (path.includes('ice')) {
              this.gltfScenes.push(scene);
            } else {
              this.gltfScenes.push(scene);
              if (position) {　scene.position.set(position.x, position.y, position.z);　}
              if (name) {　this[name] = scene;　}
              this.addObject(scene);
            }

            res();
          });
        })
      );

      Promise.all(promises).then(() => resolve());
    });
  }

  addObject(object) {
    if (object && !this.objects.includes(object)) {
      this.objects.push(object);
    }
  }
  handleClick(event) {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);
    const intersects = this.raycaster.intersectObjects(this.objects, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      let parent = object;

      // 親オブジェクトを取得
      while (parent.parent) {
        if (this.objects.includes(parent)) {
          break;
        }
        parent = parent.parent;
      }

      // オブジェクトの選択・解除
      if (this.selectedObject === parent) {
        this.selectedObject = null;
        this.isDragging = false;
        this.renderer.domElement.style.cursor = 'grab';  // カーソルを戻す
      } else {
        this.selectedObject = parent;
        this.isDragging = true;
        this.renderer.domElement.style.cursor = 'grabbing';  // カーソルを変える
      }
    } else {
      this.selectedObject = null;
      this.isDragging = false;
      this.renderer.domElement.style.cursor = 'grab';  // カーソルを戻す
    }
  }

  handleMouseMove(event) {
    if (this.isDragging && this.selectedObject) {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      const currentMouse = new THREE.Vector2(mouseX, mouseY);

      // カメラ基準の平面を計算
      const planeNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const plane = new THREE.Plane(planeNormal, -this.selectedObject.position.dot(planeNormal));

      this.raycaster.setFromCamera(currentMouse, this.camera);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, intersection);

      // 初期位置オフセットを考慮してオブジェクトを移動
      const offset = intersection.clone().sub(this.selectedObject.position);
      if (!this.dragStartOffset) {
        this.dragStartOffset = offset;
      }
      const newPosition = intersection.clone().sub(this.dragStartOffset);
      this.selectedObject.position.copy(newPosition);
    }
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStartOffset = null;
    }
  }

  handleKeyDown(event) {
    if (!this.selectedObject) return;

    const moveSpeed = 0.1; // 移動速度
    const rotationSpeed = Math.PI / 180 * 5;

    // カメラのローカル座標系に基づいて移動
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();
    const forward = cameraDirection.clone().normalize();

    switch (event.key) {
      case "ArrowLeft": // 左回転
        this.selectedObject.rotation.y -= rotationSpeed;
        break;
      case "ArrowRight": // 右回転
        this.selectedObject.rotation.y += rotationSpeed;
        break;
      case "ArrowUp": // 前傾
        this.selectedObject.rotation.x -= rotationSpeed;
        break;
      case "ArrowDown": // 後傾
        this.selectedObject.rotation.x += rotationSpeed;
        break;
      case "w": // 前進
        this.selectedObject.position.addScaledVector(forward, moveSpeed);
        break;
      case "s": // 後退
        this.selectedObject.position.addScaledVector(forward, -moveSpeed);
        break;
      case "a": // 左移動
        this.selectedObject.position.addScaledVector(right, -moveSpeed);
        break;
      case "d": // 右移動
        this.selectedObject.position.addScaledVector(right, moveSpeed);
        break;
      case "q": // 上昇
        this.selectedObject.position.addScaledVector(up, moveSpeed);
        break;
      case "e": // 下降
        this.selectedObject.position.addScaledVector(up, -moveSpeed);
        break;
      default:
        break;
    }
  }

  handleAltClick(event) {
    if (!event.altKey) return;

    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

    const intersects = this.raycaster.intersectObjects(this.objects, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      let parent = object;

      while (parent.parent) {
        if (this.objects.includes(parent)) {
          break;
        }
        parent = parent.parent;
      }

      // オブジェクトを複製して追加
      const clone = parent.clone();
      clone.position.add(new THREE.Vector3(2, 0, 0));
      this.scene.add(clone);
      this.objects.push(clone);
    }
  }


  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    if (this.camera.position.y <= 0) {
      this.camera.position.y = -0.1;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }

}
