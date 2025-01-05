// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import { GLTFLoader } from '../lib/GLTFLoader.js'; // glTF のローダーを追加 @@@

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
    far: 100.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
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
    near: 15.0,
    far: 25.0,
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
  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // this のバインド
    this.render = this.render.bind(this);

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    // Raycaster のインスタンス
    this.raycaster = new THREE.Raycaster();

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("click", (event) => {
      if (event.altKey) {
        this.handleAltClick(event);
      } else {
        this.handleClick(event);
      }
    });

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    // ウィンドウのリサイズ
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
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

    // シーンに glTF を追加
    this.gltfScenes.forEach((gltfScene) => {
      this.scene.add(gltfScene);
    });

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

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
        { path: './assets/plain.gltf' }, // plain.gltfは特別扱い
        { path: './assets/cherry.gltf', position: { x: -5, y: 3, z: 0 }, name: 'cherry' },
        { path: './assets/mikan.gltf', position: { x: -4, y: 3, z: 0 }, name: 'mikan' },
        { path: './assets/pine.gltf', position: { x: -3, y: 3, z: 0 }, name: 'pine' },
        { path: './assets/melon.gltf', position: { x: -2, y: 3, z: 0 }, name: 'melon' },
        { path: './assets/banana.gltf', position: { x: -1, y: 3, z: 0 }, name: 'banana' },
        { path: './assets/strawberry.gltf', position: { x: 0, y: 3, z: 0 }, name: 'strawberry' },
        { path: './assets/jelly_green.gltf', position: { x: 1, y: 3, z: 0 }, name: 'jelly_green' },
        { path: './assets/jelly_red.gltf', position: { x: 1, y: 4, z: 0 }, name: 'jelly_red' },
        { path: './assets/peach.gltf', position: { x: 2, y: 3, z: 0 }, name: 'peach' },
        { path: './assets/beans.gltf', position: { x: 3, y: 3, z: 0 }, name: 'beans' },
        { path: './assets/raisin.gltf', position: { x: 4, y: 3, z: 0 }, name: 'raisin' },
      ];

      const loader = new GLTFLoader();
      const promises = gltfPaths.map(({ path, position, name }) =>
        new Promise((res) => {
          loader.load(path, (gltf) => {
            const scene = gltf.scene;

            if (path.includes('plain')) {
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

      // 対象オブジェクトの親を確認
      while (parent.parent) {
        if (this.objects.includes(parent)) {
          break;
        }
        parent = parent.parent;
      }

      if (this.selectedObject === parent) {
        // 同じオブジェクトをクリックした場合は選択解除
        this.selectedObject = null;
        this.isDragging = false;
      } else {
        // 新しいオブジェクトを選択
        this.selectedObject = parent;
        this.isDragging = true;
      }
    } else {
      // オブジェクト外をクリックした場合、選択解除
      this.selectedObject = null;
      this.isDragging = false;
    }
  }

  handleMouseMove(event) {
    if (this.isDragging && this.selectedObject) {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      const mouseVector = new THREE.Vector3(mouseX, mouseY, 0.5);
      mouseVector.unproject(this.camera);

      const dir = mouseVector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      const position = this.camera.position.clone().add(dir.multiplyScalar(distance));

      // xとy軸の位置のみ更新
      this.selectedObject.position.set(position.x, position.y, this.selectedObject.position.z);
    }
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  handleKeyDown(event) {
    if (!this.selectedObject) return;

    const moveSpeed = 0.1; // 移動速度

    switch (event.key) {
      case "ArrowLeft":
        this.selectedObject.rotation.y -= Math.PI / 180 * 5;
        break;
      case "ArrowRight":
        this.selectedObject.rotation.y += Math.PI / 180 * 5;
        break;
      case "ArrowUp":
        this.selectedObject.rotation.x -= Math.PI / 180 * 5;
        break;
      case "ArrowDown":
        this.selectedObject.rotation.x += Math.PI / 180 * 5;
        break;
      case "w": // z軸に対して奥に移動
        this.selectedObject.position.z -= moveSpeed;
        break;
      case "s": // z軸に対して手前に移動
        this.selectedObject.position.z += moveSpeed;
        break;
      case "Delete": // `Delete`キーでオブジェクトを削除
        this.scene.remove(this.selectedObject);  // シーンからオブジェクトを削除
        this.selectedObject = null;  // 選択されたオブジェクトをnullにリセット
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

      // 対象オブジェクトの親を確認
      while (parent.parent) {
        if (this.objects.includes(parent)) {
          break;
        }
        parent = parent.parent;
      }

      // オブジェクトを複製して追加
      const clone = parent.clone();
      clone.position.add(new THREE.Vector3(2, 0, 0)); // 少しずらして配置
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
