import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import {GLTFLoader} from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js";
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import {FBXLoader} from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader.js";

class App {

    // init
    constructor() {
        // renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // container
        this.container = document.querySelector("#container");
        this.container.appendChild(this.renderer.domElement);

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);

        // camera
        this.camera = new THREE.PerspectiveCamera(
            40,
            window.innerWidth / window.innerHeight,
            100,
            2000
        );
        this.camera.position.set(0, 0, 1000);

        // light
        const color = 0xffffff;
        const intensity = 5;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(0, 0, 100);
        this.scene.add(light);

        // control
        new OrbitControls(this.camera, this.container);

        // set background
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('./model/terrain.glb', (gltf) => {
            this.terrain = gltf.scene.children[ 0 ];
            this.terrain.material = new THREE.MeshNormalMaterial();
            this.terrain.scale.multiplyScalar( 5 );
            this.scene.add( this.terrain );
        });

        //
        this._render(1);
    }

    _render(time) {
        this.renderer.render(this.scene, this.camera);
        if (this.hero) {
            this.hero.updateAnimation(time);
        }
        requestAnimationFrame(this._render.bind(this));
    }

    setHero(hero) {
        this.hero = hero;
    }
}

class Hero {
    ANIMATION_IDLE = 1; ANIMATION_ATTACK = 0;
    prevAnimationTick = 0;

    constructor(app) {
        const fbxLoader = new FBXLoader();
        fbxLoader.load('./model/katana_purple_swing.fbx', (fbx) => {
            // load model
            fbx.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child instanceof THREE.Mesh) {
                    // hero texture
                    child.material = new THREE.MeshNormalMaterial()
                    child.material.needsUpdate = true;
                }
                if (child.isGroup) {
                    child.rotation.x=Math.PI;
                    child.rotation.y=Math.PI;
                    child.rotation.z=Math.PI;
                }
            });

            // model animation
            const mixer = new THREE.AnimationMixer(fbx);
            mixer.addEventListener('finished', _ => {
               this.changeAnimation(this.ANIMATION_IDLE);
            });

            fbx.mixer = mixer;
            this.mixer = mixer;

            this.animations = [];

            const attackAction = fbx.mixer.clipAction(fbx.animations[this.ANIMATION_ATTACK]);
            attackAction.setLoop(THREE.LoopOnce);
            this.animations.push(attackAction);

            const idleAction = fbx.mixer.clipAction(fbx.animations[this.ANIMATION_IDLE]);
            idleAction.play();
            this.animations.push(idleAction);

            this.curAnimation = idleAction;

            app.scene.add(fbx);
            app.setHero(this);
        });
    }

    changeAnimation(index) {
        if (!this.animations) return;

        const previousAnimationAction = this.curAnimation;
        this.curAnimation = this.animations[index];

        if(previousAnimationAction !== this.curAnimation) {
            previousAnimationAction.fadeOut(0.5);
            this.curAnimation.reset().fadeIn(0.1).play();
        }
    }

    updateAnimation(time) {
        time *= 0.001;
        if (this.mixer) {
            const deltaTime = time - this.prevAnimationTick;
            this.mixer.update(deltaTime);
        }
        this.prevAnimationTick = time;
    }
}

window.onload = function() {
    const app = new App();
    const hero = new Hero(app);

    window.onclick = function() {
        hero.changeAnimation(hero.ANIMATION_ATTACK);
    }
}