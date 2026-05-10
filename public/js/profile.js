/**
 * SafraCerta.ai - Profile Management
 */

const ProfileEngine = {
    state: {
        userData: null
    },

    async init() {
        await this.loadProfile();
        this.bindEvents();
    },

    bindEvents() {
        const photoInput = document.getElementById('prof-photo-input');
        if (photoInput) {
            photoInput.onchange = (e) => this.handlePhotoUpload(e);
        }
    },

    async handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch('/api/user/photo', {
                method: 'PUT',
                headers: await App.getHeaders(), // FormData
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                this.state.userData.avatar = data.avatar;
                this.renderProfile();
                alert('Foto atualizada com sucesso!');
            }
        } catch (error) {
            console.error("Error uploading photo:", error);
            alert('Erro ao carregar a foto.');
        }
    },

    async loadProfile() {
        try {
            const response = await fetch('/api/user', { headers: await App.getHeaders() });
            if (response.ok) {
                this.state.userData = await response.json();
                this.renderProfile();
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    },

    renderProfile() {
        const user = this.state.userData;
        if (!user) return;

        // Displays in Profile View
        document.getElementById('prof-name-display').innerText = user.name || 'Usuário';
        document.getElementById('prof-role-display').innerText = user.role || 'Produtor';
        
        if (user.avatar) {
            document.getElementById('prof-avatar').src = user.avatar;
        }

        // Global UI Updates (Sidebar & Header)
        const sidebarName = document.getElementById('sidebar-user-name');
        if (sidebarName) sidebarName.innerText = user.name || 'Usuário';

        const sidebarPlan = document.getElementById('sidebar-user-plan');
        if (sidebarPlan) sidebarPlan.innerText = user.plan || 'Plano Básico';

        const sidebarImg = document.getElementById('sidebar-user-img');
        if (sidebarImg && user.avatar) sidebarImg.src = user.avatar;

        const welcomeMsg = document.querySelector('.welcome-msg');
        if (welcomeMsg && user.name) {
            welcomeMsg.innerText = `Bem-vindo, ${user.name.split(' ')[0]}!`;
        }

        const headerImg = document.querySelector('.header-actions .user-img');
        if (headerImg && user.avatar) headerImg.src = user.avatar;

        // Inputs in Profile View
        document.getElementById('prof-name').value = user.name || '';
        document.getElementById('prof-role').value = user.role || '';
        document.getElementById('prof-email').value = user.email || '';
        document.getElementById('prof-phone').value = user.phone || '';
        document.getElementById('prof-farm-name').value = user.farmName || '';
        document.getElementById('prof-total-area').value = user.totalArea || '';
        document.getElementById('prof-location').value = user.location || '';
    },

    async saveProfile() {
        const updatedUser = {
            name: document.getElementById('prof-name').value,
            role: document.getElementById('prof-role').value,
            email: document.getElementById('prof-email').value,
            phone: document.getElementById('prof-phone').value,
            farmName: document.getElementById('prof-farm-name').value,
            totalArea: document.getElementById('prof-total-area').value,
            location: document.getElementById('prof-location').value
        };

        try {
            const response = await fetch('/api/user', {
                method: 'PUT',
                headers: await App.getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(updatedUser)
            });

            if (response.ok) {
                this.state.userData = await response.json();
                this.renderProfile();
                


                alert('Perfil atualizado com sucesso!');
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert('Erro ao salvar o perfil.');
        }
    }
};

// Initialize when view is shown
window.addEventListener('load', () => {
    // If showView('profile') is called, we should refresh data
    const originalShowView = App.showView;
    App.showView = function(viewName) {
        originalShowView.call(this, viewName);
        if (viewName === 'profile') {
            ProfileEngine.init();
        }
    };
});
