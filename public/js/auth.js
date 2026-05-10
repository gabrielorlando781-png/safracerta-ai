/**
 * SafraCerta.ai - Supabase Authentication Module
 */

const Auth = {
    client: null,
    user: null,

    async init() {
        // Fetch config from backend
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
                console.error("Supabase config missing. Please check your .env file.");
                this.showError("Erro de configuração: Chaves do Supabase não encontradas.");
                return;
            }

            this.client = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            this.setupListeners();
            this.checkSession();
        } catch (e) {
            console.error("Auth init failed:", e);
        }
    },

    setupListeners() {
        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                await this.signIn(email, password);
            };
        }

        // Signup Form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const name = document.getElementById('signup-name').value;
                await this.signUp(email, password, name);
            };
        }
    },

    async checkSession() {
        const { data: { session }, error } = await this.client.auth.getSession();
        if (session) {
            this.handleAuthStateChange(session.user);
        } else {
            this.showAuthScreen(true);
        }
    },

    async signIn(email, password) {
        this.hideError();
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) {
            this.showError(error.message);
        } else {
            this.handleAuthStateChange(data.user);
        }
    },

    async signUp(email, password, name) {
        this.hideError();
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });
        
        if (error) {
            this.showError(error.message);
        } else {
            alert("Conta criada! Verifique seu e-mail para confirmar (se habilitado no Supabase) ou tente entrar.");
            this.toggleMode('login');
        }
    },

    async signOut() {
        await this.client.auth.signOut();
        location.reload(); // Refresh to clear state
    },

    handleAuthStateChange(user) {
        this.user = user;
        if (user) {
            this.showAuthScreen(false);
            // Sync with ProfileEngine if exists
            if (window.ProfileEngine) {
                ProfileEngine.user = {
                    name: user.user_metadata.full_name || user.email.split('@')[0],
                    email: user.email,
                    avatar: user.user_metadata.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`
                };
                ProfileEngine.renderProfile();
            }
            // Notify App to load data
            if (window.App && window.App.loadData) {
                window.App.loadData();
            }
        } else {
            this.showAuthScreen(true);
        }
    },

    showAuthScreen(show) {
        const authScreen = document.getElementById('auth-screen');
        const appShell = document.getElementById('app-shell');
        
        if (show) {
            authScreen.style.display = 'flex';
            appShell.style.display = 'none';
        } else {
            authScreen.style.display = 'none';
            appShell.style.display = 'flex';
            // Adjust body for app layout
            document.body.style.overflow = 'hidden';
        }
    },

    toggleMode(mode) {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        this.hideError();

        if (mode === 'signup') {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        } else {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        }
    },

    showError(msg) {
        const errDiv = document.getElementById('auth-error');
        if (errDiv) {
            errDiv.innerText = msg;
            errDiv.style.display = 'block';
        }
    },

    hideError() {
        const errDiv = document.getElementById('auth-error');
        if (errDiv) errDiv.style.display = 'none';
    }
};

// Start Auth when DOM loads
document.addEventListener('DOMContentLoaded', () => Auth.init());
