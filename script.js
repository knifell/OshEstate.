// Подключаем Firebase через Интернет
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =========================================================
// 1. КОНФИГУРАЦИЯ (Я ВСТАВИЛ ТВОИ ДАННЫЕ С ФОТО)
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyAt8-kfuQ6JfipKe_pY7kHKwXJ3N0fG7q4",
    authDomain: "oshestate-real.firebaseapp.com",
    projectId: "oshestate-real",
    storageBucket: "oshestate-real.firebasestorage.app",
    messagingSenderId: "250961030188",
    appId: "1:250961030188:web:225ec2c8d30ae93dfa7589"
};

// Запускаем Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =========================================================
// 2. ЛОГИКА САЙТА
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // Настройки
    const pageType = document.body.dataset.page; // 'home', 'sale', 'rent', 'add'
    
    // Пользователей пока держим в браузере (LocalStorage), чтобы не усложнять вход
    // Но объявления уже летят в облако!
    const USERS_KEY = 'oshUsers_v2';
    const CURR_USER_KEY = 'oshCurrentUser_v2';
    const FAV_KEY = 'oshFavorites_v2';
    
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    let currentUser = JSON.parse(localStorage.getItem(CURR_USER_KEY));
    let favorites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];

    // --- ФУНКЦИЯ ЛАЙКА ---
    window.toggleFavorite = function(id, btn) {
        if(event) event.stopPropagation();
        const index = favorites.indexOf(id);
        if (index === -1) {
            favorites.push(id);
            if(btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-heart"></i>'; }
        } else {
            favorites.splice(index, 1);
            if(btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="far fa-heart"></i>'; }
            // Если мы на странице избранного, удаляем карточку
            if(pageType === 'favorites' && btn) btn.closest('.listing-card').remove();
        }
        localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    };

    // --- МЕНЮ (NAVBAR) ---
    const navContainer = document.getElementById('nav-links-container');
    const mobileMenuBtn = document.querySelector('.menu-toggle');

    if (navContainer) {
        let linksHTML = `
            <li><a href="index.html">Главная</a></li>
            <li><a href="buy.html">Купить</a></li>
            <li><a href="rent.html">Снять</a></li>
            <li><a href="favorites.html" style="color:#e74c3c;"><i class="fas fa-heart"></i></a></li>
        `;
        
        if (currentUser) {
            linksHTML += `
                <li style="font-weight:bold; color:#1e293b;">👤 ${currentUser.name}</li>
                <li><a href="add.html" class="btn-login" style="background:#f97316">+ Подать</a></li>
                <li><a href="#" id="logoutBtn" style="color:#ef4444; font-weight:600;">Выйти</a></li>
            `;
        } else {
            linksHTML += `
                <li><a href="login.html">Войти</a></li>
                <li><a href="register.html" class="btn-login">Регистрация</a></li>
            `;
        }
        navContainer.innerHTML = linksHTML;

        setTimeout(() => {
            const logoutBtn = document.getElementById('logoutBtn');
            if(logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem(CURR_USER_KEY);
                    window.location.href = 'index.html';
                });
            }
        }, 500);
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navContainer.classList.toggle('mobile-active');
        });
    }

    // --- ЗАГРУЗКА ОБЪЯВЛЕНИЙ (ИЗ FIREBASE) ---
    const grid = document.getElementById('listings-container');
    
    // Функция загрузки данных
    async function fetchAds() {
        if (!grid) return;
        grid.innerHTML = '<div class="loader" style="grid-column:1/-1; text-align:center;">Загрузка данных из облака...</div>';
        
        try {
            // Получаем ВСЕ объявления
            const querySnapshot = await getDocs(collection(db, "ads"));
            let ads = [];
            
            querySnapshot.forEach((doc) => {
                let ad = doc.data();
                ad.id = doc.id; // Присваиваем реальный ID из базы
                ads.push(ad);
            });

            // Рендерим в зависимости от страницы
            if (pageType === 'favorites') {
                const favAds = ads.filter(ad => favorites.includes(ad.id));
                renderGrid(favAds);
            } 
            else if (pageType === 'sale' || pageType === 'rent') {
                // Показываем только активные и подходящие по типу
                const filtered = ads.filter(ad => ad.type === pageType && ad.status === 'active');
                renderGrid(filtered);
                // Инициализируем фильтры с уже загруженными данными
                window.allAdsCache = filtered; 
                initFilters();
            }
        } catch (error) {
            console.error("Ошибка Firebase:", error);
            grid.innerHTML = '<div style="text-align:center; color:red;">Ошибка подключения к базе данных.</div>';
        }
    }

    // Запускаем загрузку, если есть сетка
    if(grid) fetchAds();

    // Функция отрисовки сетки
    window.renderGrid = function(data) {
        grid.innerHTML = '';
        const countBadge = document.getElementById('count-badge');
        if(countBadge) countBadge.innerText = data.length;

        if (data.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#7f8c8d;">Объявлений пока нет.</div>';
            return;
        }

        data.forEach(ad => {
            const isSale = ad.type === 'sale';
            const isFav = favorites.includes(ad.id);
            const formattedPrice = new Intl.NumberFormat('ru-RU').format(ad.price);

            grid.innerHTML += `
                <div class="listing-card fade-in-up" onclick="location.href='details.html?id=${ad.id}'" style="cursor:pointer;">
                    <div class="card-image">
                        <span class="badge ${isSale ? 'sale' : 'rent'}">${isSale ? 'Продажа' : 'Аренда'}</span>
                        <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${ad.id}', this)">
                            <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                        <img src="${ad.image}" onerror="this.src='https://via.placeholder.com/400x300?text=Нет+фото'">
                    </div>
                    <div class="card-details">
                        <div class="price">${formattedPrice} ${isSale ? 'сом' : 'сом/мес'}</div>
                        <h3 class="card-title">${getCatName(ad.category)}, ${ad.area} м²</h3>
                        <div class="card-address"><i class="fas fa-map-marker-alt"></i> ${ad.address}</div>
                        <div class="features">
                            ${ad.rooms > 0 ? `<span><i class="fas fa-bed"></i> ${ad.rooms}</span>` : ''}
                            <span><i class="fas fa-ruler-combined"></i> ${ad.area} м²</span>
                        </div>
                        <span style="color:#f97316; font-weight:bold; margin-top:auto;">Подробнее &rarr;</span>
                    </div>
                </div>
            `;
        });
    };

    // --- ФИЛЬТРЫ ---
    function initFilters() {
        const searchInput = document.getElementById('searchInput');
        const categorySelect = document.getElementById('categorySelect');
        const priceMax = document.getElementById('priceMax');
        const sortSelect = document.getElementById('sortSelect');

        const applyFilters = () => {
            let filtered = window.allAdsCache || [];
            
            const text = searchInput ? searchInput.value.toLowerCase() : '';
            const cat = categorySelect ? categorySelect.value : 'all';
            const pMax = priceMax ? priceMax.value : '';
            
            filtered = filtered.filter(ad => {
                const matchText = ad.address.toLowerCase().includes(text);
                const matchCat = cat === 'all' || ad.category === cat;
                const matchPrice = !pMax || ad.price <= pMax;
                return matchText && matchCat && matchPrice;
            });

            if(sortSelect) {
                const sort = sortSelect.value;
                if(sort === 'cheap') filtered.sort((a,b) => a.price - b.price);
                if(sort === 'new') filtered.sort((a,b) => (b.date || 0) - (a.date || 0)); // Используем date или 0
            }
            renderGrid(filtered);
        };

        [searchInput, categorySelect, priceMax, sortSelect].forEach(el => {
            if(el) el.addEventListener('input', applyFilters);
        });
    }

    // --- ПОДАЧА ОБЪЯВЛЕНИЯ (ADD) ---
    const addForm = document.getElementById('createAdForm');
    if (addForm) {
        if (!currentUser) { 
            alert('Сначала войдите в аккаунт'); 
            window.location.href = 'login.html'; 
        }
        if(currentUser) document.getElementById('inputPhone').value = currentUser.phone || '';

        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addForm.querySelector('.btn-submit');
            btn.innerText = 'Отправка...';
            btn.disabled = true;

            const newAd = {
                status: 'pending', // Сначала на проверку
                type: document.querySelector('input[name="dealType"]:checked').value,
                category: document.getElementById('inputType').value,
                rooms: Number(document.getElementById('inputRooms').value),
                price: Number(document.getElementById('inputPrice').value),
                area: Number(document.getElementById('inputArea').value),
                address: document.getElementById('inputAddress').value,
                phone: document.getElementById('inputPhone').value,
                description: document.getElementById('inputDesc').value, 
                image: document.getElementById('inputImage').value || 'https://via.placeholder.com/400x300',
                author: currentUser.email,
                date: new Date().toISOString()
            };

            try {
                await addDoc(collection(db, "ads"), newAd);
                alert('Объявление отправлено на проверку!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error adding document: ", error);
                alert("Ошибка при отправке: " + error.message);
                btn.innerText = 'Попробовать снова';
                btn.disabled = false;
            }
        });
    }

    // --- СТРАНИЦА ДЕТАЛЕЙ (DETAILS) ---
    if (window.location.pathname.includes('details.html')) {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        
        if(id) {
            try {
                // Загружаем объявления чтобы найти нужное
                // В идеале нужен getDoc(doc(db, "ads", id)), но используем кэш для простоты
                const querySnapshot = await getDocs(collection(db, "ads"));
                let foundAd = null;
                querySnapshot.forEach((doc) => {
                     if(doc.id === id) {
                         foundAd = doc.data();
                         foundAd.id = doc.id;
                     }
                });

                if (foundAd) {
                    const isSale = foundAd.type === 'sale';
                    const isFav = favorites.includes(foundAd.id);

                    document.getElementById('detail-title').innerText = `${getCatName(foundAd.category)}, ${foundAd.area} м²`;
                    document.getElementById('detail-address').innerText = foundAd.address;
                    document.getElementById('detail-price').innerText = `${new Intl.NumberFormat('ru-RU').format(foundAd.price)} ${isSale ? 'сом' : 'сом/мес'}`;
                    document.getElementById('detail-badge').innerText = isSale ? 'Продажа' : 'Аренда';
                    document.getElementById('detail-badge').className = isSale ? 'badge-static sale' : 'badge-static rent';
                    document.getElementById('detail-author').innerText = foundAd.author || 'Продавец';
                    document.getElementById('detail-desc').innerText = foundAd.description || 'Нет описания.'; 
                    
                    const imgContainer = document.querySelector('.detail-image');
                    imgContainer.innerHTML = `
                        <button class="card-fav-btn detail-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${foundAd.id}', this)">
                            <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                        <img id="detail-img" src="${foundAd.image || 'https://via.placeholder.com/800x500'}" alt="Фото">
                    `;

                    const specsList = document.getElementById('detail-specs');
                    specsList.innerHTML = `
                        <li><span>Тип:</span> ${getCatName(foundAd.category)}</li>
                        <li><span>Площадь:</span> ${foundAd.area} м²</li>
                        <li><span>Комнат:</span> ${foundAd.rooms}</li>
                        <li><span>Дата:</span> ${new Date(foundAd.date).toLocaleDateString()}</li>
                    `;

                    // Телефон
                    if (currentUser) {
                        document.getElementById('contact-placeholder').style.display = 'none';
                        document.getElementById('contact-real').style.display = 'block';
                        document.getElementById('detail-phone').innerText = foundAd.phone || 'Не указан';
                        
                        const whatsappBtn = document.querySelector('.btn-whatsapp');
                        if(whatsappBtn && foundAd.phone) {
                            let cleanPhone = foundAd.phone.replace(/\D/g, ''); 
                            if (cleanPhone.startsWith('0')) cleanPhone = '996' + cleanPhone.substring(1); 
                            whatsappBtn.href = `https://wa.me/${cleanPhone}`; 
                        }
                    } else {
                        document.getElementById('contact-placeholder').style.display = 'block';
                        document.getElementById('contact-real').style.display = 'none';
                    }
                } else {
                     document.getElementById('property-content').innerHTML = '<h2 style="text-align:center; padding:50px;">Объявление не найдено или удалено.</h2>';
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    // --- АДМИН ПАНЕЛЬ (ADMIN) ---
    const adminPanel = document.getElementById('adminPanel');
    const adminLogin = document.getElementById('adminLogin');
    const adminList = document.getElementById('adminList');
    
    if (adminPanel) {
        // Вход
        const btnLogin = document.getElementById('btnAdminLogin');
        btnLogin.addEventListener('click', () => {
            const pass = document.getElementById('adminPass').value;
            // !!! ВАЖНО: ЗДЕСЬ ПАРОЛЬ АДМИНА
            if(pass === 'admin') { 
                adminLogin.style.display = 'none';
                adminPanel.style.display = 'block';
                loadAdminAds();
            } else {
                alert('Неверный пароль');
            }
        });

        // Загрузка для админа (видит ВСЁ)
        async function loadAdminAds() {
            adminList.innerHTML = '<div class="loader">Загрузка...</div>';
            const querySnapshot = await getDocs(collection(db, "ads"));
            let ads = [];
            querySnapshot.forEach((doc) => {
                let d = doc.data(); d.id = doc.id;
                ads.push(d);
            });
            
            // Сортировка: Сначала 'pending'
            ads.sort((a, b) => (a.status === 'pending' ? -1 : 1));

            adminList.innerHTML = '';
            let pendingCount = 0;

            if (ads.length === 0) {
                adminList.innerHTML = '<p style="text-align:center;">Нет объявлений</p>';
                return;
            }

            ads.forEach(ad => {
                if(ad.status === 'pending') pendingCount++;
                const isPending = ad.status === 'pending';
                
                adminList.innerHTML += `
                    <div class="admin-card">
                        <img src="${ad.image}" class="admin-img" onerror="this.src='https://via.placeholder.com/150'">
                        <div class="admin-info">
                            <span class="status-badge ${isPending ? 'status-pending' : 'status-active'}">
                                ${isPending ? 'Ожидает проверки' : 'Активно'}
                            </span>
                            <h4>${new Intl.NumberFormat('ru-RU').format(ad.price)} сом</h4>
                            <p>${ad.address}</p>
                            <p style="font-size:0.8rem; color:#666;">ID: ${ad.id}</p>
                        </div>
                        <div class="admin-actions">
                            ${isPending ? `<button class="btn-approve" onclick="window.approveAd('${ad.id}')">✅ Одобрить</button>` : ''}
                            <button class="btn-reject" onclick="window.deleteAd('${ad.id}')">🗑 Удалить</button>
                        </div>
                    </div>
                `;
            });
            document.getElementById('pendingCount').innerText = pendingCount;
        }

        // Глобальные функции админа (чтобы работали из HTML onclick)
        window.approveAd = async function(id) {
            try {
                const adRef = doc(db, "ads", id);
                await updateDoc(adRef, { status: "active" });
                alert("Одобрено!");
                loadAdminAds();
            } catch (e) { alert("Ошибка: " + e.message); }
        };

        window.deleteAd = async function(id) {
            if(confirm("Точно удалить?")) {
                try {
                    await deleteDoc(doc(db, "ads", id));
                    alert("Удалено!");
                    loadAdminAds();
                } catch (e) { alert("Ошибка: " + e.message); }
            }
        };
    }

    // --- РЕГИСТРАЦИЯ И ВХОД (LOCALSTORAGE) ---
    // Оставляем как есть, чтобы не ломать логику форм, пока ты не решишь перейти на Firebase Auth
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const btnGetCode = document.getElementById('btnGetCode');
        const regPhoneInput = document.getElementById('regPhone');
        // Маска
        if (regPhoneInput) {
            regPhoneInput.addEventListener('input', function (e) {
                let x = e.target.value.replace(/\D/g, '').match(/(\d{0,4})(\d{0,2})(\d{0,2})(\d{0,2})/);
                if (!x[2]) e.target.value = x[1];
                else e.target.value = !x[3] ? x[1] + ' ' + x[2] : x[1] + ' ' + x[2] + '-' + x[3] + (x[4] ? '-' + x[4] : '');
            });
        }
        let generatedCode = null; let tempUserData = null;

        if(btnGetCode) {
            btnGetCode.addEventListener('click', () => {
                 const name = document.getElementById('regName').value;
                 const phone = document.getElementById('regPhone').value;
                 const email = document.getElementById('regEmail').value.toLowerCase().trim();
                 const pass = document.getElementById('regPass').value;
                 const passConfirm = document.getElementById('regPassConfirm').value;

                 if (!name || !email || !pass) return showToast('Заполните все поля', 'error');
                 if (pass !== passConfirm) return showToast('Пароли не совпадают', 'error');
                 if (users.find(u => u.email === email)) return showToast('Email занят', 'error');

                 generatedCode = 1234; 
                 tempUserData = { id: Date.now(), name, email, phone, pass };
                 alert('Ваш код: 1234');
                 document.getElementById('step-1').style.display = 'none';
                 document.getElementById('step-2').style.display = 'block';
            });

            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if(document.getElementById('verifyCode').value == generatedCode) {
                    users.push(tempUserData);
                    localStorage.setItem(USERS_KEY, JSON.stringify(users));
                    localStorage.setItem(CURR_USER_KEY, JSON.stringify(tempUserData));
                    window.location.href = 'index.html';
                } else { showToast('Неверный код', 'error'); }
            });
        }
    }

    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
             e.preventDefault();
             const email = document.getElementById('loginEmail').value.toLowerCase().trim();
             const pass = document.getElementById('loginPass').value;
             const user = users.find(u => u.email === email && u.pass === pass);
             if(user) {
                 localStorage.setItem(CURR_USER_KEY, JSON.stringify(user));
                 window.location.href = 'index.html';
             } else { showToast('Неверный Email или пароль', 'error'); }
        });
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ ---
    function getCatName(cat) {
        const map = { flat: 'Квартира', house: 'Дом', land: 'Участок', commerce: 'Коммерция' };
        return map[cat] || 'Объект';
    }

    window.showToast = function(msg, type='success') {
        const box = document.getElementById('toast-container');
        if(!box) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.background = type === 'error' ? '#e74c3c' : '#2ecc71';
        toast.innerHTML = msg;
        box.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };
});