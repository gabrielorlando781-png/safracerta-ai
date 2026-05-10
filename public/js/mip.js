const MIPEngine = {
    stream: null,
    currentBlob: null,
    history: [],

    init() {
        this.loadHistory();
        this.populatePlots();
    },

    async populatePlots() {
        try {
            const response = await fetch('/api/plots', { headers: await App.getHeaders() });
            const plots = await response.json();
            const select = document.getElementById('mip-plot-id');
            if (select) {
                select.innerHTML = '<option value="">Selecione o talhão</option>' + 
                    plots.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
        } catch (err) {
            console.error("Error populating plots in MIP:", err);
        }
    },

    async loadHistory() {
        try {
            const response = await fetch('/api/mip/history', { headers: await App.getHeaders() });
            this.history = await response.json();
            this.renderHistory();
        } catch (err) {
            console.error("Error loading MIP history:", err);
        }
    },

    renderHistory() {
        const list = document.getElementById('mip-history-list');
        if (!list) return;

        if (this.history.length === 0) {
            list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #94a3b8;"><i class="fas fa-history" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i><p>Nenhum registro no histórico.</p></div>';
            list.className = '';
            return;
        }

        list.className = 'mip-history-grid';
        list.innerHTML = this.history.map(record => `
            <div class="mip-history-card" onclick="MIPEngine.viewRecord('${record.id}')">
                <div class="mip-delete-btn" onclick="event.stopPropagation(); MIPEngine.deleteRecord('${record.id}')" title="Excluir análise">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <img src="${record.image}" class="mip-history-img">
                <div class="mip-history-body">
                    <div class="mip-history-date">
                        <i class="far fa-calendar-alt"></i> ${new Date(record.date).toLocaleDateString()}
                    </div>
                    <h4 style="margin: 0; font-size: 15px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 8px;">
                        ${record.question || 'Análise Técnica'}
                    </h4>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${record.report.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </div>
                    <div style="margin-top: 12px; display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--primary);">
                        <i class="fas fa-check-circle"></i> Ver Laudo Completo
                    </div>
                </div>
            </div>
        `).join('');
    },

    viewRecord(id) {
        const record = this.history.find(r => r.id === id);
        if (!record) return;

        this.stopCamera();

        const results = document.getElementById('mip-results');
        const empty = document.getElementById('mip-empty-state');
        const content = document.getElementById('mip-report-content');
        const timestamp = document.getElementById('mip-timestamp');
        const preview = document.getElementById('mip-preview');
        const placeholder = document.getElementById('camera-placeholder');
        const video = document.getElementById('mip-video');

        empty.style.display = 'none';
        results.style.display = 'block';
        content.innerHTML = record.report;
        timestamp.innerText = `Gerado em ${new Date(record.date).toLocaleString()}`;
        
        preview.src = record.image;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        video.style.display = 'none';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async deleteRecord(id) {
        if (!confirm("Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.")) {
            return;
        }

        try {
            const response = await fetch(`/api/mip/history/${id}`, {
                method: 'DELETE',
                headers: await App.getHeaders()
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Refresh local history array and re-render
            this.history = this.history.filter(r => r.id !== id);
            this.renderHistory();

            // If the deleted record was being viewed, clear the view
            const results = document.getElementById('mip-results');
            if (results.style.display === 'block') {
                // We don't necessarily need to hide it unless we want to be strict
                // But for now, just refreshing history is fine
            }

        } catch (err) {
            console.error("Error deleting MIP record:", err);
            alert("Erro ao excluir registro: " + err.message);
        }
    },

    async toggleCamera() {
        const video = document.getElementById('mip-video');
        const container = document.getElementById('camera-placeholder');
        const preview = document.getElementById('mip-preview');

        if (this.stream) {
            this.stopCamera();
            video.style.display = 'none';
            container.style.display = 'block';
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = this.stream;
            video.style.display = 'block';
            container.style.display = 'none';
            preview.style.display = 'none';
        } catch (err) {
            console.error("Camera error:", err);
            alert("Não foi possível acessar a câmera.");
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.currentBlob = file;
        this.stopCamera();

        const preview = document.getElementById('mip-preview');
        const video = document.getElementById('mip-video');
        const container = document.getElementById('camera-placeholder');

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            video.style.display = 'none';
            container.style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    async capturePhoto() {
        const video = document.getElementById('mip-video');
        if (!this.stream) return null;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        return new Promise(resolve => {
            canvas.toBlob(blob => {
                this.currentBlob = blob;
                resolve(blob);
            }, 'image/jpeg');
        });
    },

    async runAnalysis() {
        const loading = document.getElementById('mip-loading');
        const empty = document.getElementById('mip-empty-state');
        const results = document.getElementById('mip-results');
        const content = document.getElementById('mip-report-content');
        const question = document.getElementById('mip-question').value;
        const plotId = document.getElementById('mip-plot-id').value;

        if (this.stream && !this.currentBlob) {
            await this.capturePhoto();
            const preview = document.getElementById('mip-preview');
            const video = document.getElementById('mip-video');
            preview.src = URL.createObjectURL(this.currentBlob);
            preview.style.display = 'block';
            video.style.display = 'none';
            this.stopCamera();
        }

        if (!this.currentBlob) {
            alert("Por favor, selecione uma foto ou use a câmera.");
            return;
        }

        empty.style.display = 'none';
        results.style.display = 'none';
        loading.style.display = 'block';

        // Scroll to results area on mobile
        if (window.innerWidth < 768) {
            loading.scrollIntoView({ behavior: 'smooth' });
        }

        const formData = new FormData();
        formData.append('photo', this.currentBlob, 'mip-analysis.jpg');
        formData.append('question', question);
        formData.append('plotId', plotId);

        try {
            const response = await fetch('/api/mip/analyze', {
                method: 'POST',
                headers: await App.getHeaders(), // FormData
                body: formData
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            content.innerHTML = data.report;
            document.getElementById('mip-timestamp').innerText = `Gerado por IA em ${new Date().toLocaleString()}`;
            
            loading.style.display = 'none';
            results.style.display = 'block';

            this.loadHistory();
            this.currentBlob = null; 

        } catch (error) {
            console.error("Analysis error:", error);
            alert("Erro na análise: " + error.message);
            loading.style.display = 'none';
            empty.style.display = 'block';
        }
    },



    async analyzeTrends() {
        const results = document.getElementById('mip-results');
        const empty = document.getElementById('mip-empty-state');
        const content = document.getElementById('mip-report-content');
        const loading = document.getElementById('mip-loading');

        empty.style.display = 'none';
        results.style.display = 'none';
        loading.style.display = 'block';

        try {
            const response = await fetch('/api/mip/trend-analysis', { 
                method: 'POST',
                headers: await App.getHeaders()
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            content.innerHTML = data.report;
            document.getElementById('mip-timestamp').innerText = `Análise de Tendência IA em ${new Date().toLocaleString()}`;
            
            loading.style.display = 'none';
            results.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            alert("Erro na análise de tendências: " + error.message);
            loading.style.display = 'none';
            empty.style.display = 'block';
        }
    }
};

window.MIPEngine = MIPEngine;
MIPEngine.init();
