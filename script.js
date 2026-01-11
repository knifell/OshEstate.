/* ========================================================================
   ФИНАЛЬНЫЙ СКРИПТ: OSH ESTATE + FIREBASE (ESTATEOSH)
   ======================================================================== */

// --- 1. ИМПОРТ FIREBASE ---
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

// --- 2. КОНФИГУРАЦИЯ (ИЗ ТВОЕГО СКРИНШОТА) ---
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

document.addEventListener('DOMContentLoaded', async () => {

    // --- 3. НАСТРОЙКИ ---
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

    // --- 5. ФУНКЦИИ ---

    async function fetchAds() {
        const grid = document.getElementById('listings-container');
        if(grid) grid.innerHTML = `<div style="text-align:center; padding:40px;">${t('loading')}</div>`;

        try {
            const q = query(collection(db, "ads"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            ads = [];
            querySnapshot.forEach((doc) => {
                ads.push({ id: doc.id, ...doc.data() });
            });
            
            if (grid) renderGrid(ads); 
            if (pageType === 'profile') renderMyAds();
            if (document.getElementById('fullAdminList')) renderAdminList();
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        }
    }

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        renderNav(); 
        
        if (pageType === 'profile' && !user) window.location.href = 'login.html';
        if (pageType === 'add' && !user) {
            alert(t('nav_login'));
            window.location.href = 'login.html';
        }
        fetchAds();
    });

    window.changeLang = function(lang) {
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);
        applyTranslations();
        window.location.reload();
    };

    function applyTranslations() {
        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.getAttribute('data-lang');
            if(translations[currentLang][key]) el.innerText = translations[currentLang][key];
        });
        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
            const key = el.getAttribute('data-lang-placeholder');
            if(translations[currentLang][key]) el.placeholder = translations[currentLang][key];
        });
        const btn = document.getElementById('langToggleBtn');
        if(btn) btn.innerText = currentLang === 'ru' ? 'KG 🇰🇬' : 'RU 🇷🇺';
    }

    function t(key) { return translations[currentLang][key] || key; }

    function getMainImage(ad) {
        if (ad.images && ad.images.length > 0) return ad.images[0];
        if (ad.image) return ad.image; 
        return 'https://via.placeholder.com/400x300?text=Нет+фото';
    }

    function getCatName(cat) { return t('cat_' + cat); }

    function formatAddress(a) {
        let parts = [];
        const city = a.city || a.town || a.village || a.hamlet;
        if (a.village || a.hamlet) {
            let name = a.village || a.hamlet;
            parts.push(currentLang === 'kg' ? (name + " айылы") : ("с. " + name));
        } else if (city) {
            parts.push(city);
        }
        if (!city && a.county) parts.push(a.county);
        const district = a.suburb || a.residential || a.neighbourhood || a.quarter;
        if (district) parts.push(district);
        const street = a.road || a.pedestrian || a.highway;
        if (street) parts.push(street);
        const number = a.house_number;
        if (number) parts.push(currentLang === 'kg' ? `${number}-үй` : `д. ${number}`);
        if (parts.length === 0) return t('map_point') || "Точка";
        return parts.join(', ');
    }

    // =======================================================
    // 6. СТРАНИЦА ADD
    // =======================================================
    if (pageType === 'add') {
        const mapPicker = L.map('map-picker', { maxBounds: KG_BOUNDS, maxBoundsViscosity: 1.0, minZoom: 7 }).setView(OSH_CENTER, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapPicker);

        let currentMarker = null;
        const addrInput = document.getElementById('inputAddress');
        const latInput = document.getElementById('inputLat');
        const lngInput = document.getElementById('inputLng');
        const suggestionsBox = document.getElementById('suggestions');

        mapPicker.on('click', async function(e) {
            if (!KG_BOUNDS.contains(e.latlng)) return alert(t('error_bounds'));
            if (currentMarker) mapPicker.removeLayer(currentMarker);
            currentMarker = L.marker(e.latlng).addTo(mapPicker);
            latInput.value = e.latlng.lat;
            lngInput.value = e.latlng.lng;
            addrInput.value = t('loading');
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=${currentLang}`);
                const data = await response.json();
                addrInput.value = data.address ? formatAddress(data.address) : t('map_point');
            } catch (err) { addrInput.value = t('error_net'); }
        });

        let debounceTimer;
        addrInput.addEventListener('input', function() {
            const query = this.value;
            suggestionsBox.style.display = 'none'; suggestionsBox.innerHTML = '';
            if (query.length < 3) return;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=kg&accept-language=${currentLang}&addressdetails=1&limit=5`);
                    const results = await response.json();
                    if (results.length > 0) {
                        suggestionsBox.style.display = 'block';
                        results.forEach(item => {
                            const li = document.createElement('li');
                            li.className = 'suggestion-item';
                            const niceName = formatAddress(item.address);
                            li.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${niceName}`; 
                            li.onclick = () => {
                                addrInput.value = niceName; 
                                const lat = item.lat; const lng = item.lon;
                                mapPicker.setView([lat, lng], 16);
                                if (currentMarker) mapPicker.removeLayer(currentMarker);
                                currentMarker = L.marker([lat, lng]).addTo(mapPicker);
                                latInput.value = lat; lngInput.value = lng;
                                suggestionsBox.style.display = 'none';
                            };
                            suggestionsBox.appendChild(li);
                        });
                    }
                } catch (err) { console.error(err); }
            }, 500);
        });
        document.addEventListener('click', e => { if(e.target !== addrInput) suggestionsBox.style.display = 'none'; });

        document.getElementById('createAdForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('inputImageFile'); 
            if (!document.getElementById('inputLat').value) return alert(t('map_hint'));

            const processImages = async () => {
                if (fileInput.files.length === 0) return [];
                return Promise.all(Array.from(fileInput.files).map(f => new Promise(r => {
                    const reader = new FileReader();
                    reader.onload = (e) => r(e.target.result);
                    reader.readAsDataURL(f);
                })));
            };

            try {
                const imagesArray = await processImages();
                await addDoc(collection(db, "ads"), {
                    status: 'pending',
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
                    images: imagesArray,
                    author: currentUser.email,
                    authorId: currentUser.uid,
                    date: Date.now(),
                    views: 0
                });
                alert(t('sent'));
                window.location.href = 'index.html';
            } catch (err) { console.error(err); alert("Ошибка загрузки!"); }
        });
    }

    // =======================================================
    // 7. ПРОФИЛЬ
    // =======================================================
    if (pageType === 'profile') {
        const header = document.getElementById('profileHeader');
        
        window.renderProfileHeader = function() {
            if (!currentUser || !header) return;
            const avatarUrl = currentUser.photoURL || null;
            let avatarHTML = avatarUrl ? `<img src="${avatarUrl}" alt="Avatar">` : (currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U");

            header.innerHTML = `
                <div class="profile-card">
                    <button class="btn-settings-icon" onclick="openSettings()"><i class="fas fa-cog"></i></button>
                    <div class="user-avatar-container" onclick="document.getElementById('avatarUploadInput').click()">
                        <div class="user-avatar">${avatarHTML}</div>
                        <div class="avatar-overlay"><i class="fas fa-camera"></i></div>
                    </div>
                    <input type="file" id="avatarUploadInput" hidden accept="image/*">
                    <div class="user-info">
                        <h2 class="user-name">${currentUser.displayName || "User"}</h2>
                        <p class="user-contact">${currentUser.email}</p>
                        <div style="margin-top:15px;">
                            <a href="favorites.html" style="display:inline-block; padding:8px 20px; background:#fff0f0; color:#e74c3c; border-radius:20px; text-decoration:none; font-weight:bold; font-size:0.9rem;">
                                ❤️ ${t('profile_fav')}: ${favorites.length}
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
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

        window.switchTab = function(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            window.renderMyAds(tabName);
        };

        window.renderMyAds = function(tab = 'active') {
            if(!currentUser) return;
            const list = document.getElementById('myAdsList');
            const myAds = ads.filter(ad => {
                const isMine = ad.authorId === currentUser.uid;
                if (!isMine) return false;
                if (tab === 'active') return ad.status === 'active';
                if (tab === 'pending') return ad.status === 'pending';
                return false;
            });
            
            myAds.sort((a, b) => b.date - a.date);

            if (myAds.length === 0) { list.innerHTML = `<div style="text-align:center; padding:50px 20px; color:#bdc3c7;"><p>...</p></div>`; return; }

            list.innerHTML = '';
            myAds.forEach(ad => {
                list.innerHTML += `
                    <div class="my-ad-card">
                        <img src="${getMainImage(ad)}" class="my-ad-img">
                        <div class="my-ad-content">
                            <div class="my-ad-price">${new Intl.NumberFormat('ru-RU').format(ad.price)} ${t('som')}</div>
                            <div class="my-ad-title">${getCatName(ad.category)} • ${ad.address}</div>
                            <div class="ad-footer">
                                <div class="ad-actions-row">
                                    <button class="btn-mini-action btn-edit" onclick="openEditModal('${ad.id}')"><i class="fas fa-pen"></i></button>
                                    <button class="btn-mini-action btn-del" onclick="deleteMyAd('${ad.id}')"><i class="far fa-trash-alt"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        };

        window.openEditModal = function(id) {
            const ad = ads.find(a => a.id === id);
            if(!ad) return;
            document.getElementById('editAdId').value = id;
            document.getElementById('editPrice').value = ad.price;
            document.getElementById('editAddress').value = ad.address;
            document.getElementById('editDesc').value = ad.description || '';
            document.getElementById('editModal').style.display = 'flex';
        };

        window.saveEditedAd = async function() {
            const id = document.getElementById('editAdId').value;
            try {
                await updateDoc(doc(db, "ads", id), {
                    price: Number(document.getElementById('editPrice').value),
                    address: document.getElementById('editAddress').value,
                    description: document.getElementById('editDesc').value
                });
                alert(t('saved'));
                window.location.reload();
            } catch(e) { alert("Error"); }
        };

        window.deleteMyAd = async function(id) {
            if (confirm(t('delete') + '?')) {
                await deleteDoc(doc(db, "ads", id));
                window.location.reload();
            }
        };

        window.openSettings = function() {
            document.getElementById('editProfileName').value = currentUser.displayName || "";
            document.getElementById('settingsModal').style.display = 'flex';
        };

        window.saveProfileSettings = async function() {
            const newName = document.getElementById('editProfileName').value.trim();
            if(!newName) return;
            await updateProfile(currentUser, { displayName: newName });
            window.location.reload();
        };
        
        window.logoutProfile = function() { signOut(auth).then(() => window.location.href = 'index.html'); };
        
        if(currentUser) { renderProfileHeader(); renderMyAds(); }
    }

    // =======================================================
    // 8. АДМИНКА
    // =======================================================
    const adminPageForm = document.getElementById('adminPageLoginForm');
    if (adminPageForm) {
        adminPageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if(document.getElementById('adminPagePass').value === 'admin') {
                localStorage.setItem(ADMIN_AUTH_KEY, 'true'); window.location.href = 'index.html'; 
            } else { alert('Error'); }
        });
    }

    if (document.getElementById('fullAdminList')) {
        if(document.getElementById('adminLogoutBtn')) {
            document.getElementById('adminLogoutBtn').addEventListener('click', () => {
                localStorage.removeItem(ADMIN_AUTH_KEY); window.location.href = 'login.html'; 
            });
        }
        window.renderAdminList = function() {
            const list = document.getElementById('fullAdminList');
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
                            </div>
                            <div class="admin-actions">
                                ${isPending ? `<button class="btn-mini btn-approve" onclick="approveAd('${ad.id}')">✅</button>` : ''}
                                <button class="btn-mini btn-reject" onclick="deleteAd('${ad.id}')">🗑</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        window.approveAd = async function(id) { await updateDoc(doc(db, "ads", id), { status: 'active' }); window.location.reload(); };
        window.deleteAd = async function(id) { if(confirm(t('delete')+'?')) { await deleteDoc(doc(db, "ads", id)); window.location.reload(); } };
    }

    // =======================================================
    // 9. ГЛОБАЛЬНЫЕ
    // =======================================================
    function renderNav() {
        const nav = document.getElementById('nav-links-container');
        if (nav) {
            let html = `
                <li><a href="index.html" data-lang="nav_home">Главная</a></li>
                <li><a href="buy.html" data-lang="nav_buy">Купить</a></li>
                <li><a href="rent.html" data-lang="nav_rent">Снять</a></li>
            `;
            if (currentUser) {
                const name = currentUser.displayName || "User";
                html += `<li><a href="profile.html"><span data-lang="nav_profile">Профиль</span> (${name})</a></li><li><a href="add.html" class="btn-login" data-lang="nav_add">+ Подать</a></li>`;
            } else {
                html += `<li><a href="login.html" data-lang="nav_login">Войти</a></li><li><a href="register.html" class="btn-login" data-lang="nav_reg">Регистрация</a></li>`;
            }
            html += `<li><button id="langToggleBtn" class="lang-switch" onclick="changeLang('${currentLang === 'ru' ? 'kg' : 'ru'}')">RU 🇷🇺</button></li>`;
            nav.innerHTML = html;
            applyTranslations(); 
            
            if (pageType === 'profile' && window.renderProfileHeader) {
                window.renderProfileHeader();
                window.renderMyAds();
            }
        }
    }

    applyTranslations();

    const grid = document.getElementById('listings-container');
    if (grid) {
        window.renderGrid = function(data) {
            grid.innerHTML = '';
            if (document.getElementById('count-badge')) document.getElementById('count-badge').innerText = data.length;
            if (data.length === 0) { grid.innerHTML = `<div style="padding:50px; grid-column:1/-1; text-align:center;">Нет данных</div>`; return; }
            
            data.forEach(ad => {
                const isFav = favorites.includes(ad.id);
                grid.innerHTML += `
                    <div class="listing-card fade-in-up" onclick="location.href='details.html?id=${ad.id}'" style="cursor:pointer;">
                        <div class="card-image">
                            <span class="badge ${ad.type}">${t('type_'+ad.type)}</span>
                            <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${ad.id}', this)"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                            <img src="${getMainImage(ad)}">
                        </div>
                        <div class="card-details">
                            <div class="price">${new Intl.NumberFormat('ru-RU').format(ad.price)} ${t('som')}</div>
                            <h3 class="card-title">${getCatName(ad.category)}, ${ad.area} м²</h3>
                            <div class="card-address"><i class="fas fa-map-marker-alt"></i> ${ad.address}</div>
                        </div>
                    </div>
                `;
            });
        };
        
        if (pageType === 'sale' || pageType === 'rent') { 
            ['searchInput','categorySelect','priceMax'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.addEventListener('input', () => {
                    const txt = document.getElementById('searchInput').value.toLowerCase();
                    const cat = document.getElementById('categorySelect').value;
                    const max = document.getElementById('priceMax').value;
                    let res = ads.filter(ad => ad.type === pageType && ad.status === 'active');
                    res = res.filter(a => a.address.toLowerCase().includes(txt) && (cat==='all' || a.category===cat) && (!max || a.price <= max));
                    renderGrid(res);
                });
            });
        }
        else if (pageType === 'favorites') { 
            if (!currentUser) window.location.href = 'login.html'; 
            else {
                // При загрузке фильтруем
                const loadFavs = setInterval(() => {
                    if (ads.length > 0) {
                        renderGrid(ads.filter(ad => favorites.includes(ad.id)));
                        clearInterval(loadFavs);
                    }
                }, 500);
            }
        } 
    }

    // ДЕТАЛИ
    if (document.getElementById('detail-title')) {
        const id = new URLSearchParams(window.location.search).get('id');
        async function loadOneAd() {
            try {
                const docSnap = await getDoc(doc(db, "ads", id));
                if (docSnap.exists()) {
                    const ad = { id: docSnap.id, ...docSnap.data() };
                    document.getElementById('detail-title').innerText = `${getCatName(ad.category)}, ${ad.area} м²`;
                    document.getElementById('detail-address').innerText = ad.address;
                    document.getElementById('detail-price').innerText = `${new Intl.NumberFormat('ru-RU').format(ad.price)} ${t('som')}`;
                    document.getElementById('detail-desc').innerText = ad.description || '-';
                    
                    if(ad.lat && ad.lng && document.getElementById('map-view')) {
                        document.getElementById('map-section').style.display = 'block';
                        const map = L.map('map-view').setView([ad.lat, ad.lng], 15);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                        L.marker([ad.lat, ad.lng]).addTo(map);
                    }
                    
                    const imgs = ad.images && ad.images.length ? ad.images : [getMainImage(ad)];
                    const mainImg = document.getElementById('sliderMainImg');
                    const thumbs = document.getElementById('sliderThumbs');
                    const show = (i) => { mainImg.src = imgs[i]; };
                    imgs.forEach((src, i) => {
                        const img = document.createElement('img'); img.src=src; img.className='slider-thumb-img';
                        img.onclick=()=>{ show(i); }; thumbs.appendChild(img);
                    });
                    show(0);
                    
                    if(currentUser) {
                        document.getElementById('contact-placeholder').style.display='none';
                        document.getElementById('contact-real').style.display='block';
                        document.getElementById('detail-phone').innerText = ad.phone;
                        document.querySelector('.btn-whatsapp').href = `https://wa.me/${ad.phone.replace(/\D/g, '')}`;
                    }
                    const favBtn = document.getElementById('detailFavBtn');
                    if(favorites.includes(ad.id)) favBtn.classList.add('active');
                    favBtn.onclick = () => window.toggleFavorite(ad.id, favBtn);
                }
            } catch(e) { console.log(e); }
        }
        loadOneAd();
    }

    // AUTH
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        document.getElementById('btnGetCode').onclick = () => {
             document.getElementById('step-1').style.display='none'; 
             document.getElementById('step-2').style.display='block';
             alert('Code: 1234');
        };
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(document.getElementById('verifyCode').value !== '1234') return alert('Error code');
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;
            const name = document.getElementById('regName').value;
            try {
                const userCred = await createUserWithEmailAndPassword(auth, email, pass);
                await updateProfile(userCred.user, { displayName: name });
                window.location.href = 'index.html';
            } catch(e) { alert(e.message); }
        });
    }
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
             e.preventDefault();
             const email = document.getElementById('loginEmail').value;
             const pass = document.getElementById('loginPass').value;
             try {
                 await signInWithEmailAndPassword(auth, email, pass);
                 window.location.href = 'index.html';
             } catch(e) { alert(t('auth_err')); }
        });
    }

    window.toggleFavorite = function(id, btn) {
        if(event) event.stopPropagation();
        if (!currentUser) return window.location.href = 'login.html';
        const index = favorites.indexOf(id);
        if (index === -1) favorites.push(id); else favorites.splice(index, 1);
        localStorage.setItem(userFavKey, JSON.stringify(favorites));
        if(btn){ btn.classList.toggle('active'); btn.innerHTML = favorites.includes(id) ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>'; }
        if(pageType === 'favorites' && index !== -1) window.renderGrid(ads.filter(ad => favorites.includes(ad.id)));
    };
});