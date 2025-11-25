// 🎨 РАБОЧИЙ СТОЛ — КАНВАС ФОН
const canvas = document.getElementById("desktopCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    let grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "#0055ff");
    grd.addColorStop(1, "#00d4ff");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
addEventListener("resize", resizeCanvas);


// 🗂 ВИРТУАЛЬНАЯ ФАЙЛОВАЯ СИСТЕМА
let files = [];
let recycle = [];
let currentEditingFile = null;


// 📁 Создание папки
function createFolder() {
    let name = "Папка " + (files.length + 1);
    files.push({ type: "folder", name });
    renderFiles();
}

// 📝 Создание файла
function createTextFile() {
    let name = "text_" + Date.now() + ".txt";
    files.push({ type: "text", name, content: "" });
    renderFiles();
}

// 🔄 Обновить список файлов
function renderFiles() {
    const list = document.getElementById("fileList");
    list.innerHTML = "";

    files.forEach((file, i) => {
        let el = document.createElement("div");
        el.textContent = (file.type === "folder" ? "📁 " : "📄 ") + file.name;

        el.onclick = () => openFile(i);

        el.oncontextmenu = (e) => {
            e.preventDefault();
            recycle.push(files[i]);
            files.splice(i, 1);
            renderFiles();
        };

        list.appendChild(el);
    });
}

// 📄 Открытие файлов
function openFile(index) {
    const file = files[index];
    if (file.type === "text") {
        currentEditingFile = index;
        document.getElementById("notepadText").value = file.content;
        openApp("notepad");
    }
}

// 💾 Сохранение TXT
function saveTextFile() {
    if (currentEditingFile === null) return;
    files[currentEditingFile].content =
        document.getElementById("notepadText").value;
    alert("Сохранено!");
}


// 🗑 Корзина
function openRecycleBin() {
    const list = document.getElementById("recycleList");
    list.innerHTML = "";

    recycle.forEach(f => {
        let el = document.createElement("div");
        el.textContent = (f.type === "folder" ? "📁 " : "📄 ") + f.name;
        list.appendChild(el);
    });

    openApp("recycleBin");
}


// 🪟 Оконная система
function openApp(id) {
    document.getElementById(id).style.display = "block";

    // отображать списки
    if (id === "explorer") renderFiles();
}

function closeApp(id) {
    document.getElementById(id).style.display = "none";
}


// 📌 Пуск
document.getElementById("startBtn").onclick = () => {
    let m = document.getElementById("startMenu");
    m.style.display = m.style.display === "block" ? "none" : "block";
};


// 🖱 Перемещение окон
let drag = null;

document.querySelectorAll(".titleBar").forEach(bar => {
    bar.onmousedown = (e) => {
        drag = {
            window: bar.parentElement,
            offsetX: e.clientX - bar.parentElement.offsetLeft,
            offsetY: e.clientY - bar.parentElement.offsetTop
        };
    };
});

document.onmousemove = (e) => {
    if (!drag) return;
    drag.window.style.left = e.clientX - drag.offsetX + "px";
    drag.window.style.top = e.clientY - drag.offsetY + "px";
};

document.onmouseup = () => drag = null;
