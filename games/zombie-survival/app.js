// 全局状态和核心逻辑
class GameState {
    constructor() {
        this.survivors = 1000000000000;
        this.health = 100;
        this.area = '主基地';
        this.equippedItem = 'minecar'; // 默认乘坐矿车
        this.swordFused = false;
        this.lastDamageTime = 0; // 防抖，控制受伤频率
        
        // 场景相关引用
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.zombies = [];
        this.npcs = [];
        this.keys = {};

        // 建筑和场景对象
        this.baseObjects = new THREE.Group();
        this.dormObjects = new THREE.Group();
        this.hotpotObjects = new THREE.Group();
        this.poolObjects = new THREE.Group();
        this.trainingObjects = new THREE.Group();
        this.weaponObjects = new THREE.Group();

        // 鼠标控制移动
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.targetPosition = null; // 玩家要移动到的目标点
    }

    initThreeJS() {
        const container = document.getElementById('game-container');
        
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // 蓝天白云色
        this.scene.fog = new THREE.Fog(0x87ceeb, 20, 100); // 调整雾效，变得明亮

        // 相机
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        // 灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 明亮的环境光
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 地面
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x7cfc00, roughness: 1.0 }); // 草地绿
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // 基地模型初始化
        this.baseObjects = new THREE.Group();
        this.dormObjects = new THREE.Group();
        this.hotpotObjects = new THREE.Group();
        this.poolObjects = new THREE.Group();
        this.trainingObjects = new THREE.Group();
        this.weaponObjects = new THREE.Group();

        // 建筑场景初始化
        this.buildBaseScene();
        this.buildDormScene();
        this.buildHotpotScene();
        this.buildPoolScene();
        this.buildWeaponStoreScene();
        this.buildTrainingScene();

        // 创建角色
        this.createCharacters();

        // 生成一些白色的花朵和环境装饰，让场景更生动
        this.createEnvironmentDecorations();

        // 默认显示主基地
        this.scene.add(this.baseObjects);

        // 监听窗口缩放
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 键盘监听（用于技能）
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.handleWeaponHotkeys(e.key.toLowerCase());
        });

        // 鼠标点击移动监听
        window.addEventListener('pointerdown', (e) => {
            if (e.target.tagName === 'BUTTON') return; // 点击UI时不移动
            
            // 归一化设备坐标
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            // 检测与地面的交点
            const intersects = this.raycaster.intersectObject(this.ground);
            
            if (intersects.length > 0) {
                this.targetPosition = intersects[0].point;
                // 添加一个简单的点击反馈标记（可选）
                this.showClickMarker(this.targetPosition);
            }
        });

        // 动画循环
        this.animate();
    }

    buildBaseScene() {
        // 基地围墙 (扩大基地尺寸，200x200，并加高墙壁)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        const wallGeo = new THREE.BoxGeometry(200, 10, 2);
        
        // 北墙
        const wallBack = new THREE.Mesh(wallGeo, wallMat);
        wallBack.position.set(0, 5, -100);
        wallBack.castShadow = true;
        
        // 南墙
        const wallFront = new THREE.Mesh(wallGeo, wallMat);
        wallFront.position.set(0, 5, 100);
        wallFront.castShadow = true;
        
        // 西墙
        const wallLeft = new THREE.Mesh(wallGeo, wallMat);
        wallLeft.rotation.y = Math.PI / 2;
        wallLeft.position.set(-100, 5, 0);
        wallLeft.castShadow = true;
        
        // 东墙
        const wallRight = new THREE.Mesh(wallGeo, wallMat);
        wallRight.rotation.y = Math.PI / 2;
        wallRight.position.set(100, 5, 0);
        wallRight.castShadow = true;

        // 基地中心雕像/喷泉
        const centerBaseGeo = new THREE.CylinderGeometry(5, 5, 1, 32);
        const centerBaseMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 });
        const centerBase = new THREE.Mesh(centerBaseGeo, centerBaseMat);
        centerBase.position.set(0, 0.5, 0);

        this.baseObjects.add(wallBack, wallFront, wallLeft, wallRight, centerBase);
    }

    buildDormScene() {
        // 宿舍地板和墙壁
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c }); // 木地板
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        this.dormObjects.add(floor);

        // 只有一张床
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
        const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 6), bedMat);
        bed.position.set(-10, 0.6, -10);
        bed.castShadow = true;
        this.dormObjects.add(bed);

        // 制造机模型排列：左边可乐机、中间食物机、右边纯净水机、最右边神龙大礼包机
        const machineMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6 });
        
        // 1. 快乐可乐制造机 (左边)
        const colaMachine = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), machineMat);
        colaMachine.position.set(-6, 2, 10);
        this.addMachineScreen(colaMachine, 0xe74c3c, "快乐可乐");
        this.dormObjects.add(colaMachine);

        // 2. 食物模仿机 (中间)
        const foodMachine = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 2.5), machineMat);
        foodMachine.position.set(0, 2, 10);
        this.addMachineScreen(foodMachine, 0xf1c40f, "食物模仿");
        this.dormObjects.add(foodMachine);

        // 3. 纯净水制造机 (右边)
        const waterMachine = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), machineMat);
        waterMachine.position.set(6, 2, 10);
        this.addMachineScreen(waterMachine, 0x3498db, "纯净水");
        this.dormObjects.add(waterMachine);

        // 4. 神龙大礼包制造机 (最右边，挨着食物模仿机/纯净水区域)
        const giftMachine = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), machineMat);
        giftMachine.position.set(12, 2, 10);
        this.addMachineScreen(giftMachine, 0x9b59b6, "大礼包");
        this.dormObjects.add(giftMachine);
    }

    addMachineScreen(machine, color, text) {
        // 屏幕
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshBasicMaterial({color: color}));
        screen.position.set(0, 0.8, 1.01);
        machine.add(screen);
        
        // 添加文字标签 (用Sprite简单代替)
        const label = this.makeTextSprite(text);
        label.position.set(0, 2.5, 0);
        machine.add(label);
        machine.castShadow = true;
    }

    buildHotpotScene() {
        // 火锅城地板
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xc0392b }); // 红色喜庆地毯
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        this.hotpotObjects.add(floor);

        // 餐桌和火锅
        for(let i=0; i<5; i++) {
            const angle = (i/5) * Math.PI * 2;
            const radius = 8;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // 桌子
            const tableGeo = new THREE.CylinderGeometry(2, 2, 1, 16);
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad });
            const table = new THREE.Mesh(tableGeo, tableMat);
            table.position.set(x, 0.5, z);
            table.castShadow = true;
            
            // 火锅 (红油汤底)
            const potGeo = new THREE.CylinderGeometry(1, 1, 0.5, 16);
            const potMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
            const pot = new THREE.Mesh(potGeo, potMat);
            pot.position.set(0, 0.6, 0);
            table.add(pot);

            this.hotpotObjects.add(table);
        }
    }

    buildPoolScene() {
        // 游泳池场景 (超大)
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 }); // 瓷砖
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        this.poolObjects.add(floor);

        // 水面
        const waterGeo = new THREE.PlaneGeometry(50, 50);
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x3498db, transparent: true, opacity: 0.8 });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.1;
        this.poolObjects.add(water);
    }

    buildWeaponStoreScene() {
        // 武器库
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 }); // 铁板
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        this.weaponObjects.add(floor);

        // 武器架子
        const rackGeo = new THREE.BoxGeometry(20, 4, 1);
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(0, 2, -10);
        this.weaponObjects.add(rack);
    }

    buildTrainingScene() {
        // 训练场
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6 }); // 泥土
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        this.trainingObjects.add(floor);

        // 沙包
        for(let i=0; i<8; i++) {
            const bagGeo = new THREE.CylinderGeometry(0.4, 0.4, 2, 16);
            const bagMat = new THREE.MeshStandardMaterial({ color: 0xc0392b });
            const bag = new THREE.Mesh(bagGeo, bagMat);
            bag.position.set(-10 + i*3, 1, -5);
            bag.castShadow = true;
            this.trainingObjects.add(bag);
        }
    }

    showClickMarker(pos) {
        if(this.clickMarker) this.scene.remove(this.clickMarker);
        const geo = new THREE.RingGeometry(0.3, 0.5, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
        this.clickMarker = new THREE.Mesh(geo, mat);
        this.clickMarker.rotation.x = -Math.PI / 2;
        this.clickMarker.position.copy(pos);
        this.clickMarker.position.y = 0.05;
        this.scene.add(this.clickMarker);
        
        // 简单动画效果
        setTimeout(() => { if(this.clickMarker) this.scene.remove(this.clickMarker); }, 500);
    }

    createEnvironmentDecorations() {
        // 在基地内和基地外生成一些白色的花朵和草丛
        const flowerGeo = new THREE.CylinderGeometry(0.1, 0, 0.4, 5); // 简单锥形花朵
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); // 白色花朵
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4); // 茎
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 }); // 绿色茎

        for (let i = 0; i < 300; i++) {
            const flowerGroup = new THREE.Group();
            
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.15;
            flowerGroup.add(stem);

            const flower = new THREE.Mesh(flowerGeo, flowerMat);
            flower.position.y = 0.4;
            // 花瓣稍微张开
            flower.rotation.x = Math.PI; 
            flowerGroup.add(flower);

            // 随机分布在 200x200 的地图上
            const rx = (Math.random() - 0.5) * 190;
            const rz = (Math.random() - 0.5) * 190;
            flowerGroup.position.set(rx, 0, rz);
            
            // 随机缩放和旋转
            const scale = 0.5 + Math.random() * 1.5;
            flowerGroup.scale.set(scale, scale, scale);
            flowerGroup.rotation.y = Math.random() * Math.PI * 2;

            // 根据位置决定属于哪个场景
            if (Math.abs(rx) < 100 && Math.abs(rz) < 100) {
                this.baseObjects.add(flowerGroup); // 基地内部的花朵
            } else {
                this.scene.add(flowerGroup); // 基地外面的花朵（永远可见）
            }
        }
    }

    createMinecar(color) {
        const group = new THREE.Group();

        // 矿车车厢
        const cartGeo = new THREE.BoxGeometry(1.6, 0.8, 2.4);
        const cartMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const cart = new THREE.Mesh(cartGeo, cartMat);
        cart.position.y = 0.6;
        cart.castShadow = true;
        group.add(cart);

        // 矿车轮子
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        const wheelPositions = [
            [-0.9, 0.3, 0.8], [0.9, 0.3, 0.8],
            [-0.9, 0.3, -0.8], [0.9, 0.3, -0.8]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            group.add(wheel);
        });

        // 驾驶员 (只显示上半身)
        const driverGeo = new THREE.BoxGeometry(0.6, 0.6, 0.4);
        const driverMat = new THREE.MeshStandardMaterial({ color: color });
        const driver = new THREE.Mesh(driverGeo, driverMat);
        driver.position.y = 1.2;
        driver.castShadow = true;
        group.add(driver);

        // 头
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.7;
        head.castShadow = true;
        group.add(head);

        return group;
    }

    createHumanoid(name, clothesColor, isZombie) {
        // 如果不是丧尸，则改为生成矿车
        if (!isZombie) {
            const minecarGroup = this.createMinecar(clothesColor);
            if (name !== '玩家') {
                const labelText = `${name}`;
                const label = this.makeTextSprite(labelText);
                label.position.y = 2.8;
                minecarGroup.add(label);
            }
            return minecarGroup;
        }

        const group = new THREE.Group();

        // 材质
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x7b9a6d }); // 丧尸肤色发绿
        const clothesMat = new THREE.MeshStandardMaterial({ color: clothesColor });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // 身体
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const body = new THREE.Mesh(bodyGeo, clothesMat);
        body.position.y = 1.0;
        body.castShadow = true;
        group.add(body);

        // 头
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        // 发型 (随机组合)
        const hairTypes = [
            new THREE.BoxGeometry(0.45, 0.2, 0.45), // 平头
            new THREE.SphereGeometry(0.25, 8, 8),   // 爆炸头
            new THREE.ConeGeometry(0.25, 0.4, 8),   // 尖刺头
            new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8) // 高圆头
        ];
        const hairGeo = hairTypes[Math.floor(Math.random() * hairTypes.length)];
        const hairColor = Math.random() * 0xffffff; // 随机发色
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.85;
        hair.castShadow = true;
        group.add(hair);

        // 胳膊 (丧尸特有前伸)
        const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const leftArm = new THREE.Mesh(armGeo, skinMat);
        leftArm.position.set(-0.4, 1.2, 0.3);
        leftArm.rotation.x = -Math.PI / 2;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, skinMat);
        rightArm.position.set(0.4, 1.2, 0.3);
        rightArm.rotation.x = -Math.PI / 2;
        rightArm.castShadow = true;
        group.add(rightArm);

        // 腿
        const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.15, 0.4, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.15, 0.4, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // 名字与积分浮空文字 (如果是玩家则不显示在头上)
        if (name !== '玩家') {
            const labelText = name; // 取消丧尸积分
            const label = this.makeTextSprite(labelText);
            label.position.y = 2.4;
            group.add(label);
        }

        return group;
    }

    makeTextSprite(message) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // 半透明背景
        context.fillStyle = 'rgba(0,0,0,0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制文字
        context.font = 'Bold 40px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(message, 256, 80);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(3, 0.75, 1);
        return sprite;
    }

    createCharacters() {
        // 玩家 (主视点人物) - 蓝色
        this.player = this.createHumanoid('玩家', 0x3498db, false);
        this.player.position.set(0, 0, 0);
        this.scene.add(this.player);

        // NPC: 大刘 (绿色)
        this.npcs.push(this.createNPC('大刘', 0x2ecc71, -3, -2));
        // NPC: 大王 (黄色)
        this.npcs.push(this.createNPC('大王', 0xf1c40f, 3, -2));
        // NPC: 指挥官 (紫色)
        this.npcs.push(this.createNPC('指挥官', 0x9b59b6, 0, -4));

        // 随机幸存者 (基地中游走，增加到50个，固定在基地内部活动)
        for (let i = 1; i <= 50; i++) {
            const randomColor = Math.random() * 0xffffff;
            // 限制在基地的 -90 到 90 范围内
            const rx = (Math.random() - 0.5) * 180;
            const rz = (Math.random() - 0.5) * 180;
            this.npcs.push(this.createNPC(`幸存者${i}号`, randomColor, rx, rz));
        }

        // 丧尸 (红色) - 听觉/嗅觉，没有视觉，生成在基地墙外
        for (let i = 0; i < 20; i++) {
            this.createZombie();
        }
    }

    createNPC(name, color, x, z) {
        const npc = this.createHumanoid(name, color, false);
        npc.position.set(x, 0, z);
        this.scene.add(npc);
        
        // 为 NPC 增加随机漫步目标点，并限制在基地内部 (-90 到 90)
        const targetX = THREE.MathUtils.clamp(x + (Math.random() - 0.5) * 20, -90, 90);
        const targetZ = THREE.MathUtils.clamp(z + (Math.random() - 0.5) * 20, -90, 90);
        const targetPosition = new THREE.Vector3(targetX, 0, targetZ);
        
        return { mesh: npc, name, targetPosition };
    }

    createZombie() {
        const zombie = this.createHumanoid('丧尸', 0xe74c3c, true);
        
        // 生成在基地墙外 (半径 > 110 的位置)
        const angle = Math.random() * Math.PI * 2;
        const radius = 110 + Math.random() * 40;
        zombie.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        
        this.scene.add(zombie);
        this.zombies.push(zombie);
    }

    updatePlayerMovement() {
        // 由于全都坐矿车，速度可以稍微快点
        const speed = this.equippedItem === 'hoverboard' ? 0.4 : 0.2;
        let moved = false;

        // 处理键盘移动（兼容WASD）
        if (this.keys['w']) { this.player.position.z -= speed; moved = true; this.targetPosition = null; }
        if (this.keys['s']) { this.player.position.z += speed; moved = true; this.targetPosition = null; }
        if (this.keys['a']) { this.player.position.x -= speed; moved = true; this.targetPosition = null; }
        if (this.keys['d']) { this.player.position.x += speed; moved = true; this.targetPosition = null; }

        // 处理鼠标点击移动
        if (this.targetPosition) {
            const dist = this.player.position.distanceTo(new THREE.Vector3(this.targetPosition.x, this.player.position.y, this.targetPosition.z));
            if (dist > speed) {
                const dir = new THREE.Vector3().subVectors(
                    new THREE.Vector3(this.targetPosition.x, this.player.position.y, this.targetPosition.z), 
                    this.player.position
                ).normalize();
                this.player.position.add(dir.multiplyScalar(speed));
                
                // 让玩家朝向目标点
                const lookAtPos = new THREE.Vector3(this.targetPosition.x, this.player.position.y, this.targetPosition.z);
                this.player.lookAt(lookAtPos);
                
                moved = true;
            } else {
                // 到达目标点
                this.targetPosition = null;
            }
        }

        // 悬浮滑板高度
        if (this.equippedItem === 'hoverboard') {
            this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, 2.0, 0.1);
        } else {
            this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, 0, 0.1);
        }

        // 相机跟随平滑处理
        const targetCamPos = new THREE.Vector3(this.player.position.x, this.player.position.y + 12, this.player.position.z + 15);
        this.camera.position.lerp(targetCamPos, 0.1);
        
        const targetLook = new THREE.Vector3().copy(this.player.position);
        targetLook.y += 1.5;
        this.camera.lookAt(targetLook);

        return moved;
    }

    updateNPCs() {
        // 只有在主基地、火锅城或训练场才显示 NPC
        const isDorm = this.area === '宿舍';
        this.npcs.forEach(npc => {
            npc.mesh.visible = !isDorm; // 宿舍时隐藏所有 NPC
            
            if (isDorm) return;

            const speed = 0.05;
            
            // 如果距离目标点很近，就随机一个新的目标点
            const currentPos = new THREE.Vector3(npc.mesh.position.x, 0, npc.mesh.position.z);
            const dist = currentPos.distanceTo(npc.targetPosition);
            
            if (dist < 0.5) {
                // 偶尔停顿一下
                if (Math.random() < 0.02) {
                    if (this.area === '训练场') {
                        // 在训练场，NPC会走向沙包
                        const bagX = -10 + Math.floor(Math.random()*8)*3;
                        npc.targetPosition = new THREE.Vector3(bagX, 0, -4);
                    } else if (this.area === '火锅城') {
                        // 在火锅城，NPC会走向桌子
                        const angle = (Math.floor(Math.random()*5)/5) * Math.PI * 2;
                        npc.targetPosition = new THREE.Vector3(Math.cos(angle)*8, 0, Math.sin(angle)*8);
                    } else {
                        // 主基地漫步
                        const newTargetX = THREE.MathUtils.clamp(npc.mesh.position.x + (Math.random() - 0.5) * 30, -90, 90);
                        const newTargetZ = THREE.MathUtils.clamp(npc.mesh.position.x + (Math.random() - 0.5) * 30, -90, 90);
                        npc.targetPosition = new THREE.Vector3(newTargetX, 0, newTargetZ);
                    }
                }
            } else {
                // 向目标点移动
                const dir = new THREE.Vector3().subVectors(npc.targetPosition, currentPos).normalize();
                npc.mesh.position.add(dir.multiplyScalar(speed));
                npc.mesh.lookAt(new THREE.Vector3(npc.targetPosition.x, npc.mesh.position.y, npc.targetPosition.z));
            }

            // 偶尔互相打架抢东西
            if (Math.random() < 0.001) {
                // 找到最近的另一个NPC
                let closest = null;
                let minDist = Infinity;
                this.npcs.forEach(other => {
                    if (other !== npc) {
                        const d = npc.mesh.position.distanceTo(other.mesh.position);
                        if (d < minDist) { minDist = d; closest = other; }
                    }
                });
                if (closest && minDist < 5) {
                    npc.targetPosition.copy(closest.mesh.position);
                    npc.mesh.position.y += 0.5; // 跳起来打架
                    setTimeout(() => { if(npc.mesh) npc.mesh.position.y -= 0.5; }, 200);
                }
            }
        });
    }

    updateZombies(playerMoved) {
        // 丧尸 AI：听得见、闻得见、看不见
        // 丧尸无法进入基地 (墙壁半径 100)
        this.zombies.forEach(zombie => {
            const distToPlayer = zombie.position.distanceTo(this.player.position);
            
            let targetPos = null;
            // 玩家如果在基地外，或者靠墙很近，丧尸才会追
            if ((playerMoved && distToPlayer < 30) || distToPlayer < 15) {
                targetPos = this.player.position.clone();
            }

            if (targetPos) {
                // 检查玩家是否在基地内
                const isPlayerInBase = Math.abs(this.player.position.x) < 100 && Math.abs(this.player.position.z) < 100;
                
                if (isPlayerInBase) {
                    // 如果玩家在基地内，丧尸只能在墙外徘徊 (朝玩家走，但被无形的墙壁挡住)
                    const dir = new THREE.Vector3().subVectors(targetPos, zombie.position).normalize();
                    const nextPos = zombie.position.clone().add(dir.multiplyScalar(0.04));
                    
                    // 检查下一步是否进入了基地 (-100 到 100)
                    if (Math.abs(nextPos.x) < 100 && Math.abs(nextPos.z) < 100) {
                        // 挡在墙外，平行移动
                        if (Math.abs(zombie.position.x) >= 100) nextPos.x = zombie.position.x;
                        if (Math.abs(zombie.position.z) >= 100) nextPos.z = zombie.position.z;
                    }
                    zombie.position.copy(nextPos);
                    zombie.lookAt(targetPos);
                } else {
                    // 玩家在基地外，正常追击
                    const dir = new THREE.Vector3().subVectors(targetPos, zombie.position).normalize();
                    zombie.position.add(dir.multiplyScalar(0.04));
                    zombie.lookAt(targetPos);
                }
            } else {
                // 没事干的时候，绕着基地外墙瞎晃悠
                if (Math.random() < 0.01) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 105 + Math.random() * 20;
                    zombie.lookAt(new THREE.Vector3(Math.cos(angle)*radius, 0, Math.sin(angle)*radius));
                }
                zombie.translateZ(0.02);
            }

            // 伤害判定 (防抖)
            const now = Date.now();
            if (distToPlayer < 2.0 && now - this.lastDamageTime > 1000) {
                // 根据防具减伤
                let damage = 10;
                if (this.equippedItem === 'shield') damage = 2;
                else if (this.equippedItem === 'armor') damage = 5;
                else if (this.equippedItem === 'hazmat') damage = 6;
                else if (this.equippedItem === 'gasmask') damage = 8;
                
                this.health -= damage;
                if (this.health < 0) this.health = 0;
                
                document.getElementById('health').innerText = this.health;
                this.lastDamageTime = now;
                
                this.showMessage(`被丧尸咬伤！失去 ${damage} 点生命值。`);
                
                // 屏幕闪红
                const oldColor = this.scene.background.getHex();
                this.scene.background.setHex(0xff0000);
                setTimeout(() => { this.scene.background.setHex(oldColor); }, 200);

                if (this.health <= 0) {
                    this.showMessage("你已经死亡... 重新复活中...");
                    setTimeout(() => {
                        this.health = 100;
                        document.getElementById('health').innerText = this.health;
                        this.teleport('宿舍');
                    }, 2000);
                }
            }
        });
    }

    handleWeaponHotkeys(key) {
        if (key === '1') {
            // 使用当前装备的物品 (主要是医疗品)
            this.useEquippedItem();
        }
    }

    useEquippedItem() {
        if (!this.equippedItem) {
            this.showMessage("当前没有装备任何可用物品！");
            return;
        }

        let healAmount = 0;
        if (this.equippedItem === 'bandage') {
            healAmount = 20;
            this.showMessage(`使用 炸带(包扎带)！恢复 ${healAmount} 点生命值。`);
        } else if (this.equippedItem === 'medkit') {
            healAmount = 50;
            this.showMessage(`使用 医疗包！恢复 ${healAmount} 点生命值。`);
        } else if (this.equippedItem === 'pills') {
            healAmount = 30;
            this.showMessage(`使用 抗生素！恢复 ${healAmount} 点生命值，防止感染。`);
        } else {
            this.showMessage(`当前物品 [${this.equippedItem}] 无法主动使用。`);
            return;
        }

        if (healAmount > 0) {
            this.health += healAmount;
            if (this.health > 100) this.health = 100;
            document.getElementById('health').innerText = this.health;
            
            // 简单的治疗特效
            const oldColor = this.scene.background.getHex();
            this.scene.background.setHex(0x00ff00);
            setTimeout(() => { this.scene.background.setHex(oldColor); }, 200);
        }
    }

    playUltimateEffect() {
        // 简单的视觉反馈：全屏闪烁
        const oldColor = this.scene.background.getHex();
        this.scene.background.setHex(0xffaa00);
        setTimeout(() => {
            this.scene.background.setHex(oldColor);
        }, 500);
        
        // 击退附近的丧尸
        this.zombies.forEach(zombie => {
            if (zombie.position.distanceTo(this.player.position) < 8) {
                const dir = new THREE.Vector3().subVectors(zombie.position, this.player.position).normalize();
                zombie.position.add(dir.multiplyScalar(5));
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const playerMoved = this.updatePlayerMovement();
        this.updateNPCs();
        this.updateZombies(playerMoved);

        this.renderer.render(this.scene, this.camera);
    }

    // --- UI 和 交互逻辑 ---

    teleport(areaName) {
        this.area = areaName;
        document.getElementById('current-area').innerText = areaName;
        this.showMessage(`进入了：${areaName}`);
        
        // 隐藏所有场景组
        this.scene.remove(this.baseObjects);
        this.scene.remove(this.dormObjects);
        this.scene.remove(this.hotpotObjects);
        this.scene.remove(this.poolObjects);
        this.scene.remove(this.weaponObjects);
        this.scene.remove(this.trainingObjects);

        // 隐藏特殊面板
        document.getElementById('dorm-panel').classList.add('hidden');

        // 场景切换逻辑
        if (areaName === '宿舍') {
            this.scene.background.setHex(0x34495e);
            this.scene.add(this.dormObjects);
            document.getElementById('dorm-panel').classList.remove('hidden');
        } else if (areaName === '火锅城') {
            this.scene.background.setHex(0x2c3e50);
            this.scene.add(this.hotpotObjects);
        } else if (areaName === '游泳池') {
            this.scene.background.setHex(0x1abc9c);
            this.scene.add(this.poolObjects);
        } else if (areaName === '武器库') {
            this.scene.background.setHex(0x2c3e50);
            this.scene.add(this.weaponObjects);
        } else if (areaName === '训练场') {
            this.scene.background.setHex(0x7f8c8d);
            this.scene.add(this.trainingObjects);
        } else {
            // 默认主基地
            this.scene.background.setHex(0x87ceeb);
            this.scene.add(this.baseObjects);
        }

        // 重置玩家位置和目标点
        this.player.position.set(0, 0, 0);
        this.targetPosition = null;
    }

    useItem(itemId) {
        this.equippedItem = itemId;
        
        // 隐藏特殊面板
        document.getElementById('minecar-panel').classList.add('hidden');

        switch(itemId) {
            case 'hoverboard':
                this.showMessage('装备：悬浮滑板，可在空中飘！');
                break;
            case 'motorcycle':
                this.showMessage('装备：三栖摩托车，水陆空通用！');
                break;
            case 'ice-sword':
                this.showMessage('装备：冰剑');
                break;
            case 'fire-sword':
                this.showMessage('装备：火剑');
                break;
            case 'normal-sword':
                this.showMessage('装备：普通剑');
                break;
            case 'drill':
                this.showMessage('装备：多功能钻头！');
                break;
            case 'shield':
                this.showMessage('装备：盾牌！防御力大幅提升！');
                break;
            case 'axe':
                this.showMessage('装备：消防斧');
                break;
            case 'pickaxe':
                this.showMessage('装备：消防镐');
                break;
            case 'armor':
                this.showMessage('穿戴：防弹衣');
                break;
            case 'hazmat':
                this.showMessage('穿戴：防护服');
                break;
            case 'gasmask':
                this.showMessage('穿戴：防毒面具');
                break;
            case 'bandage':
                this.showMessage('拿到 炸带(包扎带)，按 1 键使用。');
                break;
            case 'medkit':
                this.showMessage('拿到 医疗包，按 1 键使用。');
                break;
            case 'pills':
                this.showMessage('拿到 抗生素，按 1 键使用。');
                break;
            case 'minecar':
                this.showMessage('乘坐：冰火矿车！');
                document.getElementById('minecar-panel').classList.remove('hidden');
                break;
        }
    }

    transformPlayer(target) {
        // 模拟神龙魔方变形：改变玩家颜色
        this.player.children.forEach(child => {
            if (child.material && child.material.color) {
                child.material.color.setHex(Math.random() * 0xffffff);
            }
        });
        this.showMessage(`神龙魔方把你变成了：${target}！`);
    }

    useFacility(facility) {
        this.showMessage(`使用了 ${facility}！`);
        if (facility === '神龙大礼包制造机') {
            setTimeout(() => this.showMessage('小金龙：谢谢你的礼物！(小金龙很开心)'), 1500);
        }
    }

    minecarAction(action) {
        if (action === 'horn') {
            this.showMessage('滴滴滴！冰火矿车喇叭响了！丧尸退散！');
            // 驱赶丧尸
            this.zombies.forEach(zombie => {
                if (zombie.position.distanceTo(this.player.position) < 10) {
                    const dir = new THREE.Vector3().subVectors(zombie.position, this.player.position).normalize();
                    zombie.position.add(dir.multiplyScalar(3));
                }
            });
        } else if (action === 'build_road') {
            this.showMessage('冰火矿车自动为你开辟了一条新路！');
            // 在玩家前方生成一条路面
            const roadGeo = new THREE.PlaneGeometry(2, 10);
            const roadMat = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
            road.position.copy(this.player.position).add(dir.multiplyScalar(5));
            road.position.y = 0.05;
            
            this.scene.add(road);
        }
    }

    showMessage(text) {
        const toast = document.getElementById('message-toast');
        toast.innerText = text;
        toast.classList.remove('hidden');
        
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// 初始化游戏
window.onload = () => {
    window.game = new GameState();
    window.game.initThreeJS();
    window.game.showMessage('欢迎来到丧尸生存基地！你是基地的主力，大刘、大王、指挥官在等你。');
};
