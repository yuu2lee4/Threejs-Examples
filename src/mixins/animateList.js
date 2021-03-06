const { TWEEN } = window;
const easing = TWEEN.Easing.Sinusoidal;
// 动画队列
let truck = null;
const { PI, sin, cos } = Math;
let rad = PI / 2; // 通用弧度变量（用于计算车辆过弯）
let stepIndex = 0; // 当前动画步骤
let count = 0;
const runSpeed = 0.5; // 直路行进速度
const reversSpeed = 0.05; // 倒车速度
const cornerSpeed = 0.01; // 转弯速度
let co = { // 摄影机偏移量
    x: 0,
    y: 15,
    z: 10,
};
let flag = false;
export default {
    methods: {
        initAnimate() {
            truck = this.truckGroup;
            truck.add(this.headGroup);
            truck.rotation.y = - PI / 2;
            truck.position.x = -75;
            this.backGroup.position.x = -85;
            this.backGroup.rotation.y = - PI / 2;
            this.backRotateGroup = this.backGroup.children[0];
            this.backRotateTween = this.backRotate();
            this.mainGroup.add(this.backGroup);

            this.camera.position.set(-80, 15, 10);
            this.camera.lookAt(this.v3(-80, 0, 0));

            const truckCombine = this.truckCombine();
            this.firstAnimate = truckCombine.begin;

            const outStation = this.outStation();
            truckCombine.end.chain(outStation.begin);

            const inLoad = this.inLoad();
            outStation.end.chain(inLoad.begin);

            const reversInLoad = this.reversInLoad();
            inLoad.end.chain(reversInLoad.begin);

            const loading = this.loading();
            reversInLoad.end.chain(loading.begin);

            const outLoad = this.outLoad();
            loading.end.chain(outLoad.begin);

            const inCurve = this.inCurve();
            outLoad.end.chain(inCurve.begin);

            const reversInUnload = this.reversInUnload();
            inCurve.end.chain(reversInUnload.begin);

            const unloading = this.unloading();
            reversInUnload.end.chain(unloading.begin);

            const outUnload = this.outUnload();
            unloading.end.chain(outUnload.begin);

            const inStation = this.inStation();
            outUnload.end.chain(inStation.begin);

            const resetStart = this.resetStart();
            inStation.end.chain(resetStart.begin);
            resetStart.end.chain(truckCombine.begin);

            // 当标签页切换时，暂停当前动画
            document.addEventListener('visibilitychange', () => {
                const { visibilityState } = document;
                if (!this.currentAnimate) {
                    return;
                }
                if (visibilityState === 'hidden') {
                    this.currentAnimate.stop();
                } else if (visibilityState === 'visible') {
                    this.currentAnimate.start();
                }
            });
        },
        animateStart() {
            this.firstAnimate.start();
        },
        truckCombine() { // 组装车辆
            const _this = this;
            const obj = {x: -75};
            const tween = new TWEEN.Tween(obj)
                .to({x: -85}, 6000)
                .onStart(function() {
                    _this.currentAnimate = tween;
                    _this.signal1.position.set(0, -0.7, -5.2);
                    _this.signal2.position.set(-1, -0.9, -4.8);
                    _this.signal3.position.set(1, -0.9, -4.8);
                    _this.signal1.tween.start();
                    _this.signal2.tween.start();
                    _this.signal3.tween.start();
                })
                .onUpdate(function(o) { // 倒车接挂
                    truck.position.x = o.x;
                    let progress =  Math.abs(truck.position.x + 75) / 10 * 100;
                    _this.$store.commit('setTitle', {
                        title: '接挂',
                        type: 'connect',
                        progress,
                    });
                })
                .onComplete(function() {
                    obj.x = -75;
                    _this.mainGroup.remove(_this.backGroup);
                    _this.backGroup.position.x = 0;
                    truck.add(_this.backGroup);
                    _this.backGroup.rotation.y = 0;
                    _this.signal1.tween.stop();
                    _this.signal2.tween.stop();
                    _this.signal3.tween.stop();
                })
                .delay(3000);
            const tweenEnd = new TWEEN.Tween()
                .to({}, 5000)
                .onStart(function() {
                    _this.currentAnimate = tweenEnd;
                    _this.signal2.position.set(0, -1.6, 3);
                    _this.signal2.tween.start();
                    _this.$store.commit('setTitle', {
                        title: '',
                    });
                    _this.$store.commit('setActCardList', ['unlock']);
                })
                .onComplete(function() {
                    _this.signal2.tween.stop();
                    _this.$store.commit('setTitle', {
                        title: '任务开始',
                    });
                    _this.$store.commit('setActCardList', []);
                });
            tween.chain(tweenEnd);
            return {
                begin: tween,
                end: tweenEnd,
            };
        },
        outStation() { // 出站
            const _this = this;
            // 倒车
            const objIn = {x: -85};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({x: -80}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                })
                .onUpdate(function(o) {
                    truck.position.x = o.x;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objIn.x = -85;
                });
            // 镜头动画
            const objc = {y: 15};
            const ct = new TWEEN.Tween(objc)
                .to({y: 30}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct;
                })
                .onUpdate(function(o) {
                    co.y = o.y;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objc.y = 15;
                });
            ct.chain(tweenIn);
            // 转向
            const objMid = {rad: PI / 2};
            const tweenMid = new TWEEN.Tween(objMid)
                .to({rad: 0}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenMid;
                    _this.backRotateTween.rightIn.start();
                })
                .onUpdate(function(o) {
                    _this.drift(10, o.rad, -80, 10, true);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    _this.$store.commit('setTitle', {});
                    objMid.rad = PI / 2;
                });
            tweenIn.chain(tweenMid);
            // 直行
            const objOut = {z: 10};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({z: 42}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                })
                .onUpdate(function(o) {
                    truck.position.z = o.z;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.z = 10;
                });
            tweenMid.chain(tweenOut);
            return {
                begin: ct,
                end: tweenOut,
            };
        },
        inLoad() { // 进入装货点
            const _this = this;
            // 转向
            const objIn = {rad: PI};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({rad: PI / 2 * 3}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                    _this.$store.commit('setTitle', {
                        title: '车辆通过1号门进入园区',
                    });
                    _this.backRotateTween.leftIn.start();
                    _this.guideGroup.tweenIn.start();
                })
                .onUpdate(function(o) {
                    _this.drift(15, o.rad, -55, 42);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objIn.rad = PI;
                    _this.$store.commit('setTitle', {
                        title: '',
                    });
                });
            // 直行
            const objOut = {x: -55};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({x: 11}, 6000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                    _this.$store.commit('setActCardList', ['guide']);
                })
                .onUpdate(function(o) {
                    truck.position.x = o.x;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.x = -55;
                    _this.$store.commit('setActCardList', []);
                    _this.guideGroup.tweenOut.start();
                })
                .easing(easing.Out);
            tweenIn.chain(tweenOut);
            return {
                begin: tweenIn,
                end: tweenOut,
            };
        },
        reversInLoad() { // 倒车进入装货阶段
            const _this = this;
            const objIn = {rad: PI / 2};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({rad: PI}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                    _this.signal2.position.set(0, 0.9, 0);
                    _this.signal2.tween.start();
                    _this.backRotateTween.revers.start();
                })
                .onUpdate(function(o) {
                    _this.drift(11, o.rad, 11, 68, true);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objIn.rad = PI / 2;
                });
            const objOut = {z: 68};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({z: 77.4}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                })
                .onUpdate(function(o) {
                    truck.position.z = o.z;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.z = 68;
                });
            tweenIn.chain(tweenOut);
            return {
                begin: tweenIn,
                end: tweenOut,
            };
        },
        loading() { // 装货
            const _this = this;
            const tweenLoc = new TWEEN.Tween({})
                .to({}, 500)
                .onStart(function() {
                    _this.currentAnimate = tweenLoc;
                    // _this.$store.commit('setActCardList', ['location']);
                });
            const tweenPlat = new TWEEN.Tween({})
                .to({}, 4000)
                .onStart(function() {
                    _this.currentAnimate = tweenPlat;
                    _this.loadMatchSpace.tween.start();
                    _this.$store.commit('setTitle', { title: '园区停靠' });
                    _this.$store.commit('setActCardList', ['stop']);
                });
            tweenLoc.chain(tweenPlat);
            const tweenStop = new TWEEN.Tween({})
                .to({}, 1000)
                .onStart(function() {
                    _this.currentAnimate = tweenStop;
                    _this.signal2.tween.stop();
                    _this.loadMatchSpace.tween.stop();
                });
            tweenPlat.chain(tweenStop);
            let co1 = {x: 0, y: 30, z: 87.4};
            const ct1 = new TWEEN.Tween(co1)
                .to({x: 4, y: 5, z: 100}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct1;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                })
                .onComplete(function() {
                    co1.x = 0;
                    co1.y = 30;
                    co1.z = 87.4;
                });
            tweenStop.chain(ct1);
            let co2 = {x: 4, y: 5, z: 100};
            const ct2 = new TWEEN.Tween(co2)
                .to({x: 4, y: 8, z: 82.4}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct2;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                })
                .onComplete(function() {
                    co2.x = 4;
                    co2.y = 5;
                    co2.z = 100;
                })
                .delay(1000);
            ct1.chain(ct2);
            let lo = {index: 0};
            const tweenLoad = new TWEEN.Tween(lo)
                .to({index: 15}, 13000)
                .onStart(function() {
                    _this.currentAnimate = tweenLoad;
                    _this.$store.commit('setTitle', { title: '装货' });
                    _this.$store.commit('setActCardList', ['load', 'loadtime']);
                    const goods = _this.goodsList;
                    goods.forEach((good) => {
                        good.inTween.start();
                    });
                })
                .onUpdate(function(o) {
                    if (o.index >= 10) {
                        _this.$store.commit('showPic', 3);
                    } else if (o.index >= 5) {
                        _this.$store.commit('showPic', 2);
                    } else if (o.index >= 1) {
                        _this.$store.commit('showPic', 1);
                    }
                })
                .onComplete(function() {
                    lo.index = 0;
                    _this.$store.commit('showPic', 0);
                });
            ct2.chain(tweenLoad);
            return {
                begin: tweenLoc,
                end: tweenLoad,
            };
        },
        outLoad() { // 离开园区
            const _this = this;
            const objIn = {z: 77.4};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({z: 68}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                    _this.$store.commit('setTitle', {});
                    _this.$store.commit('setActCardList', []);
                })
                .onUpdate(function(o) {
                    truck.position.z = o.z;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objIn.z = 77.4;
                });
            let co1 = {x: 4, y: 8, z: 82.4};
            const ct = new TWEEN.Tween(co1)
                .to({x: 0, y: 30, z: 87.4}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                })
                .onComplete(function() {
                    co1.x = 4;
                    co1.y = 8;
                    co1.z = 82.4;
                });
            ct.chain(tweenIn);
            const objMid = {rad: PI};
            const tweenMid = new TWEEN.Tween(objMid)
                .to({rad: PI / 2}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenMid;
                    _this.backRotateTween.rightIn.start();
                })
                .onUpdate(function(o) {
                    _this.drift(11, o.rad, 11, 68, true);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objMid.rad = PI;
                });
            tweenIn.chain(tweenMid);
            const titleTween = new TWEEN.Tween()
                .to({}, 1500)
                .onStart(function() {
                    _this.$store.commit('setTitle', {
                        title: '车辆通过3号门离开园区',
                    });
                })
                .onComplete(function() {
                    _this.$store.commit('setTitle', {
                        title: '',
                    });
                })
                .delay(2000);
            const objOut = {x: 11};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({x: 80}, 4000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                    titleTween.start();
                })
                .onUpdate(function(o) {
                    truck.position.x = o.x;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.x = 11;
                });
            tweenMid.chain(tweenOut);
            return {
                begin: ct,
                end: tweenOut,
            };
        },
        inCurve() { // 进入弯道
            const _this = this;
            const et1 = new TWEEN.Tween({})
                .to({}, 100)
                .onStart(function() {
                    _this.signal2.tween.start();
                });
            const et2 = new TWEEN.Tween({})
                .to({}, 6000)
                .onStart(function() {
                    _this.signal2.position.set(1, 0, 0);
                    _this.$store.commit('setActCardList', ['weight']);
                });
            const et3 = new TWEEN.Tween({})
                .to({}, 6000)
                .onStart(function() {
                    _this.signal2.position.set(1, -1.85, 3);
                    _this.$store.commit('setActCardList', ['wheel']);
                });
            const et4 = new TWEEN.Tween({})
                .to({}, 6000)
                .onStart(function() {
                    _this.signal2.position.set(1, -1.85, 3);
                    _this.$store.commit('setActCardList', ['wheelalert']);
                });
            const ro = {r: 0};
            const rollUp = new TWEEN.Tween(ro)
                .to({r: -PI / 18}, 500)
                .onStart(function() {
                    _this.signal2.position.set(1, -1.4, 1);
                    _this.$store.commit('setActCardList', ['rollalert']);
                })
                .onUpdate(function(o) {
                    truck.rotation.z = o.r;
                })
                .easing(easing.Out);
            const rollDown = new TWEEN.Tween(ro)
                .to({r: 0}, 1000)
                .onUpdate(function(o) {
                    truck.rotation.z = o.r;
                })
                .onComplete(function() {
                    _this.signal2.tween.stop();
                    const timer = window.setTimeout(() => {
                        window.clearTimeout(timer);
                        _this.$store.commit('setActCardList', []);
                    }, 2000);
                })
                .easing(easing.In);
            et1.chain(et2);
            et2.chain(et3);
            et3.chain(et4);
            et4.chain(rollUp);
            rollUp.chain(rollDown);
            const objIn = {rad: - PI / 2};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({rad: PI / 2}, 30000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                    et1.start();
                })
                .onUpdate(function(o) {
                    _this.drift(57, o.rad, 80, 0);
                    const cx = 64 * cos(o.rad - 0.1) + 80;
                    const cy = 4;
                    const cz = - 64 * sin(o.rad - 0.1);
                    _this.moveCamera(cx, cy, cz);
                })
                .onComplete(function() {
                    objIn.rad = - PI / 2;
                    co.x = 0;
                    co.y = 30;
                    co.z = 10;
                });
            const objOut = {x: 80};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({x: -11}, 6000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                })
                .onUpdate(function(o) {
                    truck.position.x = o.x;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.x = 80;
                })
                .easing(easing.Out);
            tweenIn.chain(tweenOut);
            return {
                begin: tweenIn,
                end: tweenOut,
            };
        },
        reversInUnload() { // 倒车进入卸货园区
            const _this = this;
            const objIn = {rad: - PI / 2}
            const tweenIn = new TWEEN.Tween(objIn)
                .to({rad: 0}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                    _this.signal2.position.set(0, 0.9, 0);
                    _this.signal2.tween.start();
                    _this.backRotateTween.revers.start();
                })
                .onUpdate(function(o) {
                    _this.drift(11, o.rad, -11, -68, true);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objIn.rad = - PI / 2;
                });
            const objOut = {z: -68};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({z: -77.4}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                })
                .onUpdate(function(o) {
                    truck.position.z = o.z;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.z = -68;
                });
            tweenIn.chain(tweenOut);
            return {
                begin: tweenIn,
                end: tweenOut,
            };
        },
        unloading() { // 卸货
            const _this = this;
            const tweenLoc = new TWEEN.Tween({})
                .to({}, 500)
                .onStart(function() {
                    _this.currentAnimate = tweenLoc;
                });
            const tweenPlat = new TWEEN.Tween({})
                .to({}, 4000)
                .onStart(function() {
                    _this.currentAnimate = tweenPlat;
                    _this.unloadMatchSpace.tween.start();
                    _this.$store.commit('setTitle', { title: '园区停靠' });
                    _this.$store.commit('setActCardList', ['unloadstop']);
                });
            tweenLoc.chain(tweenPlat);
            const tweenStop = new TWEEN.Tween({})
                .to({}, 1000)
                .onStart(function() {
                    _this.currentAnimate = tweenStop;
                    _this.signal2.tween.stop();
                    _this.unloadMatchSpace.tween.stop();
                });
            tweenPlat.chain(tweenStop);
            let co1 = {x: 0, y: 30, z: -87.4};
            const ct1 = new TWEEN.Tween(co1)
                .to({x: -4, y: 5, z: -100}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct1;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                })
                .onComplete(function() {
                    co1.x = 0;
                    co1.y = 30;
                    co1.z = -87.4;
                });
            tweenStop.chain(ct1);
            let co2 = {x: -4, y: 5, z: -100};
            const ct2 = new TWEEN.Tween(co2)
                .to({x: -4, y: 8, z: -82.4}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct2;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                })
                .onComplete(function() {
                    co2.x = -4;
                    co2.y = 5;
                    co2.z = -100;
                })
                .delay(1000);
            ct1.chain(ct2);
            let lo = {index: 0};
            const tweenLoad = new TWEEN.Tween(lo)
                .to({index: 15}, 13000)
                .onStart(function() {
                    _this.currentAnimate = tweenLoad;
                    _this.$store.commit('setTitle', { title: '卸货' });
                    _this.$store.commit('setActCardList', ['unload', 'unloadtime']);
                    const goods = _this.goodsList;
                    for (let i = goods.length - 1; i > -1; i--) {
                        goods[i].outTween.start();
                    }
                })
                .onUpdate(function(o) {
                    if (o.index >= 12) {
                        _this.$store.commit('showPic', 0);
                    } else if (o.index >= 9) {
                        _this.$store.commit('showPic', 6);
                    } else if (o.index >= 5) {
                        _this.$store.commit('showPic', 5);
                    } else if (o.index >= 1) {
                        _this.$store.commit('showPic', 4);
                    }
                })
                .onComplete(function() {
                    lo.index = 0;
                    _this.$store.commit('showPic', 0);
                });
            ct2.chain(tweenLoad);
            return {
                begin: tweenLoc,
                end: tweenLoad,
            };
        },
        outUnload() { // 离开卸货点
            const _this = this;
            const objIn = {z: -77.4};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({z: -68}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                    co.x = 0;
                    co.y = 30;
                    co.z = 10;
                    _this.$store.commit('setTitle', {});
                    _this.$store.commit('setActCardList', []);
                    _this.truckGroup.remove(_this.backGroup);
                    _this.mainGroup.add(_this.backGroup);
                    _this.backGroup.position.set(0, 2.3, -77.4);
                })
                .onUpdate(function(o) {
                    truck.position.z = o.z;
                    let progress =  Math.abs(truck.position.z + 68) / 9.4 * 100;
                    _this.$store.commit('setTitle', {
                        title: '摘挂',
                        type: 'connect',
                        progress,
                    });
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objIn.z = -77.4;
                });
            const tweenD = new TWEEN.Tween()
                .to({}, 5000)
                .onStart(function() {
                    _this.currentAnimate = tweenD;
                    _this.signal2.position.set(0, -1.6, 3);
                    _this.signal2.tween.start();
                    _this.$store.commit('setTitle', {
                        title: '',
                    });
                    _this.$store.commit('setActCardList', ['lock']);
                })
                .onComplete(function() {
                    _this.signal2.tween.stop();
                    _this.$store.commit('setTitle', {
                        title: '任务完成',
                    });
                    _this.$store.commit('setActCardList', []);
                });
            tweenIn.chain(tweenD);
            let co1 = {x: -4, y: 8, z: -82.4};
            const ct = new TWEEN.Tween(co1)
                .to({x: 0, y: 30, z: -87.4}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                })
                .onComplete(function() {
                    co1.x = -4;
                    co1.y = 8;
                    co1.z = -82.4;
                });
            ct.chain(tweenIn);
            const objMid = {rad: 0};
            const tweenMid = new TWEEN.Tween(objMid)
                .to({rad: - PI / 2}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenMid;
                })
                .onUpdate(function(o) {
                    _this.drift(11, o.rad, -11, -68, true);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objMid.rad = 0;
                });
            tweenD.chain(tweenMid);
            const objOut = {x: -11};
            const tweenOut = new TWEEN.Tween(objOut)
                .to({x: -50}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                })
                .onUpdate(function(o) {
                    truck.position.x = o.x;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.x = -11;
                });
            tweenMid.chain(tweenOut);
            return {
                begin: ct,
                end: tweenOut,
            };
        },
        inStation() { // 回到起点
            const _this = this;
            const objIn = {rad: PI / 2};
            const tweenIn = new TWEEN.Tween(objIn)
                .to({rad: PI}, 2000)
                .onStart(function() {
                    _this.currentAnimate = tweenIn;
                })
                .onUpdate(function(o) {
                    _this.drift(15, o.rad, -50, -42);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    _this.$store.commit('setTitle', {});
                    objIn.rad = PI / 2;
                });
            const objOut = {z: -27}
            const tweenOut = new TWEEN.Tween(objOut)
                .to({z: 10}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tweenOut;
                    _this.backGroup.position.set(-85, 2.3, 0);
                    _this.backGroup.rotation.y = - PI / 2;
                })
                .onUpdate(function(o) {
                    truck.position.z = o.z;
                    _this.moveCamera();
                })
                .onComplete(function() {
                    objOut.z = -27;
                    _this.$store.commit('nextRound');
                });
            tweenIn.chain(tweenOut);
            return {
                begin: tweenIn,
                end: tweenOut,
            };
        },
        resetStart() { // 复位
            const _this = this;
            const obj = {rad: 0};
            const tween = new TWEEN.Tween(obj)
                .to({rad: PI / 2}, 3000)
                .onStart(function() {
                    _this.currentAnimate = tween;
                    window.$$vue.round++;
                })
                .onUpdate(function(o) {
                    _this.drift(10, o.rad, -75, 10, true);
                    _this.moveCamera();
                })
                .onComplete(function() {
                    obj.rad = 0;
                });
            let oc = {x: -75, y: 30, z: 10};
            const ct = new TWEEN.Tween(oc)
                .to({x: -80, y: 15, z: 10}, 1000)
                .onStart(function() {
                    _this.currentAnimate = ct;
                })
                .onUpdate(function(o) {
                    _this.moveCamera(o.x, o.y, o.z);
                    _this.camera.lookAt(_this.v3(-80, 0, 0));
                });
            tween.chain(ct);
            return {
                begin: tween,
                end: ct,
            };
        },
        drift(r, rad, offsetX, offsetZ, clockwise = false) {
            const x = r * cos(rad) + offsetX;
            const z = - (r * sin(rad)) + offsetZ;
            truck.position.x = x;
            truck.position.z = z;
            truck.rotation.y = clockwise ? rad - PI : rad;
        },
        backRotate() {
            const _this = this;
            const br = {r: 0};
            const duration = 1000;
            function onUpdate(o) {
                _this.backRotateGroup.rotation.y = o.r;
            }
            const rightIn = new TWEEN.Tween(br)
                .to({r: 0.2}, duration)
                .onUpdate(onUpdate);
            const rightOut = new TWEEN.Tween(br)
                .to({r: 0}, duration * 1)
                .onUpdate(onUpdate);
            rightIn.chain(rightOut);
            const leftIn = new TWEEN.Tween(br)
                .to({r: -0.2}, duration)
                .onUpdate(onUpdate);
            const leftOut = new TWEEN.Tween(br)
                .to({r: 0}, duration * 1)
                .onUpdate(onUpdate);
            leftIn.chain(leftOut);
            const revers = new TWEEN.Tween(br)
                .to({r: 0.2}, duration)
                .onUpdate(onUpdate);
            const reversOut = new TWEEN.Tween(br)
                .to({r: 0}, duration)
                .onUpdate(onUpdate);
            revers.chain(reversOut);
            return {
                leftIn,
                rightIn,
                revers,
            };
        },
        moveCamera(cameraX, cameraY, camerZ) { // 若传入绝对摄影机坐标，则不使用偏移量
            const { x, y, z } = truck.position;
            this.camera.position.set(cameraX || x + co.x, cameraY || y + co.y, camerZ || z + co.z);
            this.camera.lookAt(truck.position);
        },
    },
};