import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader.js";

class App {

    // init
    constructor() {
        // renderer
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // container
        this.container = document.querySelector("#container");
        this.container.appendChild(this.renderer.domElement);

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.TextureLoader().load( './image/sky.jpg' );

        // camera
        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 500, -1000);

        // light
        const color = 0xffffff;
        const intensity = 5;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(0, 500, -1000);
        this.scene.add(light);

        // control
        this.control = new OrbitControls(this.camera, this.container);
        //this.control.autoRotate = true;

        // set ground
        const planeGeometry = new THREE.PlaneGeometry(30, 100, 9, 9);
        const planeMaterial = new THREE.MeshBasicMaterial({color: 0xAAAAAA, side: THREE.DoubleSide});
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -0.5 * Math.PI;
        plane.scale.multiplyScalar(30);
        this.scene.add(plane);

        /*//terrain 모델
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('./model/terrain.glb', (gltf) => {
            this.terrain = gltf.scene.children[ 0 ];
            this.terrain.material = new THREE.MeshNormalMaterial();
            this.terrain.scale.multiplyScalar( 80 );
            this.scene.add( this.terrain );
        });*/


        //
        this._render(1);
    }

    _render(time) {
        this.renderer.render(this.scene, this.camera);
        if (this.hero) {
            this.hero.updateAnimation(time);
        }
        if (this.monster) {
            this.monster.updateAnimation(time);
        }
        this.control.update();
        requestAnimationFrame(this._render.bind(this));
    }

    setHero(hero) {
        if (this.hero) {
            this.scene.remove(this.hero.model);
            this.hero = null;
        }
        this.hero = hero;
        this.hero.model.position.z -= 430;
        this.scene.add(this.hero.model);
    }

    setMonster(monster) {
        if (this.monster) {
            this.scene.remove(this.monster.model);
            this.monster = null;
        }
        this.monster = monster;
        this.monster.model.rotation.y += Math.PI; // 앞 모습

        this.scene.add(this.monster.model);
        this.scene.add(this.monster.HPbar);
    }
}

class Hero {
    prevAnimationTick = 0;

    constructor(modelPath, onModelLoaded) {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelPath, (fbx) => {
            this.model = fbx;

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
                    child.rotation.x = Math.PI;
                    child.rotation.y = Math.PI;
                    child.rotation.z = Math.PI;
                }
            });

            // model animation
            const mixer = new THREE.AnimationMixer(fbx);
            mixer.addEventListener('finished', _ => {
                this.changeAnimation('IDLE');
            });

            fbx.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(fbx.animations);

            const attackAction = fbx.mixer.clipAction(fbx.animations[0]);
            attackAction.setLoop(THREE.LoopOnce);
            attackAction.setDuration(0.7);
            this.animations['ATTACK'] = attackAction;

            const idleAction = fbx.mixer.clipAction(fbx.animations[3]);
            idleAction.play();
            this.animations['IDLE'] = idleAction;

            this.curAnimation = idleAction;

            onModelLoaded(this);
        });
    }

    changeAnimation(name) {
        if (!this.animations) return;

        const previousAnimationAction = this.curAnimation;
        this.curAnimation = this.animations[name];

        if (previousAnimationAction !== this.curAnimation) {
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

class Monster {
    prevAnimationTick = 0;

    constructor(modelPath, onModelLoaded) {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelPath, (fbx) => {
            this.model = fbx;

            // load model
            fbx.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.isGroup) {
                    child.rotation.x = Math.PI;
                    child.rotation.y = Math.PI;
                    child.rotation.z = Math.PI;
                }
            });

            // 몬스터 체력바
            const geometry = new THREE.BoxGeometry(150, 10, 10);
            const material = new THREE.MeshMatcapMaterial({color: 0x123456});
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(1, 155, 1);
            this.HPbar = cube;

            // 애니메이션
            const mixer = new THREE.AnimationMixer(fbx);
            mixer.addEventListener('finished', _ => {
                this.changeAnimation('IDLE');
                this.HPbar.material.color = new THREE.Color(0xffffff * Math.random());
                this.HPbar.material.needsUpdate = true;
            });

            fbx.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(fbx.animations);

            const attackAction = fbx.mixer.clipAction(fbx.animations[0]);
            attackAction.setLoop(THREE.LoopOnce);
            attackAction.setDuration(0.7);
            this.animations['HIT_REACTION'] = attackAction;

            const idleAction = fbx.mixer.clipAction(fbx.animations[1]);
            idleAction.play();
            this.animations['IDLE'] = idleAction;

            this.curAnimation = idleAction;

            onModelLoaded(this);
        });
    }

    changeAnimation(name) {
        if (!this.animations) return;

        const previousAnimationAction = this.curAnimation;
        this.curAnimation = this.animations[name];

        if (previousAnimationAction !== this.curAnimation) {
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

window.onload = function () {
    const app = new App();
    const hero = new Hero('./model/sword_pack.fbx',hero => {
        app.setHero(hero);
    });
    const monster = new Monster('./model/monster.fbx', monster => {
        app.setMonster(monster);
    });

    window.onclick = function () {
        hero.changeAnimation('ATTACK');
        monster.changeAnimation('HIT_REACTION');
    }
}