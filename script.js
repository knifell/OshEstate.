// Подключаем Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

console.log(">>> START: Скрипт начал работу v2.0 (Debug)");

// 1. КОНФИГУРАЦИЯ
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
console.log(">>> Firebase инициализирован");

document.addEventListener('DOMContentLoaded', async () => {
    console.log(">>> DOM загружен");
    
    const pageType = document.body.dataset.page;
    const USERS_KEY = 'oshUsers_v2';
    const CURR_USER_KEY = 'oshCurrentUser_v2';
    const FAV_KEY = 'oshFavorites_v2';
    
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    let currentUser = JSON.parse(localStorage.getItem(CURR_USER_KEY));
    let favorites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];

    console.log(">>> Текущий пользователь:", currentUser);

    // --- МЕНЮ ---
    const navContainer = document.getElementById('nav-links-container');
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

        // Логика выхода
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

    // --- ПОДАЧА ОБЪЯВЛЕНИЯ (СУПЕР-ПОДРОБНАЯ ПРОВЕРКА) ---
    const addForm = document.getElementById('createAdForm');
    if (addForm) {
        console.log(">>> Форма подачи найдена");
        
        if (!currentUser) { 
            console.warn(">>> НЕТ ПОЛЬЗОВАТЕЛЯ! Перенаправляю...");
            alert('Сначала войдите в аккаунт'); 
            window.location.href = 'login.html'; 
        } else {
            document.getElementById('inputPhone').value = currentUser.phone || '';
        }

        addForm.addEventListener('submit', async (e) => {
            console.log(">>> КНОПКА ОТПРАВИТЬ НАЖАТА! (Начало обработки)");
            e.preventDefault(); // Останавливаем перезагрузку
            
            const btn = addForm.querySelector('.btn-submit');
            btn.innerText = 'Отправка...';
            btn.disabled = true;

            // Проверка данных перед сборкой
            if (!currentUser) {
                console.error(">>> ОШИБКА: Пользователь потерян при отправке!");
                alert("Ошибка: Вы не авторизованы.");
                return;
            }

            try {
                console.log(">>> Сборка данных...");
                const newAd = {
                    status: 'pending',
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
                console.log(">>> Данные собраны:", newAd);

                console.log(">>> Отправка в Firebase...");
                await addDoc(collection(db, "ads"), newAd);
                
                console.log(">>> УСПЕХ! Данные ушли.");
                alert('Объявление отправлено на проверку!');
                window.location.href = 'index.html';

            } catch (error) {
                console.error(">>> КРИТИЧЕСКАЯ ОШИБКА FIREBASE:", error);
                alert("Ошибка при отправке: " + error.message);
                btn.innerText = 'Попробовать снова';
                btn.disabled = false;
            }
        });
    }

    // --- ОСТАЛЬНАЯ ЛОГИКА (Чтобы сайт работал) ---
    // ... (краткая версия рендера для экономии места, она у тебя работала)
    const grid = document.getElementById('listings-container');
    if(grid) {
        console.log(">>> Загрузка списка объявлений...");
        try {
            const querySnapshot = await getDocs(collection(db, "ads"));
            let ads = [];
            querySnapshot.forEach((doc) => {
                let d = doc.data(); d.id = doc.id;
                ads.push(d);
            });
            console.log(">>> Скачано объявлений:", ads.length);
            
            // Простой рендер для теста
            if(pageType === 'sale' || pageType === 'rent') {
               const filtered = ads.filter(ad => ad.type === pageType && ad.status === 'active');
               grid.innerHTML = filtered.length ? '' : 'Нет объявлений';
               filtered.forEach(ad => {
                   grid.innerHTML += `<div class="listing-card">
                       <div class="card-image"><img src="${ad.image}"></div>
                       <div class="card-details">
                           <h3>${ad.price} сом</h3>
                           <p>${ad.address}</p>
                           <a href="details.html?id=${ad.id}">Подробнее</a>
                       </div>
                   </div>`;
               });
            }
        } catch(e) { console.error("Ошибка загрузки:", e); }
    }

    // Регистрация (LocalStorage)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        document.getElementById('btnGetCode').addEventListener('click', () => {
             document.getElementById('step-1').style.display = 'none';
             document.getElementById('step-2').style.display = 'block';
             alert('Код: 1234');
        });
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userData = {
                name: document.getElementById('regName').value,
                email: document.getElementById('regEmail').value,
                phone: document.getElementById('regPhone').value,
                pass: document.getElementById('regPass').value
            };
            users.push(userData);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            localStorage.setItem(CURR_USER_KEY, JSON.stringify(userData));
            window.location.href = 'index.html';
        });
    }
    
    // Вход
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
             e.preventDefault();
             const email = document.getElementById('loginEmail').value;
             const pass = document.getElementById('loginPass').value;
             const user = users.find(u => u.email === email && u.pass === pass);
             if(user) {
                 localStorage.setItem(CURR_USER_KEY, JSON.stringify(user));
                 window.location.href = 'index.html';
             } else { alert('Ошибка входа'); }
        });
    }
});
