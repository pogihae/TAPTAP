import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';


const ACTION_ATTACK = "Attack0";
const ACTION_IDLE = "StandingIdle0";
const ACTION_WALK = "WalkForward0";

class App {

    // init
    constructor(onLoaded) {
        // renderer
        this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // container
        this.container = document.getElementById("world");
        this.container.appendChild(this.renderer.domElement);

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a0a0, 1000, 5000);

        // camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
        this.camera.position.set(0, 500, 1000);

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

        this.setBackground(new THREE.MeshPhongMaterial({
            color: 0x999999,
            depthWrite: false
        }));
        this.setColliders(new THREE.BoxGeometry(500, 400, 500),
            new THREE.MeshBasicMaterial({color: 0x222222, wireframe: true}));

        this.monsters = [];
        //new Monster('./model/monster_doozy.glb', m => {this.monsters.push(m)});
        new Monster('./model/monster_guard.glb', m => {
                this.monsters.push(m)
            }, 10,
            new THREE.MeshPhongMaterial({
                color: 0x000089,
                depthWrite: false
            }));
        new Monster('./model/monster_maskman.glb', m => {
            this.monsters.push(m)
        }, 20, new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            depthWrite: false
        }));
        new Monster('./model/monster_mouse.glb', m => {
            this.monsters.push(m)
        }, 30, new THREE.MeshPhongMaterial({
            color: 0xff0000,
            depthWrite: false
        }));
        new Monster('./model/monster_rabbit.glb', m => {
            this.monsters.push(m)
        }, 40, new THREE.MeshPhongMaterial({
            color: 0x001000,
            depthWrite: false
        }));
        new Monster('./model/monster_zombie.glb', m => {
            this.monsters.push(m)
        }, 50, new THREE.MeshPhongMaterial({
            color: 0x00f500,
            depthWrite: false
        }));

        this.monsterIdx = 0;

        this._render(1);

        onLoaded();
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
        if (this.mesh) {
            console.log("bg exist");
            this.scene.remove(this.mesh);
            //this.scene.remove(this.grid);
        }
        this.mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 1000), material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        this.grid = new THREE.GridHelper(1000, 10, 0x000000, 0x000000);
        this.grid.material.opacity = 0.2;
        this.grid.material.transparent = true;
        this.scene.add(this.grid);

        console.log("new bg set");
    }

    setColliders(newGeometry, newMaterial) {
        if (this.stage) {
            this.scene.remove(this.stage);
            for (let i = 0; i < this.colliders.length; i++) {
                this.scene.remove(this.colliders[i]);
            }
        }
        const geometry = newGeometry;
        const material = newMaterial;

        this.colliders = [];

        for (let x = -5000; x < 5000; x += 1000) {
            for (let z = 0; z < 5000; z += 1000) {
                if (x === 0 && z === 0) continue;
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
        this.monster.model.rotation.y += Math.PI;
        //this.monster.position.y = 68;

        this.mesh.material = this.monster.bgMaterial;
        this.mesh.material = new THREE.MeshStandardMaterial({
            metalness: 1,
        });
        this.mesh.material.needsUpdate = true;

        this.colliders.forEach(c => {
            c.material = monster.coldMaterial;
            c.material.needsUpdate = true;
        })

        this.scene.add(this.monster.model);
        this.scene.add(this.monster.HPbar);
    }

    nextMonster() {
        if (!this.monster) {
            return;
        }
        let monster = this.monster;
        app.scene.remove(monster.model);
        app.scene.remove(monster.HPbar);

        this.monsterIdx += 1;
        this.monsterIdx %= this.monsters.length;

        this.setMonster(this.monsters[this.monsterIdx]);

        document.onclick = function () {
            app.hero.changeAnimation(ACTION_ATTACK);
            app.monster.changeAnimation('HIT_REACTION');
        }
    }
}

class Hero {
    prevAnimationTick = 0;
    walkCount = 0;

    constructor(modelPath, onModelLoaded) {
        const fbxLoader = new GLTFLoader();
        fbxLoader.load(modelPath, (fbx) => {
            this.model = new THREE.Object3D();
            this.model.add(fbx.scene);

            // load model
            fbx.scene.traverse(child => {
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
            const mixer = new THREE.AnimationMixer(fbx.scene);

            fbx.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(fbx.animations);
            fbx.animations.forEach(clip => {
                const name = clip.name;
                this.animations[name] = mixer.clipAction(clip);
            });

            const attackAction = this.animations[ACTION_ATTACK]
            attackAction.setLoop(THREE.LoopOnce);
            attackAction.setDuration(0.7);
            const walkAction = this.animations[ACTION_WALK]
            walkAction.setDuration(2);

            this.curAnimation = walkAction;
            walkAction.play();

            mixer.addEventListener('finished', _ => {
                if (this.curAnimation === attackAction) {
                    this.changeAnimation(ACTION_IDLE);
                }
            });

            mixer.addEventListener('loop', _ => {
                if (this.curAnimation === walkAction) {
                    this.model.translateZ(50);
                    if (++this.walkCount > 4) {
                        app.control.autoRotate = false;
                        app.camera.zoom = 2.5;
                        app.camera.updateProjectionMatrix();
                        walkAction.fadeOut(0.5);
                        gamestart.className = "hide";
                        this.changeAnimation(ACTION_IDLE);
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

    constructor(modelPath, onModelLoaded, hp, bgmaterial) {
        const fbxLoader = new GLTFLoader();
        fbxLoader.load(modelPath, (fbx) => {
            fbx.scene.position.y = 68;

            this.model = new THREE.Object3D();
            this.model.add(fbx.scene);

            // load model
            fbx.scene.traverse(child => {
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
            this.hp = hp;
            const geometry = new THREE.BoxGeometry(this.hp, 10, 10);
            const material = new THREE.MeshBasicMaterial({});
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(1, 155, 1);
            this.HPbar = cube;

            this.bgMaterial = bgmaterial;

            this.coldMaterial = new THREE.MeshBasicMaterial({color: bgmaterial.color, wireframe: true})

            // 애니메이션
            const mixer = new THREE.AnimationMixer(fbx.scene);
            mixer.addEventListener('finished', _ => {
                this.changeAnimation('IDLE');
                this.hp -= 10;
                if (this.hp <= 0) {
                    app.nextMonster();
                    return;
                }
                this.HPbar.geometry = new THREE.BoxGeometry(this.hp, 10, 10);
                this.HPbar.geometry.needsUpdate = true;
            });

            fbx.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(fbx.animations);

            fbx.animations.forEach(clip => {
                const name = clip.name;
                this.animations[name] = mixer.clipAction(clip);
            });

            const attackAction = this.animations['HIT_REACTION'];
            attackAction.setLoop(THREE.LoopOnce);
            attackAction.setDuration(0.7);

            const idleAction = this.animations['IDLE'];

            this.curAnimation = idleAction;
            idleAction.play();

            onModelLoaded(this);
        });
    }

    changeAnimation(name) {
        console.log("change Animation to " + name);
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

let app;
let gamestart;

window.onload = function () {
    gamestart = document.getElementById('gamestartInstructions');
    gamestart.className = "show";

    app = new App(function () {

    });
    const hero = new Hero('./model/finished.glb', hero => {
        app.setHero(hero);
    });
    const monster = new Monster('./model/monster_doozy.glb', monster => {
        app.setMonster(monster);
    }, 10, new THREE.MeshPhongMaterial({
        color: 0x00f000,
        depthWrite: false
    }));

    document.onclick = function () {
        hero.changeAnimation(ACTION_ATTACK);
        monster.changeAnimation('HIT_REACTION');
    }

}