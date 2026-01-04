// Подключаем Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ТВОИ КЛЮЧИ (Верные)
const firebaseConfig = {
    apiKey: "AIzaSyAt8-kfuQ6JfipKe_pY7kHKwXJ3N0fG7q4",
    authDomain: "oshestate-real.firebaseapp.com",
    projectId: "oshestate-real",
    storageBucket: "oshestate-real.firebasestorage.app",
    messagingSenderId: "250961030188",
    appId: "1:250961030188:web:225ec2c8d30ae93dfa7589"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log(">>> SCRIPT V3 (ADMIN DEBUG) ЗАГРУЖЕН <<<");

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- ПЕРЕМЕННЫЕ ---
    const pageType = document.body.dataset.page;
    const USERS_KEY = 'oshUsers_v2';
    const CURR_USER_KEY = 'oshCurrentUser_v2';
    const FAV_KEY = 'oshFavorites_v2';
    
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    let currentUser = JSON.parse(localStorage.getItem(CURR_USER_KEY));
    let favorites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];

    // --- ЛОГИКА АДМИНКИ (ИСПРАВЛЕННАЯ: ЧИТАЕТ ИЗ FIREBASE) ---
    const adminPanel = document.getElementById('adminPanel');
    const adminLogin = document.getElementById('adminLogin');
    const btnAdminLogin = document.getElementById('btnAdminLogin');
    const adminList = document.getElementById('adminList');

    if (adminLogin) {
        console.log(">>> Мы находимся на странице АДМИНКИ");

        btnAdminLogin.addEventListener('click', () => {
            const pass = document.getElementById('adminPass').value;
            
            if(pass === 'admin') { 
                adminLogin.style.display = 'none';
                adminPanel.style.display = 'block';
                console.log(">>> Вход выполнен. Загружаем данные из Google...");
                loadAdminAds();
            } else {
                alert('Неверный пароль');
            }
        });

        // Функция загрузки напрямую из Google
        async function loadAdminAds() {
            adminList.innerHTML = '<div class="loader">Загрузка данных из облака...</div>';
            
            try {
                // ЗАПРОС К FIREBASE
                const querySnapshot = await getDocs(collection(db, "ads"));
                console.log(">>> Найдено объявлений в базе:", querySnapshot.size);
                
                if (querySnapshot.empty) {
                    adminList.innerHTML = '<p style="text-align:center;">База данных пуста</p>';
                    return;
                }

                let ads = [];
                querySnapshot.forEach((doc) => {
                    let d = doc.data(); 
                    d.id = doc.id;
                    ads.push(d);
                });
                
                // Сортировка (сначала новые/непроверенные)
                ads.sort((a, b) => (a.status === 'pending' ? -1 : 1));

                adminList.innerHTML = '';
                let pendingCount = 0;

                ads.forEach(ad => {
                    if(ad.status === 'pending') pendingCount++;
                    const isPending = ad.status === 'pending';
                    const formattedPrice = new Intl.NumberFormat('ru-RU').format(ad.price);
                    
                    adminList.innerHTML += `
                        <div class="admin-card" style="border:1px solid #ccc; padding:15px; margin-bottom:10px; background:white; display:flex; gap:15px; align-items:center;">
                            <img src="${ad.image}" style="width:100px; height:80px; object-fit:cover; border-radius:5px;" onerror="this.src='https://via.placeholder.com/150'">
                            <div style="flex:1;">
                                <span style="background:${isPending ? '#f39c12' : '#27ae60'}; color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">
                                    ${isPending ? 'Ожидает' : 'Активно'}
                                </span>
                                <h4 style="margin:5px 0;">${formattedPrice} сом</h4>
                                <p style="margin:0; color:#555; font-size:0.9rem;">${ad.address}</p>
                                <p style="margin:0; color:#999; font-size:0.8rem;">${ad.author}</p>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:5px;">
                                ${isPending ? `<button onclick="window.approveAd('${ad.id}')" class="btn-approve">✅ ОК</button>` : ''}
                                <button onclick="window.deleteAd('${ad.id}')" class="btn-reject">🗑 X</button>
                            </div>
                        </div>
                    `;
                });
                document.getElementById('pendingCount').innerText = pendingCount;

            } catch (error) {
                console.error(">>> ОШИБКА АДМИНКИ:", error);
                adminList.innerHTML = `<div style="color:red">Ошибка: ${error.message}</div>`;
            }
        }

        // Глобальные функции
        window.approveAd = async function(id) {
            try {
                await updateDoc(doc(db, "ads", id), { status: "active" });
                alert("Объявление одобрено! Теперь оно видно на сайте.");
                loadAdminAds();
            } catch (e) { alert("Ошибка: " + e.message); }
        };

        window.deleteAd = async function(id) {
            if(confirm("Удалить это объявление навсегда?")) {
                try {
                    await deleteDoc(doc(db, "ads", id));
                    loadAdminAds();
                } catch (e) { alert("Ошибка: " + e.message); }
            }
        };
    }

    // --- ОСТАЛЬНОЙ КОД (ДЛЯ РАБОТЫ САЙТА) ---
    const navContainer = document.getElementById('nav-links-container');
    if (navContainer) {
        let linksHTML = `
            <li><a href="index.html">Главная</a></li>
            <li><a href="buy.html">Купить</a></li>
            <li><a href="rent.html">Снять</a></li>
            <li><a href="favorites.html" style="color:#e74c3c;"><i class="fas fa-heart"></i></a></li>
        `;
        if (currentUser) {
            linksHTML += `<li><a href="add.html" class="btn-login">+ Подать</a></li>`;
        } else {
            linksHTML += `<li><a href="login.html">Войти</a></li>`;
        }
        navContainer.innerHTML = linksHTML;
    }

    // Подача
    const addForm = document.getElementById('createAdForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!currentUser) return alert('Войдите!');
            
            const btn = addForm.querySelector('.btn-submit');
            btn.innerText = 'Отправка...';
            btn.disabled = true;
            
            try {
                const newAd = {
                    status: 'pending',
                    type: document.querySelector('input[name="dealType"]:checked').value,
                    category: document.getElementById('inputType').value,
                    price: Number(document.getElementById('inputPrice').value),
                    area: Number(document.getElementById('inputArea').value),
                    address: document.getElementById('inputAddress').value,
                    description: document.getElementById('inputDesc').value, 
                    image: document.getElementById('inputImage').value || 'https://via.placeholder.com/400x300',
                    author: currentUser.email,
                    date: new Date().toISOString()
                };
                await addDoc(collection(db, "ads"), newAd);
                alert('УСПЕХ! Объявление отправлено.');
                window.location.href = 'index.html';
            } catch (e) { 
                alert("Ошибка: " + e.message); 
                btn.innerText = 'Ошибка'; 
                btn.disabled = false;
            }
        });
    }

    // Регистрация/Вход
    const registerForm = document.getElementById('registerForm');
    if(registerForm) {
        document.getElementById('btnGetCode').addEventListener('click', () => {
             document.getElementById('step-1').style.display = 'none';
             document.getElementById('step-2').style.display = 'block';
             alert('Код 1234');
        });
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = { name: document.getElementById('regName').value, email: document.getElementById('regEmail').value, pass: document.getElementById('regPass').value };
            users.push(u);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            localStorage.setItem(CURR_USER_KEY, JSON.stringify(u));
            window.location.href = 'index.html';
        });
    }
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
             e.preventDefault();
             const email = document.getElementById('loginEmail').value;
             const pass = document.getElementById('loginPass').value;
             const user = users.find(u => u.email === email && u.pass === pass);
             if(user) { localStorage.setItem(CURR_USER_KEY, JSON.stringify(user)); window.location.href = 'index.html'; }
        });
    }
    
    // Загрузка для страниц Купить/Снять
    const grid = document.getElementById('listings-container');
    if(grid && (pageType === 'sale' || pageType === 'rent')) {
        grid.innerHTML = '<div class="loader">Загрузка...</div>';
        try {
            const qs = await getDocs(collection(db, "ads"));
            let ads = [];
            qs.forEach(doc => { let d = doc.data(); d.id = doc.id; ads.push(d); });
            const filtered = ads.filter(ad => ad.type === pageType && ad.status === 'active');
            
            grid.innerHTML = '';
            if(!filtered.length) grid.innerHTML = 'Нет объявлений';
            
            filtered.forEach(ad => {
                const isSale = ad.type === 'sale';
                grid.innerHTML += `
                    <div class="listing-card" onclick="location.href='details.html?id=${ad.id}'" style="cursor:pointer">
                        <div class="card-image"><img src="${ad.image}" onerror="this.src='https://via.placeholder.com/300'"></div>
                        <div class="card-details">
                            <div class="price">${ad.price} сом</div>
                            <h3>${ad.category}, ${ad.area} м²</h3>
                            <p>${ad.address}</p>
                        </div>
                    </div>`;
            });
        } catch(e) { console.error(e); }
    }
});
