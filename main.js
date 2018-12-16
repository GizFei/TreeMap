window.onload = function () {
    document.getElementById("interactiveTip").style.display = "block";
    document.getElementsByClassName("fade")[0].classList += " show";
    document.getElementById("dismissBtn").onclick = function () {
        document.getElementById("interactiveTip").style.display = "none";
        document.getElementsByClassName("fade")[0].classList -= " show";
    }
    document.getElementsByTagName("pre")[0].innerHTML = JSON.stringify(srcData, null, 4);
    document.getElementById("shortEg").innerHTML = JSON.stringify(exampleData, null, 4);
    document.getElementsByTagName("pre")[0].oninput = function () {
        usedColor = 0;
        canvas.areas = [];
        canvas.clear();
        document.getElementById("legendContainer").innerHTML = "";
        try {
            let data = JSON.parse(this.innerText);
            rootRect = treemap(data, canvas.width, canvas.height, 0, 0, null, null, colors[usedColor++], null);
            rootRect.drawAreas(canvas);
            rootRect.areasAsRoot = rootRect.areas;
            rootRect.drawLabels();
        } catch (e) {
            console.log(e);
        }
    }
    rootRect = treemap(srcData, canvas.width, canvas.height, 0, 0, null, null, colors[usedColor++], null);
    rootRect.drawAreas(canvas);
    rootRect.areasAsRoot = rootRect.areas;
    rootRect.drawLabels();

    canvas.bindCanvasMouseMoveEvent(tip);
    canvas.bindCanvasMouseLeaveEvent(tip);
    canvas.bindCanvasMouseUpEvent();
}

var canvas = new Canvas("treemap");
var tip = document.getElementById("tip");

var copy = function () {
    let ed = JSON.stringify(exampleData, null, 4);
    let clipboard = document.createElement("textarea");
    clipboard.value = ed;
    clipboard.setAttribute("readonly", "");
    clipboard.style.position = "absolute";
    clipboard.style.left = "-9999px";
    document.body.appendChild(clipboard);
    clipboard.select();
    document.execCommand("copy");
    document.body.removeChild(clipboard);
}

var rootRect = null;
var usedColor = 0;
var treemap = function (data, w, h, ox, oy, label, value, bgColor, parentRect) {
    sortData(data); // 对源数据从大到小排序

    let BigRect = new Rectangle(w, h, data, label, value, bgColor, parentRect);
    BigRect.originPoint = BigRect.moveTo = [ox, oy];
    BigRect.squarify(BigRect.fitData, [], BigRect.getLayoutWidth());

    return BigRect;
}

// 矩形对象
function Rectangle(width, height, data, label, value, bgColor, parentRect) {
    this.w = width; // 长方形宽
    this.h = height; // 长方形高
    this.label = label; // 标签
    this.value = value; // 值（真实的）
    this.originPoint = []; // 原点
    this.data = []; // 数据
    this.fitData = []; // 根据面积调整过后的数据
    this.bgColor = bgColor ? bgColor : "rgba(200, 0, 0, 0.4)"; // 背景颜色（定值，专属）
    this.currentBgColor = this.bgColor; // 当前绘制（临时值）
    this.areas = []; // 绘制区域（子矩形）
    this.parentRect = parentRect; // 父矩形

    // 以下为递归的临时量
    this.moveTo = [0, 0]; // 下一组矩形绘制的“原点”
    this.newArea = 0; // 完成布置的矩形面积（临时量）
    this.lastSide = Math.min(this.w, this.h); // 上一条没着摆放的边（初始是短边）——临时量
    this.longSide = Math.max(this.w, this.h); // “长边”摆放边的邻边——临时量

    if (this.w > this.h) {
        this.direct = [1, 0]; // 行方向：[1,0]是x方向，[0,1]是y方向
    } else {
        this.direct = [0, 1];
    }
    if (data)
        this.setData(data);
}
Rectangle.prototype.layoutRow = function (row) {
    // 将布置完成的行放入矩形中，并添加绘制区域
    this.newArea = sumArr(row);
    // 存储绘制区域
    //        let paths = [];
    this.reverseDirect();
    if (this.direct[1] == 1) {
        // 沿y轴放置，w固定，h变化，x坐标不变，y坐标递增
        let w = this.newArea / this.lastSide;
        let y = this.moveTo[1];
        for (let i = 0; i < row.length; i++) {
            let h = row[i] / w;
            let x = this.moveTo[0];
            let data = this.data[this.areas.length];
            if (data.data) {
                this.areas.push(treemap(data.data, w, h, x, y, data.label, data.value, colors[usedColor++], this));
            } else {
                let rect = new Rectangle(w, h, null, data.label, data.value, this.bgColor, this);
                rect.moveTo = rect.originPoint = [x, y];
                this.areas.push(rect);
            }
            y += h; // 沿y轴前进
        }
        this.moveTo = [this.moveTo[0] + w, this.moveTo[1]];
    } else {
        // 沿x轴放置，h固定，w变化，y坐标不变，x坐标递增
        let h = this.newArea / this.lastSide;
        let x = this.moveTo[0];
        for (let i = 0; i < row.length; i++) {
            let w = row[i] / h;
            let y = this.moveTo[1];
            let data = this.data[this.areas.length];
            if (data.data) {
                this.areas.push(treemap(data.data, w, h, x, y, data.label, data.value, colors[usedColor++], this));
            } else {
                let rect = new Rectangle(w, h, null, data.label, data.value, this.bgColor, this);
                rect.moveTo = rect.originPoint = [x, y];
                this.areas.push(rect);
            }
            //            this.areas.push(area);
            x += w; // 沿x軕前进w
        }
        this.moveTo = [this.moveTo[0], this.moveTo[1] + h];
    }
};
Rectangle.prototype.getLayoutWidth = function () {
    // width() 获得用来布置的子矩形的短边
    if (this.newArea == 0) {
        // 初始状态
        return this.lastSide;
    }
    let result = this.longSide - this.newArea / this.lastSide;
    this.longSide = this.lastSide;
    this.lastSide = result;
    return result;
};
Rectangle.prototype.reverseDirect = function () {
    this.direct.reverse();
};
// 方形树图核心函数
Rectangle.prototype.squarify = function (children, row, w) {
    if (children.length == 0) {
        this.layoutRow(row);
        return; // 填充完成，结束递归
    }
    let c = children[0]; // 取首元素
    let old_worst = this.worst(row, w);
    let new_worst = this.worst(row.concat(c), w);
    //    console.log(old_worst, new_worst);
    if (row.length == 0 || old_worst >= new_worst) {
        // 添加使得纵横比减小，向现有行添加c
        this.squarify(children.slice(1, children.length), row.concat(c), w);
    } else {
        // 添加使得纵横比增大，当前行结束填充，添加新行
        this.layoutRow(row);
        this.squarify(children, [], this.getLayoutWidth());
    }
};
/**
 * 计算最大纵横比
 * row: 包含长方形面积的列表
 * w: 摆放长方形的边的长
 */
Rectangle.prototype.worst = function (row, w) {
    let [...r] = row; // 拷贝，不对原数组排序
    if (r.length == 0) { // 为空
        return NaN;
    } else {
        r.sort(); // 从小到大排序
        let max = r[r.length - 1]; // 最大值
        let min = r[0]; // 最小值
        let s = sumArr(r); // 求和
        // max(w^2 * r+ / (s^2), s^2 / (w^2 *r-))  取两者较大为纵横比
        // r+ = max, r- = min
        return Math.max((w * w * max) / (s * s), (s * s) / (w * w * min));
    }
}
// 根据面积调整原始数据
Rectangle.prototype.setData = function (data) {
    this.data = data;
    let piece = this.w * this.h / sumLs(this.data); // 一份面积
    let c = [];
    this.data.forEach(function (d, idx) {
        c.push(d.value * piece);
    });
    this.fitData = c; // 提取value，构成列表
};
// 绘制子矩形区域
Rectangle.prototype.drawAreas = function (canvas, color) {
    if (this.areas.length == 0) {
        // 原子矩形
        canvas.areas.push(this);
        this.currentBgColor = color ? color : this.bgColor;
        this.draw(canvas, this.currentBgColor);
    } else {
        for (let i = 0; i < this.areas.length; i++) {
            let area = this.areas[i];
            area.drawAreas(canvas, color ? color : area.bgColor);
        }
    }
};
Rectangle.prototype.drawLabels = function () {
    document.getElementById("legendContainer").innerHTML = "";
    let allAtoms = true;
    for (let i = 0; i < this.areas.length; i++) {
        if (this.areas[i].data.length != 0) {
            allAtoms = false;
            break;
        }
    }
    if (allAtoms && this.areas.length != 0) {
        let legend = document.createElement("label");
        legend.classList = "legend mx-1";
        legend.innerHTML = this.label + "\n" + this.value;
        legend.style.backgroundColor = this.bgColor;
        document.getElementById("legendContainer").appendChild(legend);
        return;
    }
    let hasAtom = false;
    for (let i = 0; i < this.areasAsRoot.length; i++) {
        let area = this.areasAsRoot[i];
        if (area.data.length == 0 && this.label) {
            hasAtom = true;
        } else {
            let legend = document.createElement("label");
            legend.classList = "legend mx-1";
            legend.innerHTML = area.label + "\n" + area.value;
            legend.style.backgroundColor = area.bgColor;
            document.getElementById("legendContainer").appendChild(legend);
        }
    }
    if (hasAtom) {
        let legend = document.createElement("label");
        legend.classList = "legend mx-1";
        legend.innerHTML = this.label + "&nbsp;" + this.value;
        legend.style.backgroundColor = this.bgColor;
        document.getElementById("legendContainer").appendChild(legend);
    }
    //    if(this.areas.length == 0){
    //        
    //    }
}
Rectangle.prototype.drawAreasAsRoot = function (canvas, color) {
    for (let i = 0; i < this.areasAsRoot.length; i++) {
        let area = this.areasAsRoot[i];
        if (area.data.length == 0) {
            // 原子矩形
            canvas.areas.push(area);
            area.currentBgColor = color ? color : area.bgColor;
            area.draw(canvas);
        } else
            area.drawAreas(canvas, color ? color : area.bgColor);
    }
};
Rectangle.prototype.transformToRoot = function (canvas) {
    // 转变为为根时的布局动画
    let that = this;
    if (!this.areasAsRoot) {
        // 还没有为根时的布局模样
        if (this.data.length == 0) {
            // 原子矩形
            this.areasAsRoot = treemap([{
                label: this.label,
                value: this.value
            }], canvas.width, canvas.height, 0, 0, this.label, this.value, this.bgColor, null).areas;
        } else {
            this.areasAsRoot = treemap(this.data, canvas.width, canvas.height, 0, 0, this.label, this.value, this.bgColor, null).areas;
            this.areasAsRoot.forEach((asr, i) => {
                this.areas[i].bgColor = asr.bgColor;
                this.areas[i].bgColor = asr.currentBgColor;
            });
        }
    }
    console.log("has areas root");
    if (this.data.length == 0) {
        let dr = new DrawRect(canvas, this.originPoint[0], this.originPoint[1], this.w, this.h, this.areasAsRoot[0].originPoint[0], this.areasAsRoot[0].originPoint[1], this.areasAsRoot[0].w, this.areasAsRoot[0].h, this.bgColor, this.value);

        let alpha = 1;
        let newInterval = setInterval(function () {
            canvas.clearAll();
            alpha -= 0.04;
            canvas.context.globalAlpha = alpha;
            that.parentRect.drawAreasAsRoot(canvas);
            canvas.context.globalAlpha = 1;
            that.drawAreas(canvas);
            canvas.areas = [];
            if (alpha < 0) {
                clearInterval(newInterval);
                let end = false;
                let interval = setInterval(function () {
                    end = true;
                    canvas.clearAll();
                    dr.draw();
                    if (!dr.end)
                        end = false;
                    if (end) {
                        // 动画结束
                        clearInterval(interval);
                        canvas.clearAll();
                        that.drawAreasAsRoot(canvas);
                        that.drawLabels();
                    }
                }, 16);
            }
        }, 32);
    } else {
        let drs = [];
        this.areas.forEach((area, idx) => {
            let a = this.areasAsRoot[idx];
            let dr = new DrawRect(canvas, area.originPoint[0], area.originPoint[1], area.w, area.h, a.originPoint[0], a.originPoint[1], a.w, a.h, area.bgColor, area.value);
            drs.push(dr);
        });

        let alpha = 1;
        let newInterval = setInterval(function () {
            canvas.clearAll();
            alpha -= 0.04;
            canvas.context.globalAlpha = alpha;
            that.parentRect.drawAreasAsRoot(canvas);
            canvas.context.globalAlpha = 1;
            that.drawAreas(canvas);
            canvas.areas = [];
            if (alpha < 0) {
                clearInterval(newInterval);

                let end = false;
                let interval = setInterval(function () {
                    end = true;
                    canvas.clearAll();
                    drs.forEach(function (dr, i) {
                        if (!dr.end)
                            end = false;
                        dr.draw();
                    });
                    if (end) {
                        // 动画结束
                        clearInterval(interval);
                        canvas.clearAll();
                        that.drawAreasAsRoot(canvas);
                        that.drawLabels();
                    }
                }, 16);
            }
        }, 32);
        //    console.log(this.areasAsRoot);
    }
};
Rectangle.prototype.transformFromRoot = function (canvas) {
    // 返回原布局动画
    let that = this;

    if (this.areas.length != 0) {
        let drs = [];
        this.areas.forEach((area, idx) => {
            let a = this.areasAsRoot[idx];
            let dr = new DrawRect(canvas, a.originPoint[0], a.originPoint[1], a.w, a.h, area.originPoint[0], area.originPoint[1], area.w, area.h, area.bgColor, area.value);
            drs.push(dr);
        });
        //    console.log(drs);
        let end = false;
        let interval = setInterval(function () {
            end = true;
            canvas.clearAll();
            drs.forEach(function (dr, i) {
                if (!dr.end)
                    end = false;
                dr.draw();
            });
            if (end) {
                // 动画结束
                clearInterval(interval);
                that.drawAreas(canvas);
                setTimeout(function () {
                    let alpha = 0;
                    let newInterval = setInterval(function () {
                        canvas.clearAll();
                        alpha += 0.04;
                        canvas.context.globalAlpha = alpha;
                        that.parentRect.drawAreasAsRoot(canvas);
                        canvas.context.globalAlpha = 1;
                        that.drawAreas(canvas);
                        canvas.areas = [];
                        if (alpha > 1.01) {
                            clearInterval(newInterval);
                            if (!that.parentRect.parentRect)
                                that.parentRect.drawAreasAsRoot(canvas);
                        }
                    }, 32);
                    that.parentRect.drawLabels();
                }, 100);
            }
        }, 16);
    } else {
        let dr = new DrawRect(canvas, this.areasAsRoot[0].originPoint[0], this.areasAsRoot[0].originPoint[1], this.areasAsRoot[0].w, this.areasAsRoot[0].h, this.originPoint[0], this.originPoint[1], this.w, this.h, this.bgColor, this.value);
        let end = false;
        let interval = setInterval(function () {
            end = true;
            canvas.clearAll();
            dr.draw();
            if (!dr.end)
                end = false;
            if (end) {
                // 动画结束
                clearInterval(interval);
                setTimeout(function () {
                    let alpha = 0;
                    let newInterval = setInterval(function () {
                        canvas.clearAll();
                        alpha += 0.04;
                        canvas.context.globalAlpha = alpha;
                        that.parentRect.drawAreasAsRoot(canvas);
                        canvas.context.globalAlpha = 1;
                        that.drawAreas(canvas);
                        canvas.areas = [];
                        if (alpha > 1.01)
                            clearInterval(newInterval);
                    }, 32);
                    that.parentRect.drawLabels();
                }, 100);
            }
        }, 16);
    }
};
Rectangle.prototype.draw = function (canvas) {
    //    console.log(canvas);
    let context = canvas.context;
    context.clearRect(this.originPoint[0], this.originPoint[1], this.w, this.h);

    context.fillStyle = this.currentBgColor;
    context.fillRect(this.originPoint[0], this.originPoint[1], this.w, this.h);
    context.strokeStyle = canvas.strokeColor;
    context.strokeRect(this.originPoint[0], this.originPoint[1], this.w, this.h);
    context.fillStyle = canvas.textColor;
    context.fillText(this.value, this.originPoint[0] + 2, this.originPoint[1] + 12);
};
Rectangle.prototype.inRegion = function (context, mouseX, mouseY) {
    context.beginPath(); // 开始绘制
    context.rect(this.originPoint[0], this.originPoint[1], this.w, this.h);
    let result = context.isPointInPath(mouseX, mouseY);
    context.closePath();
    return result;
};
Rectangle.prototype.scrim = function (canvas) {
    let context = canvas.context;
    context.clearRect(this.originPoint[0], this.originPoint[1], this.w, this.h);

    context.fillStyle = this.currentBgColor;
    context.fillRect(this.originPoint[0], this.originPoint[1], this.w, this.h);
    context.fillStyle = "rgba(0,0,0,0.2)"; // 遮罩
    context.fillRect(this.originPoint[0], this.originPoint[1], this.w, this.h);
    context.strokeStyle = canvas.strokeColor;
    context.strokeRect(this.originPoint[0], this.originPoint[1], this.w, this.h);
    context.fillStyle = canvas.textColor;
    context.fillText(this.value, this.originPoint[0] + 2, this.originPoint[1] + 12);
};

/*-----------画布构造函数-----------*/
function Canvas(id) {
    this.id = id;
    this.canvas = document.getElementById(id); // 获得画布元素
    this.context = this.canvas.getContext("2d"); // 获得画布上下文
    this.width = this.canvas.width; // 宽
    this.height = this.canvas.height; // 高
    this.textColor = "#FFF"; // 文本颜色
    this.strokeColor = "#FFF"; // 边框颜色
    this.font = "12px Consolas"; // 字体
    this.bgColor = "rgba(200,0,200,0.4)"; // 背景颜色
    this.areas = []; // 子区域

    this.context.font = this.font;
    // 阻止右键菜单弹出
    this.canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
};
Canvas.prototype.clear = function () {
    // 只清除画布
    this.context.clearRect(0, 0, this.width, this.height);
};
Canvas.prototype.clearAll = function () {
    // 清除画布和区域
    this.context.clearRect(0, 0, this.width, this.height);
    this.areas = [];
}
// 绑定画布鼠标移动事件
Canvas.prototype.bindCanvasMouseMoveEvent = function (tipDiv) {
    this.canvas.addEventListener("mousemove", (e) => {
        this.areas.forEach(function (area, idx) {
            if (area.inRegion(canvas.context, e.offsetX, e.offsetY)) {
                tipDiv.style.display = "block";
                tipDiv.getElementsByTagName("strong")[0].innerHTML = area.label;
                tipDiv.getElementsByTagName("span")[0].innerHTML = area.value;
                tipDiv.style.left = e.pageX + 10 + "px";
                tipDiv.style.top = e.pageY + 10 + "px";
                area.draw(this.canvas);
            } else {
                area.scrim(this.canvas);
            }
        });
    });
};
// 绑定画布鼠标离开事件
Canvas.prototype.bindCanvasMouseLeaveEvent = function (tipDiv) {
    this.canvas.addEventListener("mouseleave", () => {
        this.areas.forEach(function (area, idx) {
            area.draw(this.canvas);
        });
        tipDiv.style.display = "none";
    });
};
// 绑定画布鼠标点击事件
Canvas.prototype.bindCanvasMouseUpEvent = function () {
    this.canvas.addEventListener("mouseup", (e) => {
        if (e.button == 0) {
            // 左键
            if (this.areas.length == 1) {
                return;
            }
            for (let i = 0; i < rootRect.areasAsRoot.length; i++) {
                let area = rootRect.areasAsRoot[i];
                if (area.inRegion(canvas.context, e.offsetX, e.offsetY)) {
                    area.transformToRoot(canvas);
                    area.areasAsRoot.forEach((a, i) => {
                        a.parentRect = area;
                    });
                    rootRect = area;
                    break;
                }
            }
        }
        if (e.button == 2) {
            // 鼠标右键
            if (!rootRect.parentRect)
                return;
            rootRect.transformFromRoot(canvas);
            rootRect = rootRect.parentRect;
        }
    });
};
/*--------------------------------------*/

// 颜色列表
var colors = ["#f44336", "#009688", "#9c27b0", "#ff5722", "#ffeb3b", "#3f51b5", "#607d8b", "#ffc107", "#4caf50", "#673ab7", "#8bc34a", "#e91e63", "#03a9f4", "#00bcd4", "#cddc39", "#ff9800", "#795548", "#9e9e9e", "#20c997", "#17a2b8"];

/*---------------列表工具函数---------------*/
// 计算列表和
var sumArr = function (arr) {
    return arr.reduce(function (prev, cur) {
        return prev + cur;
    }, 0);
}
// 对数据从大到小排序
// [{}, {}, {}]
var sortData = function (data) {
    data.sort(function (a, b) {
        return parseInt(a.value) - parseInt(b.value);
    }).reverse();
}
// 计算广义数据表的和
// [{}, {}, {}]
var sumLs = function (Ls) {
    let sum = 0;
    Ls.forEach(function (item, idx) {
        if (item.data) {
            // 还有数据
            sum += sumLs(item.data);
        } else {
            sum += parseInt(item.value);
        }
    });
    return sum;
}
/*--------------------------------------------*/

// 动画绘制矩形
function DrawRect(canvas, sx, sy, sw, sh, ex, ey, ew, eh, bgColor, value) {
    // sx,sy,sw,sh：起始状态
    // ex,ey,ew,eh：终止状态
    this.bgColor = bgColor;
    this.sx = sx;
    this.sy = sy;
    this.sw = sw;
    this.sh = sh;
    this.ex = ex;
    this.ey = ey;
    this.ew = ew;
    this.eh = eh;
    this.time = 0;
    this.end = false;
    this.value = value;
    this.draw = function () {
        let context = canvas.context;
        if (!this.end) {
            let x = this.sx * (1 - this.time) + this.ex * this.time;
            let y = this.sy * (1 - this.time) + this.ey * this.time;
            let w = this.sw * (1 - this.time) + this.ew * this.time;
            let h = this.sh * (1 - this.time) + this.eh * this.time;
            context.fillStyle = this.bgColor;
            context.fillRect(x, y, w, h);
            context.fillStyle = canvas.textColor;
            context.fillText(value, x + 2, y + 12);
            this.time += 0.04;
            if (this.time > 1.01) {
                this.end = true;
            }
        }
    };
}
