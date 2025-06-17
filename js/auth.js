// js/auth.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'; // Importa Firestore

// --- Suas Configurações do Firebase ---
// VOCÊ PRECISA SUBSTITUIR ISSO COM AS SUAS CREDENCIAIS DO CONSOLE DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCLuOb0riBQuZZ-aaqILWeSTfYdPyk_8ac",
  authDomain: "sobrevivencia-3d.firebaseapp.com",
  projectId: "sobrevivencia-3d",
  storageBucket: "sobrevivencia-3d.firebasestorage.app",
  messagingSenderId: "1023102959744",
  appId: "1:1023102959744:web:78c84538a427464ccda665",
  measurementId: "G-07ZDFVL739"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Inicializa o Firestore

// --- Elementos da UI ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email-input'); // Agora é email
const passwordInput = document.getElementById('password-input');
const authMessage = document.getElementById('auth-message');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const playOfflineBtn = document.getElementById('play-offline-btn');

let isLoginMode = true; // true = Login, false = Cadastro

// Callback para iniciar o jogo (definida em main.js)
let initializeGameCallback = null;

export function setInitializeGameCallback(callback) {
    initializeGameCallback = callback;
}

function showAuthModal() {
    authModal.classList.add('show');
}

function hideAuthModal() {
    authModal.classList.remove('show');
    setTimeout(() => {
        authModal.classList.add('hidden');
    }, 300);
}

function displayMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.className = `text-center text-sm mt-2 ${type === 'error' ? 'text-red-400' : 'text-green-400'}`;
    authMessage.classList.remove('hidden');
    setTimeout(() => {
        authMessage.classList.add('hidden');
    }, 5000);
}

function toggleMode() {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Login' : 'Cadastro';
    authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Cadastrar';
    toggleAuthModeBtn.textContent = isLoginMode ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login';
    authMessage.classList.add('hidden');
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        displayMessage('Por favor, preencha todos os campos.');
        return;
    }

    try {
        if (isLoginMode) {
            // Login com Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            displayMessage('Login bem-sucedido!', 'success');
            // userCredential.user contém informações do usuário logado
            console.log('Usuário logado:', userCredential.user);
            
            // Opcional: tentar carregar dados do jogador do Firestore
            const playerDocRef = doc(db, "players", userCredential.user.uid);
            const playerDocSnap = await getDoc(playerDocRef);
            if (playerDocSnap.exists()) {
                console.log("Dados do jogador carregados:", playerDocSnap.data());
                // Aqui você pode passar playerDocSnap.data() para o initializeGameCallback
                // para carregar o estado salvo do jogador.
            } else {
                console.log("Nenhum dado salvo para este jogador, iniciando novo jogo.");
                // Se não houver dados, criar um novo documento para o jogador
                await setDoc(playerDocRef, {
                    lastLogin: new Date().toISOString(),
                    // Outros dados iniciais do jogador (inventário, saúde, etc. se quiser salvar no Firebase)
                });
            }

            hideAuthModal();
            if (initializeGameCallback) {
                initializeGameCallback(userCredential.user); // Passa o objeto user para o jogo
            }

        } else {
            // Cadastro com Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            displayMessage('Cadastro bem-sucedido! Agora faça login.', 'success');
            console.log('Usuário cadastrado:', userCredential.user);

            // Opcional: Criar um documento inicial para o novo usuário no Firestore
            // Você pode inicializar o estado do jogador aqui
            await setDoc(doc(db, "players", userCredential.user.uid), {
                email: userCredential.user.email,
                createdAt: new Date().toISOString(),
                // ... quaisquer outros dados iniciais do jogador (ex: inventory: {}, health: 100)
            });

            toggleMode(); // Volta para a tela de login
        }
    } catch (error) {
        let errorMessage = 'Ocorreu um erro.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Este email já está em uso.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Endereço de email inválido.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Senha muito fraca (mínimo de 6 caracteres).';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Email ou senha incorretos.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Autenticação por email/senha não habilitada. Verifique seu console Firebase.';
                break;
            default:
                errorMessage = `Erro: ${error.message}`;
        }
        displayMessage(errorMessage);
        console.error('Erro de autenticação do Firebase:', error);
    }
}

function handlePlayOffline() {
    hideAuthModal();
    if (initializeGameCallback) {
        // Para o modo offline, podemos simular um objeto de usuário básico
        const offlineUser = { uid: 'offline-player', email: 'offline@game.com' };
        initializeGameCallback(offlineUser);
    }
}

// Observa o estado de autenticação (útil para sessões persistentes)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário já está logado, pode iniciar o jogo diretamente
        console.log("Usuário já logado:", user);
        hideAuthModal();
        if (initializeGameCallback) {
            initializeGameCallback(user);
        }
    } else {
        // Nenhum usuário logado, mostra o modal de autenticação
        showAuthModal();
    }
});

// Adiciona os event listeners
authForm.addEventListener('submit', handleAuthSubmit);
toggleAuthModeBtn.addEventListener('click', toggleMode);
playOfflineBtn.addEventListener('click', handlePlayOffline);

// O modal agora é controlado pelo onAuthStateChanged inicialmente.
// showAuthModal(); // Não é mais necessário chamar aqui diretamente