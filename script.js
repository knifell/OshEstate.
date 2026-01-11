/* ========================================================================
   ФИНАЛЬНЫЙ СКРИПТ: OSH ESTATE + FIREBASE (ESTATEOSH)
   ======================================================================== */

// --- 1. ИМПОРТ БИБЛИОТЕК FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    orderBy,
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 2. ТВОИ КЛЮЧИ (ESTATEOSH) ---
const firebaseConfig = {
    apiKey: "AIzaSyBWdTARaKOoJO9S5dhp5e2jZTVkmoFahUw",
    authDomain: "estateosh.firebaseapp.com",
    projectId: "estateosh",
    storageBucket: "estateosh.firebasestorage.app",
    messagingSenderId: "567119988498",
    appId: "1:567119988498:web:1ba784ff48d19f2c9395cb",
    measurementId: "G-3LFNLFZYD2"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 3. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
const OSH_CENTER = [40.5140, 72.8161]; 
const KG_BOUNDS = L.latLngBounds(L.latLng(39.0, 69.0), L.latLng(43.5, 80.5));
const ADMIN_AUTH_KEY = 'oshAdminLoggedIn'; 

let currentUser = null;
let ads = [];
let favorites = JSON.parse(localStorage.getItem('oshEstate_favs')) || [];
let currentLang = localStorage.getItem('oshEstate_lang') || 'ru';

// --- 4. ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // А) СЛУШАТЕЛЬ ВХОДА/ВЫХОДА
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNav(); // Обновить шапку
        
        // Защита страниц
        const page = document.body.dataset.page;
        if (page === 'profile' && !user) window.location.href = 'login.html';
        if (page === 'add' && !user) { alert('Сначала войдите!'); window.location.href = 'login.html'; }
        
        // Загрузка данных (только если мы не на странице входа)
        if (document.getElementById('listings-container') || page === 'profile' || page === 'admin') {
            loadAds(); 
        }
    });

    // Б) ЛОГИКА РЕГИСТРАЦИИ (КНОПКА КОДА)
    const btnGetCode = document.getElementById('btnGetCode');
    if (btnGetCode) {
        btnGetCode.addEventListener('click', () => {
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            if(!name || !email) return alert('Введите Имя и Email');
            
            alert('Ваш код: 1234');
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
        });
    }

    // В) ОТПРАВКА ФОРМЫ РЕГИСТРАЦИИ
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(document.getElementById('verifyCode').value !== '1234') return alert('Неверный код!');
            
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;
            const name = document.getElementById('regName').value;

            try {
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                await updateProfile(cred.user, { displayName: name });
                window.location.href = 'index.html';
            } catch (err) { alert("Ошибка: " + err.message); }
        });
    }

    // Г) ВХОД
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                window.location.href = 'index.html';
            } catch (err) { alert("Ошибка входа: " + err.message); }
        });
    }

    // Д) ДОБАВЛЕНИЕ ОБЪЯВЛЕНИЯ
    if (document.body.dataset.page === 'add') {
        initMap(); // Запуск карты
        document.getElementById('createAdForm').addEventListener('submit', handleAddAd);
    }

    // Е) ДЕТАЛИ ОБЪЯВЛЕНИЯ
    if (document.getElementById('detail-title')) {
        loadDetail();
    }

    // Ё) ЯЗЫК
    applyTranslations();
});

// --- 5. ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ ---

async function loadAds() {
    const grid = document.getElementById('listings-container');
    const adminList = document.getElementById('fullAdminList');
    
    // Если нам некуда выводить данные, не грузим их
    if (!grid && !adminList && document.body.dataset.page !== 'profile') return;

    try {
        const q = query(collection(db, "ads"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        ads = [];
        snap.forEach(doc => ads.push({ id: doc.id, ...doc.data() }));
        
        // Обновляем нужные блоки
        if (grid) renderGrid(ads);
        if (document.body.dataset.page === 'profile') renderMyAds();
        if (adminList) renderAdminList();
        
    } catch (e) { console.error("Ошибка загрузки:", e); }
}

// --- 6. ОТРИСОВКА (RENDER) ---

function updateNav() {
    const nav = document.getElementById('nav-links-container');
    if(!nav) return;
    
    let html = `
        <li><a href="index.html" data-lang="nav_home">Главная</a></li>
        <li><a href="buy.html" data-lang="nav_buy">Купить</a></li>
        <li><a href="rent.html" data-lang="nav_rent">Снять</a></li>
    `;
    
    if (currentUser) {
        html += `<li><a href="profile.html">👤 ${currentUser.displayName || 'User'}</a></li><li><a href="add.html" class="btn-login" data-lang="nav_add">+ Подать</a></li>`;
    } else {
        html += `<li><a href="login.html" data-lang="nav_login">Войти</a></li><li><a href="register.html" class="btn-login" data-lang="nav_reg">Регистрация</a></li>`;
    }
    
    html += `<li><button class="lang-switch" onclick="window.toggleLang()">RU/KG</button></li>`;
    nav.innerHTML = html;
    applyTranslations();
}

function renderGrid(data) {
    const grid = document.getElementById('listings-container');
    if(!grid) return;
    grid.innerHTML = '';

    // Фильтр страницы
    const pageType = document.body.dataset.page;
    if (pageType === 'sale' || pageType === 'rent') {
        data = data.filter(ad => ad.type === pageType && ad.status === 'active');
    } else if (pageType === 'favorites') {
        data = data.filter(ad => favorites.includes(ad.id));
    } else if (pageType === 'home') {
        data = data.filter(ad => ad.status === 'active').slice(0, 6); // Только 6 последних на главной
    }

    if (data.length === 0) { grid.innerHTML = '<div style="padding:40px; text-align:center;">Нет данных</div>'; return; }

    data.forEach(ad => {
        const isFav = favorites.includes(ad.id);
        const img = ad.images && ad.images.length ? ad.images[0] : 'https://via.placeholder.com/400';
        
        grid.innerHTML += `
            <div class="listing-card fade-in-up" onclick="location.href='details.html?id=${ad.id}'" style="cursor:pointer;">
                <div class="card-image">
                    <span class="badge ${ad.type}">${ad.type==='sale'?'Продажа':'Аренда'}</span>
                    <button class="card-fav-btn ${isFav?'active':''}" onclick="window.toggleFav('${ad.id}', this)"><i class="${isFav?'fas':'far'} fa-heart"></i></button>
                    <img src="${img}">
                </div>
                <div class="card-details">
                    <div class="price">${new Intl.NumberFormat('ru-RU').format(ad.price)} сом</div>
                    <h3 class="card-title">${getCatName(ad.category)}, ${ad.area} м²</h3>
                    <div class="card-address"><i class="fas fa-map-marker-alt"></i> ${ad.address}</div>
                </div>
            </div>
        `;
    });
}

// --- 7. КАРТА (ADD PAGE) ---
function initMap() {
    const map = L.map('map-picker', { maxBounds: KG_BOUNDS, minZoom: 7 }).setView(OSH_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    map.on('click', async (e) => {
        if (!KG_BOUNDS.contains(e.latlng)) return alert("Только Кыргызстан!");
        
        // Очистка старых маркеров
        map.eachLayer((layer) => { if(layer instanceof L.Marker) map.removeLayer(layer); });
        L.marker(e.latlng).addTo(map);
        
        document.getElementById('inputLat').value = e.latlng.lat;
        document.getElementById('inputLng').value = e.latlng.lng;
        
        // Геокодинг
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
            const d = await r.json();
            document.getElementById('inputAddress').value = d.display_name;
        } catch(err){}
    });
}

async function handleAddAd(e) {
    e.preventDefault();
    if(!document.getElementById('inputLat').value) return alert("Поставьте точку на карте!");
    
    const fileInput = document.getElementById('inputImageFile');
    const images = await Promise.all([...fileInput.files].map(f => new Promise(r => {
        const rd = new FileReader(); rd.onload=ev=>r(ev.target.result); rd.readAsDataURL(f);
    })));

    try {
        await addDoc(collection(db, "ads"), {
            status: 'pending',
            date: Date.now(),
            authorId: currentUser.uid,
            authorEmail: currentUser.email,
            type: document.querySelector('input[name="dealType"]:checked').value,
            category: document.getElementById('inputType').value,
            rooms: Number(document.getElementById('inputRooms').value),
            price: Number(document.getElementById('inputPrice').value),
            area: Number(document.getElementById('inputArea').value),
            address: document.getElementById('inputAddress').value,
            lat: document.getElementById('inputLat').value,
            lng: document.getElementById('inputLng').value,
            phone: document.getElementById('inputPhone').value,
            description: document.getElementById('inputDesc').value,
            images: images.length ? images : ['https://via.placeholder.com/400']
        });
        alert("Успешно отправлено на проверку!");
        window.location.href = 'index.html';
    } catch (err) { alert(err.message); }
}

// --- 8. ПРОФИЛЬ ---
function renderMyAds() {
    if(!currentUser) return;
    const list = document.getElementById('myAdsList');
    if(!list) return;
    
    // Показать шапку профиля
    const header = document.getElementById('profileHeader');
    if(header) {
        header.innerHTML = `
            <div class="profile-card">
                <div class="user-avatar">${currentUser.displayName ? currentUser.displayName[0] : 'U'}</div>
                <h2 class="user-name">${currentUser.displayName || 'User'}</h2>
                <p class="user-contact">${currentUser.email}</p>
                <button onclick="window.logout()" style="margin-top:10px; padding:5px 15px; border:1px solid #ccc; background:none; border-radius:5px;">Выйти</button>
            </div>
        `;
    }

    const myAds = ads.filter(ad => ad.authorId === currentUser.uid);
    list.innerHTML = '';
    
    if (myAds.length === 0) { list.innerHTML = '<div style="text-align:center;">Пусто</div>'; return; }

    myAds.forEach(ad => {
        list.innerHTML += `
            <div class="my-ad-card">
                <img src="${getMainImage(ad)}" class="my-ad-img">
                <div class="my-ad-content">
                    <div class="my-ad-price">${ad.price} сом</div>
                    <div class="my-ad-title">${ad.address}</div>
                    <small>Статус: ${ad.status === 'active' ? 'Активно' : 'На проверке'}</small>
                    <div class="ad-footer">
                        <button class="btn-mini-action btn-del" onclick="window.deleteAd('${ad.id}')"><i class="far fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- 9. ДЕТАЛИ ---
async function loadDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;
    try {
        const snap = await getDoc(doc(db, "ads", id));
        if(snap.exists()) {
            const ad = snap.data();
            document.getElementById('detail-title').innerText = `${getCatName(ad.category)}, ${ad.area} м²`;
            document.getElementById('detail-address').innerText = ad.address;
            document.getElementById('detail-price').innerText = `${ad.price} сом`;
            document.getElementById('detail-desc').innerText = ad.description;
            
            // Карта
            if(ad.lat) {
                const map = L.map('map-view').setView([ad.lat, ad.lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([ad.lat, ad.lng]).addTo(map);
            }
            
            // Слайдер (простой)
            const mainImg = document.getElementById('sliderMainImg');
            if(ad.images && ad.images.length) mainImg.src = ad.images[0];
            
            // Контакты
            if(currentUser) {
                document.getElementById('contact-placeholder').style.display = 'none';
                document.getElementById('contact-real').style.display = 'block';
                document.getElementById('detail-phone').innerText = ad.phone;
            }
        }
    } catch(e){ console.log(e); }
}

// --- 10. АДМИНКА ---
function renderAdminList() {
    const list = document.getElementById('fullAdminList');
    if(!list) return;
    list.innerHTML = '';
    
    ads.forEach(ad => {
        const isPending = ad.status === 'pending';
        list.innerHTML += `
            <div class="admin-card" style="padding:15px; background:white; margin-bottom:10px; border-left: 5px solid ${isPending?'orange':'green'}; display:flex; justify-content:space-between;">
                <div>
                    <b>${ad.price} сом</b><br>
                    ${ad.address}<br>
                    <small>${ad.authorEmail}</small>
                </div>
                <div>
                    ${isPending ? `<button onclick="window.approveAd('${ad.id}')">✅</button>` : ''}
                    <button onclick="window.deleteAd('${ad.id}')">🗑</button>
                </div>
            </div>
        `;
    });
}

// --- 11. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Экспорт в window) ---
window.toggleLang = () => {
    const next = currentLang === 'ru' ? 'kg' : 'ru';
    localStorage.setItem('oshEstate_lang', next);
    location.reload();
};

window.toggleFav = (id, btn) => {
    if(event) event.stopPropagation();
    if(!currentUser) return window.location.href = 'login.html';
    const idx = favorites.indexOf(id);
    if(idx === -1) favorites.push(id); else favorites.splice(idx, 1);
    localStorage.setItem('oshEstate_favs', JSON.stringify(favorites));
    if(btn) btn.classList.toggle('active');
};

window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

window.approveAd = async (id) => {
    await updateDoc(doc(db, "ads", id), { status: 'active' });
    loadAds();
};

window.deleteAd = async (id) => {
    if(confirm('Удалить?')) {
        await deleteDoc(doc(db, "ads", id));
        loadAds();
    }
};

// Переводы
function applyTranslations() {
    const texts = {
        ru: { nav_home: "Главная", nav_buy: "Купить", nav_rent: "Снять", nav_login: "Войти", nav_reg: "Регистрация", nav_add: "+ Подать" },
        kg: { nav_home: "Башкы бет", nav_buy: "Сатып алуу", nav_rent: "Ижара", nav_login: "Кирүү", nav_reg: "Катталуу", nav_add: "+ Жарыялоо" }
    };
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if(texts[currentLang][key]) el.innerText = texts[currentLang][key];
    });
}
function getCatName(cat) { 
    const map = {flat: 'Квартира', house: 'Дом', land: 'Участок', commerce: 'Коммерция'};
    return map[cat] || cat; 
}
function getMainImage(ad) { return (ad.images && ad.images[0]) ? ad.images[0] : 'https://via.placeholder.com/400'; }
