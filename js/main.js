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
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a0a0, 1000, 5000);

        // camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
        this.camera.position.set(0, 500, 1000);

        // light
        /*const color = 0xffffff;
        const intensity = 5;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(0, 500, -1000);
        this.scene.add(light);*/

        let light = new THREE.HemisphereLight(0xffffff, 0x444444);
        light.position.set(0, 200, 0);
        this.scene.add(light);

        const shadowSize = 200;
        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 200, -100);
        light.castShadow = true;
        light.shadow.camera.top = shadowSize;
        light.shadow.camera.bottom = -shadowSize;
        light.shadow.camera.left = -shadowSize;
        light.shadow.camera.right = shadowSize;
        this.scene.add(light);
        this.sun = light;

        // control
        this.control = new OrbitControls(this.camera, this.container);
        //this.control.autoRotate = true;

        this.setBackground(new THREE.MeshPhongMaterial({
            color: 0x999999,
            depthWrite: false
        }));
        this.setColliders(new THREE.BoxGeometry(500, 400, 500),
            new THREE.MeshBasicMaterial({color: 0x222222, wireframe: true}));

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

    setBackground(material) {
        if (this.grid) {
            this.scene.remove(this.mesh);
            this.scene.remove(this.grid);
        }
        this.mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(10000, 10000), material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        this.grid = new THREE.GridHelper(5000, 40, 0x000000, 0x000000);
        this.grid.material.opacity = 0.2;
        this.grid.material.transparent = true;
        this.scene.add(this.grid);
    }

    setColliders(newGeometry, newMaterial) {
        if (this.stage) {
            this.scene.remove(this.stage);
            for (let i=0; i<this.colliders.length; i++) {
                this.scene.remove(this.colliders[i]);
            }
        }
        const geometry = newGeometry;
        const material = newMaterial;

        this.colliders = [];

        for (let x = -5000; x < 5000; x += 1000) {
            for (let z = 0; z < 5000; z += 1000) {
                if (x == 0 && z == 0) continue;
                const box = new THREE.Mesh(geometry, material);
                box.position.set(x, 250, z);
                this.scene.add(box);
                this.colliders.push(box);
            }
        }

        const geometry2 = new THREE.BoxGeometry(1000, 40, 1000);
        const stage = new THREE.Mesh(geometry2, material);
        stage.position.set(0, 20, 0);
        this.colliders.push(stage);

        this.stage = stage;
        this.scene.add(this.stage);
    }

    setHero(hero) {
        if (this.hero) {
            this.scene.remove(this.hero.model);
            this.hero = null;
        }
        this.hero = hero;
        this.hero.model.position.z -= 560;
        this.scene.add(this.hero.model);

        this.control.autoRotate = true;
        this.control.autoRotateSpeed = 4.0;
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
    walkCount = 0;

    constructor(modelPath, onModelLoaded) {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelPath, (fbx) => {
            this.model = new THREE.Object3D();
            this.model.add(fbx);

            // load model
            fbx.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child instanceof THREE.Mesh) {
                    // hero texture
                    /*child.material = new THREE.MeshNormalMaterial()
                    child.material.needsUpdate = true;*/
                }
                if (child.isGroup) {
                    child.rotation.x = Math.PI;
                    child.rotation.y = Math.PI;
                    child.rotation.z = Math.PI;
                }
            });

            // model animation
            const mixer = new THREE.AnimationMixer(fbx);

            fbx.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(fbx.animations);

            const attackAction = fbx.mixer.clipAction(fbx.animations[2]);
            attackAction.setLoop(THREE.LoopOnce);
            attackAction.setDuration(0.7);
            this.animations['ATTACK'] = attackAction;

            const idleAction = fbx.mixer.clipAction(fbx.animations[3]);
            this.animations['IDLE'] = idleAction;

            const walkAction = fbx.mixer.clipAction(fbx.animations[0]);
            walkAction.setDuration(2);
            this.animations['WALK'] = walkAction;

            this.curAnimation = walkAction;
            walkAction.play();

            mixer.addEventListener('finished', _ => {
                if (this.curAnimation === attackAction) {
                    this.changeAnimation('IDLE');
                }
            });

            mixer.addEventListener('loop', _ => {
                if (this.curAnimation === walkAction) {
                    this.model.translateZ(50);
                    if (++this.walkCount > 6) {
                        app.control.autoRotate = false;
                        walkAction.fadeOut(0.5);
                        this.changeAnimation('IDLE');
                    }
                }
            });

            onModelLoaded(this);
        });
    }

    changeAnimation(name) {
        if (!this.animations) return;

        const previousAnimationAction = this.curAnimation;
        this.curAnimation = this.animations[name];

        if (previousAnimationAction !== this.curAnimation) {
            //this.mixer.stopAllAction();
            //previousAnimationAction.fadeOut(0.5);
            this.curAnimation.reset().play();
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
            this.animations['IDLE'] = idleAction;

            this.curAnimation = idleAction;
            idleAction.play();

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

const app = new App();

window.onload = function () {
    const hero = new Hero('./model/pack_edited.fbx',hero => {
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