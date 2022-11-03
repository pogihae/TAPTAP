import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';

const ACTION_ATTACK = "Slash10";
const ACTION_ATTACK2 = "Slash20";
const ACTION_IDLE = "StandingIdle0";
const ACTION_WALK = "WalkForward0";
const ACTION_FINISH = "Finish0";

const HERO_SWORD = "HERO_SWORD";
const HERO_AXE = "HERO_AXE";
const HERO_KATANA = "HERO_KATANA";

let app;
let gamestart;
let isSlash = true;

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

        const shadowSize = 500;
        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 200, -100);
        light.castShadow = true;
        light.shadow.mapSize.x = 2048
        light.shadow.mapSize.y = 2048
        light.shadow.camera.top = shadowSize;
        light.shadow.camera.bottom = -shadowSize;
        light.shadow.camera.left = -shadowSize;
        light.shadow.camera.right = shadowSize;
        this.scene.add(light);
        this.sun = light;

        // control
        this.control = new OrbitControls(this.camera, this.container);

        this.setBackground(new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
        this.setColliders(
            new THREE.BoxGeometry(500, 400, 500),
            new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true })
        );

        this._initHeroes();
        this._initMonsters(onLoaded);

        this.count = 0;
        this._render(1);
    }

    _initHeroes() {
        this.heroes = {};
        new Hero('./model/hero/Axe.glb', h => { this.heroes[HERO_AXE] = h }, HERO_AXE);
        new Hero('./model/hero/Katana.glb', h => { this.heroes[HERO_KATANA] = h; }, HERO_KATANA);
        new Hero('./model/hero/Sword.glb', h => { this.heroes[HERO_SWORD] = h; }, HERO_SWORD);
        console.log(this.heroes);
    }

    _initMonsters(onLoaded) {
        this.monsters = [];
        //new Monster('./model/monster_doozy.glb', m => {this.monsters.push(m)});
        new Monster('./model/monster/monster_guard.glb', m => {
                this.monsters.push(m)
            }, 10,
            new THREE.MeshPhongMaterial({
                color: 0x000089,
                depthWrite: false
            }));
        new Monster('./model/monster/monster_maskman.glb', m => {
            this.monsters.push(m)
        }, 20, new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            depthWrite: false
        }));
        new Monster('./model/monster/monster_mouse.glb', m => {
            this.monsters.push(m)
        }, 30, new THREE.MeshPhongMaterial({
            color: 0xff0000,
            depthWrite: false
        }));
        new Monster('./model/monster/monster_rabbit.glb', m => {
            this.monsters.push(m)
        }, 40, new THREE.MeshPhongMaterial({
            color: 0x001000,
            depthWrite: false
        }));
        new Monster('./model/monster/monster_zombie.glb', m => {
                this.monsters.push(m);
                onLoaded()},
            50,
            new THREE.MeshPhongMaterial({
                color: 0x00f500,
                depthWrite: false
            }));

        this.monsterIdx = 0;
    }

    _render(time) {
        this.renderer.render(this.scene, this.camera);
        if (this.hero) {
            this.hero.updateAnimation(time);
        }
        if (this.monster) {
            this.count += 1;
            const clampNumber = (num, min, max) => Math.max(Math.min(num, Math.max(min, max)), Math.min(min, max));
            this.maximum = 2200;
            this.minimum = 1000;
            this.countEnd = this.monster.hit*100*0.75
            
            if (this.count > clampNumber(this.countEnd, this.minimum, this.maximum)) {
                gameOver();
                console.log(this.count);
                return;
            }
            this.monster.model.scale.multiplyScalar(1.001);
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
            let toRemove = this.hero.model;
            this.hero.model.position.y -= 100;
            this.hero.model.position.z = 100;
            this.scene.remove(toRemove);
        }
        this.hero = this.heroes[hero];
        console.log(hero + " " + this.hero)
        console.log(this.heroes);
        this.hero.model.position.y += 100;
        this.hero.model.position.z -= 560;
        this.scene.add(this.hero.model);
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
        let scalar = Math.pow(0.999, this.count);
        this.monster.model.scale.multiplyScalar(scalar);
        this.monster.model.rotation.y -= Math.PI;
        this.count = 0;
        let monster = this.monster;
        app.scene.remove(monster.model);
        app.scene.remove(monster.HPbar);

        this.monsterIdx += 1;
        this.monsterIdx %= this.monsters.length;

        this.setMonster(this.monsters[this.monsterIdx]);

        document.onclick = function() { docOnclick(); }
    }
}

class Hero {
    prevAnimationTick = 0;
    walkCount = 0;


    constructor(modelPath, onModelLoaded, type) {
        const fbxLoader = new GLTFLoader();
        fbxLoader.load(modelPath, (gltf) => {
            this.model = new THREE.Object3D();
            this.model.add(gltf.scene);

            // load model
            gltf.scene.traverse(child => {
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
            const mixer = new THREE.AnimationMixer(gltf.scene);

            gltf.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(modelPath+" \n");

            console.log(gltf.animations);
            gltf.animations.forEach(clip => {
                const name = clip.name;
                this.animations[name] = mixer.clipAction(clip);
            });

            const attackAction = this.animations[ACTION_ATTACK]
            attackAction.setLoop(THREE.LoopOnce);
            attackAction.setDuration(0.7);
            const attackAction2 = this.animations[ACTION_ATTACK2]
            attackAction2.setLoop(THREE.LoopOnce);
            attackAction2.setDuration(0.7);
            const idleAction = this.animations[ACTION_IDLE];
            const walkAction = this.animations[ACTION_WALK]
            walkAction.setDuration(2);

            const finishAction = this.animations[ACTION_FINISH];
            finishAction.setLoop(THREE.LoopOnce);
            finishAction.setDuration(0.7);
            this.finishAction = finishAction;

            this.curAnimation = idleAction;
            idleAction.play();

            mixer.addEventListener('finished', _ => {

                if (this.curAnimation === attackAction || this.curAnimation === finishAction) {
                    app.camera.zoom = 2.5;
                    app.camera.updateProjectionMatrix();
                    this.changeAnimation(ACTION_IDLE);
                }
            });

            mixer.addEventListener('loop', _ => {
                if (this.curAnimation === walkAction) {
                    app.control.autoRotate = true;
                    app.control.autoRotateSpeed = 9.0;

                    document.onclick = function () {};
                    this.model.translateZ(50);
                    if (++this.walkCount > 4) {
                        app.control.autoRotate = false;
                        app.camera.zoom = 1.5;

                        app.camera.updateProjectionMatrix();
                        walkAction.fadeOut(0.5);
                        gamestart.className = "hide";
                        this.changeAnimation(ACTION_IDLE);

                        console.log("WALKEND: " + this.model.position.z)
                        document.onclick = function () {
                            docOnclick();
                        }
                    }
                }
            });

            this.type = type;

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
            if (name === ACTION_FINISH) {
                app.camera.zoom = 3;
                app.camera.updateProjectionMatrix();
            }
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

    constructor(modelPath, onModelLoaded, hit, bgmaterial) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(modelPath, (gltf) => {
            gltf.scene.position.y = 68;

            this.model = new THREE.Object3D();
            this.model.add(gltf.scene);

            // load model
            gltf.scene.traverse(child => {
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
            this.hit = hit;
            this.hit_count = 0;
            this.bleed = hit/10;
            this.hp = 150;
            const geometry = new THREE.BoxGeometry(10, this.hp, 10);
            const material = new THREE.MeshMatcapMaterial({color: 0xff0000});
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(-60, this.hp/2+5, 30);
            this.HPbar = cube;

            this.bgMaterial = bgmaterial;

            this.coldMaterial = new THREE.MeshBasicMaterial({color: bgmaterial.color, wireframe: true})

            // 애니메이션
            const mixer = new THREE.AnimationMixer(gltf.scene);
            mixer.addEventListener('finished', _ => {
                this.changeAnimation('IDLE');

                if (++this.hit_count % this.bleed == 0){
                    this.hp -= 15;
                    this.HPbar.position.y = this.hp/2+5;
                    console.log("hp "+this.hp+", hit_count "+this.hit_count);
                }
                if (this.hp <= 0) {
                    app.nextMonster();
                    this.hp = 150;
                    this.hit_count = 0;
                    return;
                }
                this.HPbar.geometry = new THREE.BoxGeometry(10, this.hp, 10);
                this.HPbar.geometry.needsUpdate = true;
            });

            gltf.mixer = mixer;
            this.mixer = mixer;

            this.animations = {};
            console.log(gltf.animations);

            gltf.animations.forEach(clip => {
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

function gameOver() {
    document.getElementById('gameoverInstructions').className = "show";
    document.onclick = function () {
        
    }
}

function docOnclick() {
    if (isSlash && !app.monsterIdx.nextFinish) {
        app.hero.changeAnimation(ACTION_ATTACK);
    } else if (app.monster.nextFinish) {
        app.hero.changeAnimation(ACTION_FINISH);
    } else {
        app.hero.changeAnimation(ACTION_ATTACK2);
    }

    isSlash = !isSlash;
    app.monster.changeAnimation('HIT_REACTION');
}

window.onload = function () {
    gamestart = document.getElementById('gamestartInstructions');
    gamestart.className = "show";

    app = new App(function () {
        app.setHero(HERO_KATANA);
        new Monster('./model/monster/monster_doozy.glb', monster => {
            app.setMonster(monster);
            app.hero.changeAnimation(ACTION_WALK);
        }, 10, new THREE.MeshPhongMaterial({color: 0x00f000}));
    });

    document.getElementById('toSword').onclick = function() {
        app.setHero(HERO_SWORD);
    }
    document.getElementById('toAxe').onclick = function() {
        app.setHero(HERO_AXE);
    }
    document.getElementById('toKatana').onclick = function() {
        app.setHero(HERO_KATANA);
    }

}