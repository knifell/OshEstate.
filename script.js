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

// --- 3. ГЛОБАЛЬНЫЕ НАСТРОЙКИ ---
const pageType = document.body.dataset.page; 
const LANG_KEY = 'oshEstate_lang';
const FAV_KEY = 'oshEstate_favs'; 
const ADMIN_AUTH_KEY = 'oshAdminLoggedIn';

const OSH_CENTER = [40.5140, 72.8161]; 
const KG_BOUNDS = L.latLngBounds(L.latLng(39.0, 69.0), L.latLng(43.5, 80.5));

// Переменные состояния
let ads = []; 
let currentUser = null; 
let favorites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
let currentLang = localStorage.getItem(LANG_KEY) || 'ru';

// --- 4. ПЕРЕВОДЫ ---
const translations = {
    ru: {
        nav_home: "Главная", nav_buy: "Купить", nav_rent: "Снять", nav_login: "Войти", nav_reg: "Регистрация", nav_add: "+ Подать", nav_profile: "Профиль",
        hero_title: "Добро пожаловать в OshEstate", hero_subtitle: "Единый портал недвижимости города Ош",
        card_buy_title: "Купить", card_buy_desc: "Квартиры, дома, участки", card_rent_title: "Снять", card_rent_desc: "Аренда на длительный срок",
        btn_go: "Перейти →", footer_text: "Ваш надежный партнер.",
        cat_flat: "Квартира", cat_house: "Дом", cat_land: "Участок", cat_commerce: "Коммерция", type_sale: "Продажа", type_rent: "Аренда",
        lbl_deal_type: "Тип сделки", lbl_cat: "Категория", lbl_rooms: "Комнат", lbl_price: "Цена", lbl_area: "Площадь", lbl_address: "Адрес", lbl_desc: "Описание",
        btn_publish: "Опубликовать", addr_placeholder: "Начните вводить адрес...", map_hint: "Или поставьте точку на карте (KG)",
        loading: "Загрузка...", error_bounds: "Только территория Кыргызстана!", error_net: "Ошибка сети",
        saved: "Успешно сохранено!", sent: "Отправлено на проверку!",
        som: "сом", month: "мес", profile_fav: "Избранное", admin_pending: "Ожидает", admin_active: "Активно",
        auth_err: "Ошибка авторизации", reg_ok: "Вы успешно зарегистрированы!", logout: "Выйти", delete: "Удалить"
    },
    kg: {
        nav_home: "Башкы бет", nav_buy: "Сатып алуу", nav_rent: "Ижара", nav_login: "Кирүү", nav_reg: "Катталуу", nav_add: "+ Жарыялоо", nav_profile: "Профиль",
        hero_title: "OshEstate порталына кош келиңиз", hero_subtitle: "Ош шаарынын кыймылсыз мүлк порталы",
        card_buy_title: "Сатып алуу", card_buy_desc: "Батирлер, үйлөр, жер участкалары", card_rent_title: "Ижара", card_rent_desc: "Узак мөөнөткө ижара",
        btn_go: "Өтүү →", footer_text: "Сиздин ишенимдүү өнөктөш.",
        cat_flat: "Батир", cat_house: "Үй", cat_land: "Жер участкасы", cat_commerce: "Коммерция", type_sale: "Сатуу", type_rent: "Ижара",
        lbl_deal_type: "Түрү", lbl_cat: "Категория", lbl_rooms: "Бөлмө", lbl_price: "Баасы", lbl_area: "Аянты", lbl_address: "Дареги", lbl_desc: "Сүрөттөмө",
        btn_publish: "Жарыялоо", addr_placeholder: "Даректи жазыңыз...", map_hint: "Же картадан белгилеңиз (KG)",
        loading: "Жүктөлүүдө...", error_bounds: "Кыргызстан гана!", error_net: "Интернет катасы",
        saved: "Сакталды!", sent: "Жарыяланды!",
        som: "сом", month: "ай", profile_fav: "Тандалмалар", admin_pending: "Күтүүдө", admin_active: "Активдүү",
        auth_err: "Кирүү катасы", reg_ok: "Ийгиликтүү катталдыңыз!", logout: "Чыгуу", delete: "Өчүрүү"
    }
};

// --- 5. ОСНОВНОЙ ЗАПУСК ---
document.addEventListener('DOMContentLoaded', async () => {

    // СЛУШАТЕЛЬ АВТОРИЗАЦИИ
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNav(); 
        
        // Редиректы защиты
        if (pageType === 'profile' && !user) window.location.href = 'login.html';
        if (pageType === 'add' && !user) {
            alert(t('nav_login'));
            window.location.href = 'login.html';
        }
        
        // Грузим объявления, если мы не на странице входа/регистрации
        if (document.getElementById('listings-container') || pageType === 'profile' || pageType === 'admin') {
            fetchAds();
        }
    });

    // ЛОГИКА РЕГИСТРАЦИИ (КНОПКА КОДА)
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

    // ОТПРАВКА ФОРМЫ РЕГИСТРАЦИИ
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
                alert("Успешно! Переходим на главную...");
                window.location.replace('index.html');
            } catch (err) { alert("Ошибка: " + err.message); }
        });
    }

    // ВХОД
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

    // СТРАНИЦА ПОДАЧИ (ADD)
    if (pageType === 'add') {
        initMapPicker();
        document.getElementById('createAdForm').addEventListener('submit', handleAddAd);
    }

    // СТРАНИЦА ДЕТАЛЕЙ
    if (document.getElementById('detail-title')) {
        loadDetail();
    }

    // СТРАНИЦА АДМИНКИ
    if (document.getElementById('fullAdminList')) {
        // Логика кнопки выхода из админки (если она есть на странице)
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem(ADMIN_AUTH_KEY); 
                window.location.href = 'login.html'; 
            });
        }
    }

    // ПРИМЕНЕНИЕ ЯЗЫКА
    applyTranslations();
});

// --- 6. ФУНКЦИИ БАЗЫ ДАННЫХ ---

async function fetchAds() {
    const grid = document.getElementById('listings-container');
    const adminList = document.getElementById('fullAdminList');
    
    // Показываем прелоадер там, где это нужно
    if(grid) grid.innerHTML = `<div style="text-align:center; padding:40px;">${t('loading')}</div>`;
    if(adminList) adminList.innerHTML = `<div style="text-align:center; padding:40px;">Загрузка...</div>`;

    try {
        const q = query(collection(db, "ads"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        ads = [];
        querySnapshot.forEach((doc) => {
            ads.push({ id: doc.id, ...doc.data() });
        });
        
        // Рендерим в зависимости от страницы
        if (grid) renderGrid(ads); 
        if (pageType === 'profile') renderMyAds();
        if (adminList) renderAdminList();
    } catch (error) {
        console.error("Ошибка загрузки:", error);
    }
}

// --- 7. РЕНДЕРИНГ ИНТЕРФЕЙСА ---

function updateNav() {
    const nav = document.getElementById('nav-links-container');
    if (!nav) return;
    
    let html = `
        <li><a href="index.html" data-lang="nav_home">Главная</a></li>
        <li><a href="buy.html" data-lang="nav_buy">Купить</a></li>
        <li><a href="rent.html" data-lang="nav_rent">Снять</a></li>
    `;
    
    if (currentUser) {
        const name = currentUser.displayName || "User";
        html += `<li><a href="profile.html">👤 ${name}</a></li><li><a href="add.html" class="btn-login" data-lang="nav_add">+ Подать</a></li>`;
    } else {
        html += `<li><a href="login.html" data-lang="nav_login">Войти</a></li><li><a href="register.html" class="btn-login" data-lang="nav_reg">Регистрация</a></li>`;
    }
    
    html += `<li><button id="langToggleBtn" class="lang-switch" onclick="window.toggleLang()">RU/KG</button></li>`;
    nav.innerHTML = html;
    applyTranslations();
}

function renderGrid(data) {
    const grid = document.getElementById('listings-container');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Фильтры страницы
    if (pageType === 'sale' || pageType === 'rent') {
        data = data.filter(ad => ad.type === pageType && ad.status === 'active');
    } else if (pageType === 'favorites') {
        data = data.filter(ad => favorites.includes(ad.id));
    } else if (pageType === 'home') {
        data = data.filter(ad => ad.status === 'active').slice(0, 6);
    }

    if (document.getElementById('count-badge')) document.getElementById('count-badge').innerText = data.length;
    if (data.length === 0) { grid.innerHTML = `<div style="padding:50px; grid-column:1/-1; text-align:center;">Нет данных</div>`; return; }

    data.forEach(ad => {
        const isFav = favorites.includes(ad.id);
        const img = ad.images && ad.images.length ? ad.images[0] : 'https://via.placeholder.com/400';
        
        grid.innerHTML += `
            <div class="listing-card fade-in-up" onclick="location.href='details.html?id=${ad.id}'" style="cursor:pointer;">
                <div class="card-image">
                    <span class="badge ${ad.type}">${t('type_'+ad.type)}</span>
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFav('${ad.id}', this)"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                    <img src="${img}">
                </div>
                <div class="card-details">
                    <div class="price">${new Intl.NumberFormat('ru-RU').format(ad.price)} ${t('som')}</div>
                    <h3 class="card-title">${getCatName(ad.category)}, ${ad.area} м²</h3>
                    <div class="card-address"><i class="fas fa-map-marker-alt"></i> ${ad.address}</div>
                </div>
            </div>
        `;
    });
}

// --- 8. ЛОГИКА ADD (ПОДАЧА) ---

function initMapPicker() {
    const mapPicker = L.map('map-picker', { maxBounds: KG_BOUNDS, minZoom: 7 }).setView(OSH_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapPicker);

    let currentMarker = null;
    const addrInput = document.getElementById('inputAddress');
    
    mapPicker.on('click', async function(e) {
        if (!KG_BOUNDS.contains(e.latlng)) return alert(t('error_bounds'));
        if (currentMarker) mapPicker.removeLayer(currentMarker);
        currentMarker = L.marker(e.latlng).addTo(mapPicker);
        
        document.getElementById('inputLat').value = e.latlng.lat;
        document.getElementById('inputLng').value = e.latlng.lng;
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=${currentLang}`);
            const data = await response.json();
            addrInput.value = data.address ? formatAddress(data.address) : t('map_point');
        } catch (err) { addrInput.value = t('error_net'); }
    });
}

async function handleAddAd(e) {
    e.preventDefault();
    if (!document.getElementById('inputLat').value) return alert(t('map_hint'));

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Загрузка...";
    btn.disabled = true;

    const fileInput = document.getElementById('inputImageFile');
    
    // СЖАТИЕ ФОТО
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (ev) => {
                const img = new Image();
                img.src = ev.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxWidth = 800; 
                    const scaleSize = maxWidth / img.width;
                    canvas.width = maxWidth;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); 
                }
            }
        });
    };

    try {
        const images = await Promise.all([...fileInput.files].map(f => compressImage(f)));
        
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
        alert(t('sent'));
        window.location.href = 'index.html';
    } catch (err) { 
        console.error(err); 
        alert("Ошибка загрузки!");
        btn.innerText = "Опубликовать";
        btn.disabled = false;
    }
}

// --- 9. ПРОФИЛЬ ---

function renderMyAds() {
    if(!currentUser) return;
    const list = document.getElementById('myAdsList');
    if(!list) return;
    
    // Шапка профиля
    const header = document.getElementById('profileHeader');
    if(header) {
        const avatarUrl = currentUser.photoURL || null;
        let avatarHTML = avatarUrl ? `<img src="${avatarUrl}" alt="Avatar">` : (currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U");
        
        header.innerHTML = `
            <div class="profile-card">
                <div class="user-avatar-container" onclick="document.getElementById('avatarUploadInput').click()">
                    <div class="user-avatar">${avatarHTML}</div>
                    <div class="avatar-overlay"><i class="fas fa-camera"></i></div>
                </div>
                <input type="file" id="avatarUploadInput" hidden accept="image/*">
                <div class="user-info">
                    <h2 class="user-name">${currentUser.displayName || "User"}</h2>
                    <p class="user-contact">${currentUser.email}</p>
                    <button onclick="window.logout()" style="margin-top:10px; border:1px solid #ccc; background:white; padding:5px 15px; border-radius:5px;">${t('logout')}</button>
                </div>
            </div>
        `;
        
        // Загрузка аватарки
        document.getElementById('avatarUploadInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file){
                const reader = new FileReader();
                reader.onload = async function(ev) {
                    try {
                        await updateProfile(currentUser, { photoURL: ev.target.result });
                        window.location.reload();
                    } catch(err) { alert("Error photo"); }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const myAds = ads.filter(ad => ad.authorId === currentUser.uid);
    list.innerHTML = '';
    
    if (myAds.length === 0) { list.innerHTML = `<div style="text-align:center; padding:50px;">Пусто</div>`; return; }

    myAds.forEach(ad => {
        const img = ad.images && ad.images.length ? ad.images[0] : 'https://via.placeholder.com/400';
        list.innerHTML += `
            <div class="my-ad-card">
                <img src="${img}" class="my-ad-img">
                <div class="my-ad-content">
                    <div class="my-ad-price">${new Intl.NumberFormat('ru-RU').format(ad.price)} ${t('som')}</div>
                    <div class="my-ad-title">${ad.address}</div>
                    <small>Статус: ${ad.status === 'active' ? t('admin_active') : t('admin_pending')}</small>
                    <div class="ad-footer">
                        <button class="btn-mini-action btn-del" onclick="window.deleteAd('${ad.id}')"><i class="far fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- 10. АДМИНКА ---

function renderAdminList() {
    const list = document.getElementById('fullAdminList');
    if(!list) return;
    list.innerHTML = '';
    
    let pendingCount = 0;
    ads.forEach(ad => { if(ad.status === 'pending') pendingCount++; });
    if(document.getElementById('pendingCount')) document.getElementById('pendingCount').innerText = pendingCount;

    ads.sort((a, b) => (a.status === 'pending' ? -1 : 1));
    
    ads.forEach(ad => {
        const isPending = ad.status === 'pending';
        list.innerHTML += `
            <div class="admin-card ${isPending ? 'pending' : 'active'}" style="flex-direction: column;">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <img src="${getMainImage(ad)}" class="admin-img">
                    <div class="admin-info">
                        <span class="status-badge ${isPending?'status-pending':'status-active'}">${isPending?t('admin_pending'):t('admin_active')}</span>
                        <h4>${new Intl.NumberFormat('ru-RU').format(ad.price)} сом</h4>
                        <p>${ad.address}</p>
                        <small>${ad.authorEmail}</small>
                    </div>
                    <div class="admin-actions">
                        ${isPending ? `<button class="btn-mini btn-approve" onclick="window.approveAd('${ad.id}')">✅</button>` : ''}
                        <button class="btn-mini btn-reject" onclick="window.deleteAd('${ad.id}')">🗑</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- 11. ДЕТАЛИ ---

async function loadDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;
    try {
        const snap = await getDoc(doc(db, "ads", id));
        if(snap.exists()) {
            const ad = snap.data();
            document.getElementById('detail-title').innerText = `${getCatName(ad.category)}, ${ad.area} м²`;
            document.getElementById('detail-address').innerText = ad.address;
            document.getElementById('detail-price').innerText = `${new Intl.NumberFormat('ru-RU').format(ad.price)} ${t('som')}`;
            document.getElementById('detail-desc').innerText = ad.description;
            
            if(ad.lat) {
                const map = L.map('map-view').setView([ad.lat, ad.lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([ad.lat, ad.lng]).addTo(map);
            }
            
            const imgs = ad.images && ad.images.length ? ad.images : [getMainImage(ad)];
            const mainImg = document.getElementById('sliderMainImg');
            if(mainImg) mainImg.src = imgs[0];
            
            if(currentUser) {
                document.getElementById('contact-placeholder').style.display='none';
                document.getElementById('contact-real').style.display='block';
                document.getElementById('detail-phone').innerText = ad.phone;
                document.querySelector('.btn-whatsapp').href = `https://wa.me/${ad.phone.replace(/\D/g, '')}`;
            }
        }
    } catch(e){ console.log(e); }
}

// --- 12. ГЛОБАЛЬНЫЕ ФУНКЦИИ (ДЛЯ HTML) ---

window.toggleLang = () => {
    const next = currentLang === 'ru' ? 'kg' : 'ru';
    localStorage.setItem(LANG_KEY, next);
    location.reload();
};

window.toggleFav = (id, btn) => {
    if(event) event.stopPropagation();
    if (!currentUser) return window.location.href = 'login.html';
    const index = favorites.indexOf(id);
    if (index === -1) favorites.push(id); else favorites.splice(index, 1);
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    if(btn) btn.classList.toggle('active');
};

window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

window.approveAd = async (id) => {
    await updateDoc(doc(db, "ads", id), { status: 'active' });
    fetchAds();
};

window.deleteAd = async (id) => {
    if(confirm(t('delete')+'?')) {
        await deleteDoc(doc(db, "ads", id));
        fetchAds();
    }
};

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function applyTranslations() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if(translations[currentLang][key]) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = translations[currentLang][key];
            else el.innerText = translations[currentLang][key];
        }
    });
}
function t(key) { return translations[currentLang][key] || key; }
function getCatName(cat) { return t('cat_' + cat); }
function formatAddress(a) { 
    let parts = [];
    if(a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
    if(a.road) parts.push(a.road);
    if(a.house_number) parts.push(a.house_number);
    return parts.join(', '); 
}
