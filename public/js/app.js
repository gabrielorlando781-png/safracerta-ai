/**
 * SafraCerta.ai - Main Application Logic
 */

const App = {
    state: {
        view: 'dashboard',
        isRecording: false,
        isOnline: navigator.onLine,
        activities: [],
        dashboardData: { totalRevenue: 0, totalExpenses: 0, profit: 0 },
        charts: {},
        map: null,
        drawnItems: null,
        currentDrawing: null
    },

    async getHeaders(customHeaders = {}) {
        const headers = { ...customHeaders };
        if (window.Auth && Auth.client) {
            const { data: { session } } = await Auth.client.auth.getSession();
            if (session) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        return headers;
    },

    escapeHTML(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    async init() {
        await this.loadConfig();
        this.bindEvents();
        this.loadData();
        if (window.ProfileEngine) ProfileEngine.loadProfile();
        this.setupServiceWorker();
        this.updateNetworkStatus();
        this.updateAgroIntelligence();

        // Listen for online/offline events
        window.addEventListener('online', () => this.updateNetworkStatus(true));
        window.addEventListener('offline', () => this.updateNetworkStatus(false));
    },

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                window.SAFRA_CONFIG = await response.json();
            }
        } catch (e) {
            console.error("Error loading config:", e);
        }
    },

    bindEvents() {
        const btnVoice = document.getElementById('btn-voice');
        const btnCloseVoice = document.getElementById('btn-close-voice');
        if (btnVoice) btnVoice.onclick = () => this.toggleVoiceModal(true);
        if (btnCloseVoice) btnCloseVoice.onclick = () => this.toggleVoiceModal(false);

        const btnAdd = document.getElementById('btn-add');
        const btnOpenMachine = document.getElementById('btn-open-machine-modal');
        const btnOpenPlot = document.getElementById('btn-open-plot-modal');
        const machineForm = document.getElementById('machine-form');
        const machineActionForm = document.getElementById('machine-action-form');
        const plotForm = document.getElementById('plot-form');
        const plotActionForm = document.getElementById('plot-action-form');
        
        if (btnAdd) {
            btnAdd.onclick = () => {
                const cmd = prompt("O que você deseja registrar? (Ex: Gastei 100 com diesel)");
                if (cmd) this.processCommand(cmd);
            };
        }

        if (btnOpenMachine) {
            btnOpenMachine.onclick = () => {
                document.getElementById('machine-modal-title').innerText = 'Novo Maquinário';
                document.getElementById('m-id').value = '';
                document.getElementById('machine-form').reset();
                document.getElementById('machine-modal').style.display = 'flex';
            };
        }

        if (btnOpenPlot) {
            btnOpenPlot.onclick = () => {
                document.getElementById('plot-modal-title').innerText = 'Novo Talhão';
                document.getElementById('p-id').value = '';
                document.getElementById('plot-form').reset();
                document.getElementById('plot-modal').style.display = 'flex';
            };
        }

        // Close dropdowns on click outside
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.machine-menu-container')) {
                document.querySelectorAll('.machine-dropdown').forEach(d => d.classList.remove('show'));
            }
        });

        if (machineForm) machineForm.onsubmit = (e) => this.handleAddMachine(e);
        if (machineActionForm) machineActionForm.onsubmit = (e) => this.handleMachineAction(e);
        if (plotForm) plotForm.onsubmit = (e) => this.handleAddPlot(e);
        if (plotActionForm) plotActionForm.onsubmit = (e) => this.handlePlotAction(e);

        const generalEventForm = document.getElementById('general-event-form');
        if (generalEventForm) generalEventForm.onsubmit = (e) => this.handleGeneralEvent(e);

        const tabManual = document.getElementById('tab-manual');
        const tabVoice = document.getElementById('tab-voice');
        if (tabManual) {
            tabManual.onclick = () => {
                tabManual.classList.add('active');
                tabManual.style.background = '#fff';
                tabManual.style.color = 'var(--text)';
                tabVoice.classList.remove('active');
                tabVoice.style.background = 'transparent';
                tabVoice.style.color = '#666';
                document.getElementById('register-manual-form').classList.remove('hidden');
                document.getElementById('register-voice-ui').classList.add('hidden');
            };
        }
        if (tabVoice) {
            tabVoice.onclick = () => {
                tabVoice.classList.add('active');
                tabVoice.style.background = '#fff';
                tabVoice.style.color = 'var(--text)';
                tabManual.classList.remove('active');
                tabManual.style.background = 'transparent';
                tabManual.style.color = '#666';
                document.getElementById('register-voice-ui').classList.remove('hidden');
                document.getElementById('register-manual-form').classList.add('hidden');
            };
        }

        const btnVoiceReg = document.getElementById('btn-voice-reg');
        if (btnVoiceReg) {
            btnVoiceReg.onclick = () => this.toggleVoiceReg();
        }

        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (sidebarToggle) {
            sidebarToggle.onclick = (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('open');
            };
        }

        // Close sidebar when clicking links or outside
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.addEventListener('click', () => sidebar.classList.remove('open'));
        });

        window.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    },

    openActionModal(machineId, type) {
        const modal = document.getElementById('machine-action-modal');
        const title = document.getElementById('action-modal-title');
        const label = document.getElementById('label-value');
        const costGroup = document.getElementById('group-cost');
        
        document.getElementById('action-m-id').value = machineId;
        document.getElementById('action-type').value = type;
        document.getElementById('machine-action-form').reset();
        
        costGroup.classList.add('hidden');
        
        if (type === 'usage') {
            title.innerText = 'Registrar Uso';
            label.innerText = 'Horas Trabalhadas';
        } else if (type === 'fuel') {
            title.innerText = 'Registrar Abastecimento';
            label.innerText = 'Litros (L)';
            costGroup.classList.remove('hidden');
        } else if (type === 'maintenance') {
            title.innerText = 'Registrar Manutenção';
            label.innerText = 'Horas na Revisão';
            costGroup.classList.remove('hidden');
        }
        
        modal.style.display = 'flex';
    },

    async handleMachineAction(e) {
        e.preventDefault();
        const id = document.getElementById('action-m-id').value;
        const type = document.getElementById('action-type').value;
        const value = document.getElementById('action-value').value;
        const cost = document.getElementById('action-cost').value || 0;

        try {
            const response = await fetch(`/api/machinery/${id}/action`, {
                method: 'POST',
                headers: await this.getHeaders(),
                body: JSON.stringify({ type, value, cost })
            });

            if (response.ok) {
                document.getElementById('machine-action-modal').style.display = 'none';
                this.loadMachinery();
            }
        } catch (e) {
            console.error("Error updating machine action:", e);
        }
    },

    async loadData() {
        try {
            const response = await fetch('/api/dashboard', { headers: await this.getHeaders() });
            if (response.ok) {
                this.state.dashboardData = await response.json();
                this.renderDashboard();
            }
        } catch (e) {
            console.log("Offline mode: Loading from cache");
            this.loadFromLocal();
        }
    },

    renderDashboard() {
        const { profit, totalExpenses, recentActivities } = this.state.dashboardData;
        
        const dashProfit = document.getElementById('dash-profit');
        const dashExpenses = document.getElementById('dash-expenses');
        
        if (dashProfit) dashProfit.innerText = `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (dashExpenses) dashExpenses.innerText = `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        const list = document.getElementById('recent-list');
        if (!list) return;
        list.innerHTML = '';

        if (recentActivities && recentActivities.length > 0) {
            recentActivities.forEach(act => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.style.borderLeft = `4px solid ${act.type === 'expense' ? 'var(--danger)' : 'var(--success)'}`;
                item.innerHTML = `
                    <div class="history-info">
                        <h4>${this.escapeHTML(act.category.charAt(0).toUpperCase() + act.category.slice(1))}</h4>
                        <p>${this.escapeHTML(act.plot)} • ${new Date(act.timestamp).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="history-value ${act.type === 'expense' ? 'value-expense' : 'value-revenue'}">
                        ${act.type === 'expense' ? '-' : '+'} R$ ${act.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                `;
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<div class="recent-empty">Nenhuma atividade recente registrada.</div>';
        }
    },

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
        // Show target view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) targetView.classList.remove('hidden');
        
        if (viewName === 'mip' && window.MIPEngine) {
            MIPEngine.init();
        }

        this.state.view = viewName;

        // Update active link in sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('onclick')?.includes(`'${viewName}'`)) {
                link.classList.add('active');
            }
        });

        // Update active link in bottom nav
        document.querySelectorAll('.nav-item').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('onclick')?.includes(`'${viewName}'`)) {
                link.classList.add('active');
            }
        });

        if (viewName === 'history') this.loadHistory();
        if (viewName === 'plots') this.loadPlots();
        if (viewName === 'machinery') this.loadMachinery();
        if (viewName === 'register') this.setupRegisterView();
        if (viewName === 'finance') this.loadFinance();
        if (viewName === 'analysis') this.loadAnalysis();
        if (viewName === 'map') {
            setTimeout(() => this.initMap(), 100);
        }

        if (viewName === 'satellite') {
            // Optional: Any specific logic when entering satellite view
            console.log("Entering Satellite View");
        }
    },

    async loadAnalysis() {
        try {
            const response = await fetch('/api/analysis', { headers: await this.getHeaders() });
            const data = await response.json();
            const { yieldProjection, resourceEfficiency, mipTrends, soilMoisture, summary } = data;

            // Render Summary Cards
            document.getElementById('ana-yield-est').innerText = summary.yieldEst;
            document.getElementById('ana-health-index').innerText = summary.healthIndex;
            document.getElementById('ana-harvest-window').innerText = summary.harvestWindow;

            this.renderAnalysisCharts(data);
        } catch (e) {
            console.error("Error loading analysis data:", e);
        }
    },

    renderAnalysisCharts(data) {
        const { yieldProjection, resourceEfficiency, mipTrends } = data;

        // Cleanup existing charts
        Object.values(this.state.charts).forEach(chart => chart.destroy());
        this.state.charts = {};

        // 1. Yield Projection Chart
        const ctxYield = document.getElementById('chart-yield-proj').getContext('2d');
        this.state.charts.yield = new Chart(ctxYield, {
            type: 'bar',
            data: {
                labels: yieldProjection.map(p => p.name),
                datasets: [
                    {
                        label: 'Safra Atual (Est.)',
                        data: yieldProjection.map(p => p.current),
                        backgroundColor: '#27ae60',
                        borderRadius: 6
                    },
                    {
                        label: 'Média Histórica',
                        data: yieldProjection.map(p => p.historical),
                        backgroundColor: '#f1f1f1',
                        borderRadius: 6
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f8f8f8' },
                        title: { display: true, text: 'Sacos por Hectare' }
                    },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'top', align: 'end' } }
            }
        });

        // 2. Resource Efficiency Chart
        const ctxRes = document.getElementById('chart-resource-efficiency').getContext('2d');
        this.state.charts.res = new Chart(ctxRes, {
            type: 'bar',
            data: {
                labels: resourceEfficiency.map(p => p.name),
                datasets: [{
                    label: 'Diesel (L/ha)',
                    data: resourceEfficiency.map(p => p.fuelPerHa),
                    backgroundColor: '#3498db',
                    borderRadius: 6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f8f8f8' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // 3. MIP Trends Chart
        const ctxMip = document.getElementById('chart-mip-trends').getContext('2d');
        this.state.charts.mip = new Chart(ctxMip, {
            type: 'line',
            data: {
                labels: mipTrends.map(m => m.month),
                datasets: [{
                    label: 'Nível de Pragas',
                    data: mipTrends.map(m => m.value),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#e74c3c'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f8f8f8' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    async loadFinance() {
        try {
            const response = await fetch('/api/finance', { headers: await this.getHeaders() });
            const data = await response.json();
            const { stats, distribution, plotComparison, cashFlow } = data;

            // Render Stats
            const revenue = stats.totalRevenue || 0;
            const costs = stats.totalExpenses || 0;
            const balance = revenue - costs;

            document.getElementById('fin-total-revenue').innerText = `R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            document.getElementById('fin-total-costs').innerText = `R$ ${costs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            
            const balanceEl = document.getElementById('fin-balance');
            balanceEl.innerText = `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            balanceEl.style.color = balance >= 0 ? '#27ae60' : '#e74c3c';

            document.getElementById('fin-avg-cost-ha').innerText = `R$ ${stats.avgCostHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

            this.renderFinanceCharts(data);
        } catch (e) {
            console.error("Error loading finance data:", e);
        }
    },

    renderFinanceCharts(data) {
        const { distribution, plotComparison, cashFlow } = data;

        // Cleanup existing charts
        Object.values(this.state.charts).forEach(chart => chart.destroy());
        this.state.charts = {};

        // 1. Cash Flow Chart (Bar Chart as in screenshot)
        const ctxFlow = document.getElementById('chart-cash-flow').getContext('2d');
        this.state.charts.flow = new Chart(ctxFlow, {
            type: 'bar',
            data: {
                labels: cashFlow.map(c => c.month),
                datasets: [
                    {
                        label: 'Custos',
                        data: cashFlow.map(c => c.expenses),
                        backgroundColor: '#ff4d4d', // Red as in screenshot
                        borderRadius: 5
                    },
                    {
                        label: 'Receita',
                        data: cashFlow.map(c => c.revenue),
                        backgroundColor: '#27ae60',
                        borderRadius: 5
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$' + (value / 1000).toFixed(2) + 'k';
                            }
                        },
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // 2. Cost Distribution Chart
        const ctxDist = document.getElementById('chart-cost-dist').getContext('2d');
        this.state.charts.dist = new Chart(ctxDist, {
            type: 'doughnut',
            data: {
                labels: Object.keys(distribution),
                datasets: [{
                    data: Object.values(distribution),
                    backgroundColor: ['#3498db', '#e67e22', '#9b59b6', '#1abc9c', '#f1c40f', '#e74c3c']
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        // 3. Plot Comparison Chart
        const ctxComp = document.getElementById('chart-plot-comparison').getContext('2d');
        this.state.charts.comp = new Chart(ctxComp, {
            type: 'bar',
            data: {
                labels: plotComparison.map(p => p.name),
                datasets: [{
                    label: 'Custo por Talhão',
                    data: plotComparison.map(p => p.cost),
                    backgroundColor: '#3498db',
                    borderRadius: 5
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },

        try {
            // Populate Plots
            const pRes = await fetch('/api/plots', { headers: await this.getHeaders() });
            const plots = await pRes.json();
            const plotSelect = document.getElementById('reg-plot');
            if (plotSelect) {
                plotSelect.innerHTML = '<option value="">Selecione o talhão</option>' + 
                    plots.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }

            // Populate Machinery
            const mRes = await fetch('/api/machinery', { headers: await this.getHeaders() });
            const machines = await mRes.json();
            const machineSelect = document.getElementById('reg-machine');
            if (machineSelect) {
                machineSelect.innerHTML = '<option value="">Nenhum</option>' + 
                    machines.map(m => `<option value="${m.id}">${m.name} (${m.model})</option>`).join('');
            }

            // Set default date to today
            const dateInput = document.getElementById('reg-date');
            if (dateInput) dateInput.valueAsDate = new Date();
        } catch (e) {
            console.error("Error setting up register view:", e);
        }
    },

    async loadMachinery() {
        try {
            const response = await fetch('/api/machinery', { headers: await this.getHeaders() });
            const machines = await response.json();
            const list = document.getElementById('machinery-list');
            if (!list) return;

            if (machines.length === 0) {
                list.innerHTML = '<div class="recent-empty">Você ainda não tem maquinário cadastrado.</div>';
                return;
            }

            list.innerHTML = machines.map(m => `
                <div class="plot-card clickable-card" onclick="showMachineDetails('${m.id}')">
                    <div class="plot-card-header">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div class="machine-icon-circle" style="${m.photo ? `background-image: url('${m.photo}'); background-size: cover; background-position: center; border: none;` : ''}">
                                ${m.photo ? '' : '<i class="fas fa-wrench"></i>'}
                            </div>
                            <div>
                                <h3 style="margin: 0;">${m.name}</h3>
                                <p style="font-size: 11px; color: #999; margin: 0;">
                                    ${m.type} • Modelo: ${m.model} • Ano: ${m.year}
                                </p>
                                <span class="machine-status-badge">Em Operação</span>
                            </div>
                        </div>
                        <div class="machine-menu-container">
                            <i class="fas fa-ellipsis-h" style="color: #ccc; cursor: pointer; padding: 5px;" onclick="event.stopPropagation(); toggleMachineMenu('${m.id}')"></i>
                            <div class="machine-dropdown" id="dropdown-${m.id}">
                                <div class="dropdown-item" onclick="event.stopPropagation(); editMachine('${m.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </div>
                                <div class="dropdown-item delete" onclick="event.stopPropagation(); deleteMachine('${m.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="machine-card-stats">
                        <div class="machine-stat-box">
                            <i class="fas fa-clock"></i>
                            <div class="machine-stat-info">
                                <label>Horas de Uso</label>
                                <div class="value">${m.hours} h</div>
                            </div>
                        </div>
                        <div class="machine-stat-box">
                            <i class="fas fa-dollar-sign"></i>
                            <div class="machine-stat-info">
                                <label>Custo Manutenção</label>
                                <div class="value">R$ ${m.maintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                        <div class="machine-stat-box">
                            <i class="fas fa-tint"></i>
                            <div class="machine-stat-info">
                                <label>Consumo Médio</label>
                                <div class="value">${m.avgConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L/h</div>
                            </div>
                        </div>
                        <div class="machine-stat-box">
                            <i class="fas fa-tools"></i>
                            <div class="machine-stat-info">
                                <label>Próxima Manutenção</label>
                                <div class="value">${m.nextMaintenance}</div>
                            </div>
                        </div>
                    </div>

                    <div class="machine-card-actions">
                        <button class="action-btn" onclick="event.stopPropagation(); openActionModal('${m.id}', 'usage')">
                            <i class="fas fa-hourglass-start"></i> Uso
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); openActionModal('${m.id}', 'fuel')">
                            <i class="fas fa-gas-pump"></i> Abastecer
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); openActionModal('${m.id}', 'maintenance')">
                            <i class="fas fa-tools"></i> Revisão
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Error loading machinery:", e);
        }
    },

    async showMachineDetails(machineId) {
        try {
            const response = await fetch('/api/machinery');
            const machines = await response.json();
            const machine = machines.find(m => m.id === machineId);
            
            if (!machine) return;

            // Fill basic info
            document.getElementById('detail-m-name').innerText = machine.name;
            document.getElementById('detail-m-info').innerText = `${machine.type} • ${machine.model} • ${machine.year}`;
            
            // Set photo
            const detailIcon = document.querySelector('#view-machine-details .machine-icon-circle');
            if (machine.photo) {
                detailIcon.style.backgroundImage = `url('${machine.photo}')`;
                detailIcon.style.backgroundSize = 'cover';
                detailIcon.style.backgroundPosition = 'center';
                detailIcon.innerHTML = '';
            } else {
                detailIcon.style.backgroundImage = 'none';
                detailIcon.innerHTML = '<i class="fas fa-tractor"></i>';
            }

            // Fill stats
            document.getElementById('detail-m-hours').innerText = machine.hours;
            document.getElementById('detail-m-fuel').innerText = machine.totalFuel || 0;
            document.getElementById('detail-m-cost').innerText = `R$ ${machine.maintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            document.getElementById('detail-m-next').innerText = machine.nextMaintenance;

            // Render History
            const historyList = document.getElementById('machine-history-list');
            if (machine.history && machine.history.length > 0) {
                historyList.innerHTML = machine.history.slice().reverse().map(h => `
                    <div class="machine-history-item">
                        <div class="m-history-info">
                            <h4>${this.translateActionType(h.type)}</h4>
                            <p>${new Date(h.timestamp).toLocaleString('pt-BR')}</p>
                        </div>
                        <div style="text-align: right;">
                            <div class="m-history-badge badge-${h.type}">${h.value} ${h.type === 'fuel' ? 'L' : 'h'}</div>
                            ${h.cost > 0 ? `<div style="font-size: 11px; font-weight: 700; margin-top: 5px;">R$ ${h.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                historyList.innerHTML = '<div class="recent-empty">Nenhum histórico disponível para esta máquina.</div>';
            }

            this.showView('machine-details');
        } catch (e) {
            console.error("Error loading machine details:", e);
        }
    },

    translateActionType(type) {
        const translations = {
            'usage': 'Uso Operacional',
            'fuel': 'Abastecimento',
            'maintenance': 'Manutenção / Revisão'
        };
        return translations[type] || type;
    },

    async loadHistory() {
        try {
            const response = await fetch('/api/history', { headers: await this.getHeaders() });
            const data = await response.json();
            const list = document.getElementById('full-history-list');
            if (!list) return;
            
            if (data.length === 0) {
                list.innerHTML = '<div class="recent-empty">O seu histórico ainda está vazio.</div>';
                return;
            }

            list.innerHTML = data.map(act => `
                <div class="history-item" style="border-left: 4px solid ${act.type === 'expense' ? 'var(--danger)' : 'var(--success)'}">
                    <div class="history-info">
                        <h4>${this.escapeHTML(act.category.charAt(0).toUpperCase() + act.category.slice(1))}</h4>
                        <p>${this.escapeHTML(act.plot)} • ${new Date(act.timestamp).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="history-value ${act.type === 'expense' ? 'value-expense' : 'value-revenue'}">
                        R$ ${act.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Error loading history:", e);
        }
    },

    async handleAddMachine(e) {
        e.preventDefault();
        
        const mId = document.getElementById('m-id').value;
        const isEdit = !!mId;

        const formData = new FormData();
        formData.append('name', document.getElementById('m-name').value);
        formData.append('type', document.getElementById('m-type').value);
        formData.append('model', document.getElementById('m-model').value);
        formData.append('year', document.getElementById('m-year').value);
        formData.append('hours', document.getElementById('m-hours').value);
        
        const photoInput = document.getElementById('m-photo');
        if (photoInput.files.length > 0) {
            formData.append('photo', photoInput.files[0]);
        }

        try {
            const url = isEdit ? `/api/machinery/${mId}` : '/api/machinery';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: await this.getHeaders(), // FormData shouldn't have Content-Type set manually
                body: formData
            });

            if (response.ok) {
                document.getElementById('machine-modal').style.display = 'none';
                document.getElementById('machine-form').reset();
                this.loadMachinery();
            }
        } catch (e) {
            console.error("Error saving machine:", e);
        }
    },

    toggleMachineMenu(id) {
        document.querySelectorAll('.machine-dropdown').forEach(d => {
            if (d.id !== `dropdown-${id}`) d.classList.remove('show');
        });
        document.getElementById(`dropdown-${id}`).classList.toggle('show');
    },

    async editMachine(id) {
        try {
            const response = await fetch('/api/machinery', { headers: await this.getHeaders() });
            const machines = await response.json();
            const m = machines.find(item => item.id === id);
            
            if (!m) return;

            document.getElementById('m-id').value = m.id;
            document.getElementById('m-name').value = m.name;
            document.getElementById('m-type').value = m.type;
            document.getElementById('m-model').value = m.model;
            document.getElementById('m-year').value = m.year;
            document.getElementById('m-hours').value = m.hours;
            
            document.getElementById('machine-modal-title').innerText = 'Editar Maquinário';
            document.getElementById('machine-modal').style.display = 'flex';
            document.querySelectorAll('.machine-dropdown').forEach(d => d.classList.remove('show'));
        } catch (e) {
            console.error("Error loading machine for edit:", e);
        }
    },

    async deleteMachine(id) {
        if (!confirm("Tem certeza que deseja excluir este maquinário? Esta ação não pode ser desfeita.")) return;

        try {
            const response = await fetch(`/api/machinery/${id}`, {
                method: 'DELETE',
                headers: await this.getHeaders()
            });

            if (response.ok) {
                this.loadMachinery();
            }
        } catch (e) {
            console.error("Error deleting machine:", e);
        }
    },

    async loadPlots() {
        try {
            const response = await fetch('/api/plots', { headers: await this.getHeaders() });
            const plots = await response.json();
            const list = document.getElementById('plot-list');
            if (!list) return;

            list.innerHTML = plots.map(p => `
                <div class="plot-card clickable-card" onclick="showPlotDetails('${p.id}')">
                    <div class="plot-card-header">
                        <h3>${p.name}</h3>
                        <div class="machine-menu-container">
                            <i class="fas fa-ellipsis-h" style="color: #ccc; cursor: pointer; padding: 5px;" onclick="event.stopPropagation(); togglePlotMenu('${p.id}')"></i>
                            <div class="machine-dropdown" id="dropdown-plot-${p.id}">
                                <div class="dropdown-item" onclick="event.stopPropagation(); editPlot('${p.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </div>
                                <div class="dropdown-item delete" onclick="event.stopPropagation(); deletePlot('${p.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="plot-card-meta">
                        ${p.area} hectares • ${p.crop.charAt(0).toUpperCase() + p.crop.slice(1)} • Plantio: ${p.plantingDate ? new Date(p.plantingDate).toLocaleDateString('pt-BR') : '--/--/--'}
                    </div>
                    <div class="plot-stats-grid">
                        <div class="plot-stat-item">
                            <div class="stat-icon-box"><i class="fas fa-dollar-sign"></i></div>
                            <div class="stat-content">
                                <label>Total Gasto</label>
                                <div class="val expense">R$ ${(p.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                        <div class="plot-stat-item">
                            <div class="stat-icon-box"><i class="fas fa-seedling"></i></div>
                            <div class="stat-content">
                                <label>Produção</label>
                                <div class="val">${p.production || 0} <span style="font-size: 10px; font-weight: 500; color: #999;">un</span></div>
                            </div>
                        </div>
                        <div class="plot-stat-item">
                            <div class="stat-icon-box"><i class="fas fa-chart-line"></i></div>
                            <div class="stat-content">
                                <label>Custo / un</label>
                                <div class="val expense">R$ ${(p.production > 0 ? (p.expenses / p.production) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                        <div class="plot-stat-item">
                            <div class="stat-icon-box"><i class="fas fa-tractor"></i></div>
                            <div class="stat-content">
                                <label>Produtividade</label>
                                <div class="val">${(p.production / p.area).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span style="font-size: 10px; font-weight: 500; color: #999;">un/ha</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Error loading plots:", e);
        }
    },

    async handleAddPlot(e) {
        e.preventDefault();
        const pId = document.getElementById('p-id').value;
        const isEdit = !!pId;

        const data = {
            name: document.getElementById('p-name').value,
            area: parseFloat(document.getElementById('p-area').value),
            crop: document.getElementById('p-crop').value,
            details: document.getElementById('p-details').value,
            plantingDate: document.getElementById('p-planting-date').value
        };

        try {
            const url = isEdit ? `/api/plots/${pId}` : '/api/plots';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(data)
            });

            if (response.ok) {
                document.getElementById('plot-modal').style.display = 'none';
                document.getElementById('plot-form').reset();
                this.loadPlots();
                if (isEdit) {
                    this.showPlotDetails(pId);
                }
            }
        } catch (e) {
            console.error("Error saving plot:", e);
        }
    },

    togglePlotMenu(id) {
        document.querySelectorAll('.machine-dropdown').forEach(d => {
            if (d.id !== `dropdown-plot-${id}`) d.classList.remove('show');
        });
        document.getElementById(`dropdown-plot-${id}`).classList.toggle('show');
    },

    async editPlot(id) {
        try {
            const response = await fetch('/api/plots', { headers: await this.getHeaders() });
            const plots = await response.json();
            const p = plots.find(item => item.id === id);
            
            if (!p) return;

            document.getElementById('p-id').value = p.id;
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-area').value = p.area;
            document.getElementById('p-crop').value = p.crop;
            document.getElementById('p-details').value = p.details || '';
            document.getElementById('p-planting-date').value = p.plantingDate || '';
            
            document.getElementById('plot-modal-title').innerText = 'Editar Talhão';
            document.getElementById('plot-modal').style.display = 'flex';
            document.querySelectorAll('.machine-dropdown').forEach(d => d.classList.remove('show'));
        } catch (e) {
            console.error("Error loading plot for edit:", e);
        }
    },

    async deletePlot(id) {
        if (!confirm("Tem certeza que deseja excluir este talhão? Esta ação não pode ser desfeita.")) return;

        try {
            const response = await fetch(`/api/plots/${id}`, {
                method: 'DELETE',
                headers: await this.getHeaders()
            });

            if (response.ok) {
                this.loadPlots();
            }
        } catch (e) {
            console.error("Error deleting plot:", e);
        }
    },

    async showPlotDetails(id) {
        try {
            const response = await fetch('/api/plots', { headers: await this.getHeaders() });
            const plots = await response.json();
            const p = plots.find(item => item.id === id);
            
            if (!p) return;

            this.activePlotId = id;
            window.activePlotId = id;
            
            document.getElementById('detail-p-name').innerText = p.name;
            const pDate = p.plantingDate ? new Date(p.plantingDate).toLocaleDateString('pt-BR') : 'Não informada';
            document.getElementById('detail-p-info').innerText = `${p.area} hectares • ${p.crop} • ${p.details || 'Sem variedade'} • Plantado em: ${pDate}`;
            document.getElementById('detail-p-expenses').innerText = `R$ ${(p.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            document.getElementById('detail-p-production').innerText = p.production || 0;
            
            const productivity = p.area > 0 ? (p.production / p.area) : 0;
            document.getElementById('detail-p-productivity').innerText = productivity.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            
            const costPerUnit = p.production > 0 ? (p.expenses / p.production) : 0;
            document.getElementById('detail-p-cost-per-unit').innerText = `R$ ${costPerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

            // Render History
            const historyList = document.getElementById('plot-history-list');
            if (p.history && p.history.length > 0) {
                historyList.innerHTML = p.history.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(h => `
                    <div class="history-item">
                        <div class="history-icon ${h.type}">
                            <i class="fas ${this.getPlotIcon(h.type)}"></i>
                        </div>
                        <div class="history-info">
                            <div class="history-main">
                                <strong>${this.getPlotActionLabel(h.type)}</strong>
                                <span>${h.value} ${this.getPlotUnit(h.type)}</span>
                            </div>
                            <div class="history-meta">
                                ${new Date(h.timestamp).toLocaleDateString('pt-BR')} • Custo: R$ ${h.cost.toLocaleString('pt-BR')}
                            </div>
                            ${h.notes ? `<div class="history-notes">${h.notes}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                historyList.innerHTML = '<div class="recent-empty">Nenhum histórico disponível para este talhão.</div>';
            }

            this.showView('plot-details');
        } catch (e) {
            console.error("Error showing plot details:", e);
        }
    },

    getPlotIcon(type) {
        const icons = {
            'plantio': 'fa-seedling',
            'adubacao': 'fa-vial',
            'pulverizacao': 'fa-spray-can',
            'colheita': 'fa-tractor'
        };
        return icons[type] || 'fa-tasks';
    },

    getPlotActionLabel(type) {
        const labels = {
            'plantio': 'Plantio Realizado',
            'adubacao': 'Adubação Aplicada',
            'pulverizacao': 'Pulverização Realizada',
            'colheita': 'Colheita Realizada'
        };
        return labels[type] || 'Ação Registrada';
    },

    getPlotUnit(type) {
        return type === 'colheita' ? 'un' : 'dose/un';
    },

    openPlotActionModal(type) {
        const labels = {
            'plantio': 'Plantio (Sementes)',
            'adubacao': 'Adubação (Kg/L)',
            'pulverizacao': 'Pulverização (L)',
            'colheita': 'Colheita (Sacas/Kg)'
        };
        
        document.getElementById('plot-action-p-id').value = this.activePlotId;
        document.getElementById('plot-action-type').value = type;
        document.getElementById('plot-action-title').innerText = `Registrar ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        document.getElementById('plot-label-value').innerText = labels[type] || 'Quantidade';
        
        document.getElementById('plot-action-form').reset();
        document.getElementById('plot-action-modal').style.display = 'flex';
    },

    async handlePlotAction(e) {
        e.preventDefault();
        const id = document.getElementById('plot-action-p-id').value;
        const data = {
            type: document.getElementById('plot-action-type').value,
            value: document.getElementById('plot-action-value').value,
            cost: document.getElementById('plot-action-cost').value,
            notes: document.getElementById('plot-action-notes').value
        };

        try {
            const response = await fetch(`/api/plots/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                document.getElementById('plot-action-modal').style.display = 'none';
                this.showPlotDetails(id);
                this.loadData(); // Refresh dashboard stats
            }
        } catch (e) {
            console.error("Error saving plot action:", e);
        }
    },

    async handleGeneralEvent(e) {
        e.preventDefault();
        const data = {
            plotId: document.getElementById('reg-plot').value,
            type: document.getElementById('reg-type').value,
            date: document.getElementById('reg-date').value,
            machineId: document.getElementById('reg-machine').value,
            notes: document.getElementById('reg-notes').value
        };

        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert("Evento registrado com sucesso!");
                document.getElementById('general-event-form').reset();
                this.showView('dashboard');
            }
        } catch (e) {
            console.error("Error recording general event:", e);
        }
    },

    toggleVoiceReg() {
        const isRecording = this.state.isRecording;
        if (!isRecording) {
            this.startVoiceReg();
        } else {
            this.stopVoiceReg();
        }
    },

    startVoiceReg() {
        this.state.isRecording = true;
        document.getElementById('voice-wave-reg').classList.add('active');
        document.getElementById('voice-status-reg').innerText = "Ouvindo...";
        document.getElementById('btn-voice-reg').style.background = 'var(--danger)';
        
        // Mock recognition
        setTimeout(() => {
            if (this.state.isRecording) {
                this.stopVoiceReg("Plantio de soja realizado no talhão sede");
            }
        }, 3000);
    },

    stopVoiceReg(mockResult) {
        this.state.isRecording = false;
        document.getElementById('voice-wave-reg').classList.remove('active');
        document.getElementById('voice-status-reg').innerText = "Aperte para falar";
        document.getElementById('btn-voice-reg').style.background = 'var(--primary)';
        
        if (mockResult) {
            this.processCommand(mockResult);
        }
    },

    // Voice Interaction Engine
    toggleVoiceModal(show) {
        const modal = document.getElementById('voice-modal');
        modal.style.display = show ? 'flex' : 'none';
        
        if (show) {
            this.startVoiceRecognition();
        } else {
            this.stopVoiceRecognition();
        }
    },

    startVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voz não suportada neste navegador.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('voice-transcript').innerText = transcript;
            
            if (event.results[0].isFinal) {
                setTimeout(() => {
                    this.processCommand(transcript);
                    this.toggleVoiceModal(false);
                }, 1000);
            }
        };

        recognition.onerror = (e) => {
            console.error("Voice Error:", e);
            this.toggleVoiceModal(false);
        };

        recognition.start();
        this.recognition = recognition;
    },

    stopVoiceRecognition() {
        if (this.recognition) this.recognition.stop();
    },

    async processCommand(text) {
        const parsed = NLPEngine.parse(text);
        
        // Visual feedback
        console.log("Parsed Command:", parsed);
        
        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed)
            });
            
            if (response.ok) {
                this.loadData();
            } else {
                this.saveToLocal(parsed);
            }
        } catch (e) {
            this.saveToLocal(parsed);
        }
    },

    // Offline / Local Storage
    saveToLocal(data) {
        const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
        queue.push(data);
        localStorage.setItem('sync_queue', JSON.stringify(queue));
        alert("Salvo offline. Será sincronizado quando houver internet.");
    },

    async syncOfflineData() {
        const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
        if (queue.length === 0) return;

        console.log("Syncing offline data...");
        for (const item of queue) {
            await fetch('/api/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }
        localStorage.removeItem('sync_queue');
        this.loadData();
    },

    updateNetworkStatus(online) {
        this.state.isOnline = online;
        if (online) this.syncOfflineData();
    },

    setupServiceWorker() {
        // For PWA support
        if ('serviceWorker' in navigator) {
            console.log("Service Worker ready for PWA");
        }
    },

    // Mapping Logic
    initMap() {
        if (this.state.map) {
            this.state.map.invalidateSize();
            return;
        }

        // Initialize Map
        const map = L.map('map-main').setView([-23.5505, -46.6333], 13); // Default to SP if no GPS
        this.state.map = map;

        // High Resolution Satellite - Primary System (Esri World Imagery)
        const satelliteHighRes = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community',
            maxZoom: 20
        });

        const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenTopoMap',
            maxZoom: 17
        });

        const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OSM'
        });

        // PlanetScope - Using User's Key (3m resolution)
        const planetKey = window.SAFRA_CONFIG?.PLANET_API_KEY;
        const planetScope = L.tileLayer(`https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_2024_01_visual/gmc/{z}/{x}/{y}.png?api_key=${planetKey}`, {
            attribution: 'PlanetScope Monitoring',
            maxZoom: 20
        });

        // Sentinel-2 Cloudless (Fallback/Overview)
        const sentinelCloudless = L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg', {
            attribution: 'Sentinel-2 ESA',
            maxZoom: 18
        });

        // Set Default
        satelliteHighRes.addTo(map);

        // Infestation Heatmap Simulation
        const infestationLayer = L.layerGroup();
        if (this.state.plots) {
            this.state.plots.forEach(plot => {
                if (plot.boundary) {
                    const coords = plot.boundary.coordinates[0][0];
                    const center = [coords[1], coords[0]];
                    const intensity = Math.random();
                    const color = intensity > 0.8 ? '#e74c3c' : (intensity > 0.5 ? '#f39c12' : '#3498db');
                    
                    L.circle(center, {
                        color: 'none',
                        fillColor: color,
                        fillOpacity: 0.5,
                        radius: 200 * intensity
                    }).addTo(infestationLayer);
                }
            });
        }

        // Layer Control
        const baseMaps = {
            "Satélite (Alta Res)": satelliteHighRes,
            "PlanetScope (Diário)": planetScope,
            "Sentinel-2": sentinelCloudless,
            "Relevo": terrain,
            "Ruas": streets
        };
        const overlays = {
            "Áreas de Risco": infestationLayer
        };
        L.control.layers(baseMaps, overlays, { collapsed: false }).addTo(map);

        // Render actual plots as interactive polygons
        this.plotsLayer = L.layerGroup().addTo(map);
        if (this.state.plots) {
            this.state.plots.forEach(plot => {
                if (plot.coords) {
                    const polygon = L.polygon(plot.coords, {
                        color: plot.health === 'critical' ? '#e74c3c' : '#27ae60',
                        fillColor: plot.health === 'critical' ? '#e74c3c' : '#27ae60',
                        fillOpacity: 0.3,
                        weight: 2,
                        plotData: plot
                    }).addTo(this.plotsLayer);

                    polygon.on('click', (e) => {
                        this.selectedPlotForExport = plot;
                        document.getElementById('btn-export-kml').style.display = 'block';
                        polygon.bindPopup(`<b>${plot.name}</b><br>Cultura: ${plot.crop}<br>Área: ${plot.area}ha`).openPopup();
                    });
                }
            });
        }

        // User Location Management
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    
                    // Center map
                    map.setView([lat, lng], 16);
                    
                    // Add producer marker
                    L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div class="pulse-marker"></div>',
                            iconSize: [20, 20]
                        })
                    }).addTo(map).bindPopup("Você está aqui");
                },
                err => console.warn("Geolocation error:", err),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }

        // Global Locate Function
        window.centerMapOnUser = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    this.state.map.flyTo([pos.coords.latitude, pos.coords.longitude], 17);
                }, null, { enableHighAccuracy: true });
            }
        };

        // Drawing Layer
        const drawnItems = new L.FeatureGroup();
        this.state.drawnItems = drawnItems;
        map.addLayer(drawnItems);

        // Drawing Controls
        const drawControl = new L.Control.Draw({
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    drawError: { color: '#e1e100', message: '<strong>Erro!<strong> Você não pode cruzar as linhas.' },
                    shapeOptions: { color: '#3498db' }
                },
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });
        map.addControl(drawControl);

        // Event: Polygon Created
        map.on(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;
            drawnItems.clearLayers(); // Only one at a time for new plots
            drawnItems.addLayer(layer);
            this.state.currentDrawing = layer.toGeoJSON();
            document.getElementById('btn-save-map').style.display = 'block';
        });

        map.on(L.Draw.Event.DELETED, () => {
            this.state.currentDrawing = null;
            document.getElementById('btn-save-map').style.display = 'none';
        });

        this.renderPlotsOnMap();
    },

    async renderPlotsOnMap(filterCrop = 'all') {
        if (!this.state.map) return;
        
        // Remove existing plot layers
        this.state.map.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                this.state.map.removeLayer(layer);
            }
        });

        try {
            const response = await fetch('/api/plots');
            const plots = await response.json();
            
            plots.forEach(plot => {
                if (plot.boundary && (filterCrop === 'all' || plot.crop.toLowerCase() === filterCrop.toLowerCase())) {
                    // Simulate health (NDVI) for visualization
                    const health = Math.random(); // 0 to 1
                    const color = health > 0.7 ? '#27ae60' : (health > 0.4 ? '#f1c40f' : '#e74c3c');
                    
                    const layer = L.geoJSON(plot.boundary, {
                        style: {
                            color: color,
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.4
                        }
                    }).addTo(this.state.map);
                    
                    layer.bindPopup(`
                        <div style="min-width: 150px;">
                            <strong style="font-size: 14px; display: block; margin-bottom: 5px;">${plot.name}</strong>
                            <div style="font-size: 12px; margin-bottom: 3px;"><strong>Cultura:</strong> ${plot.crop}</div>
                            <div style="font-size: 12px; margin-bottom: 3px;"><strong>Área:</strong> ${plot.area} ha</div>
                            <div style="font-size: 12px; color: ${color}; font-weight: bold;">
                                <i class="fas fa-leaf"></i> Saúde (Simulada): ${Math.round(health * 100)}%
                            </div>
                            <button class="mini-action-btn" style="width: 100%; margin-top: 10px;" onclick="window.showPlotDetails('${plot.id}')">Ver Detalhes</button>
                        </div>
                    `);
                }
            });
        } catch (e) {
            console.error("Error rendering plots on map:", e);
        }
    },

    filterMapPlots() {
        const filter = document.getElementById('filter-map-crop').value;
        this.renderPlotsOnMap(filter);
    },

    async saveMappedPlot() {
        if (!this.state.currentDrawing) return;

        const name = prompt("Digite o nome deste novo talhão:");
        if (!name) return;

        const crop = prompt("Qual a cultura deste talhão? (Ex: soja, milho, cana)");
        if (!crop) return;

        // Calculate approximate area if possible (Leaflet.draw usually provides this, but let's keep it simple for now)
        // For production we would use @turf/area
        const area = prompt("Qual a área estimada (em hectares)?", "10");

        const plotData = {
            name,
            crop,
            area: parseFloat(area),
            boundary: this.state.currentDrawing
        };

        try {
            const response = await fetch('/api/plots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plotData)
            });

            if (response.ok) {
                alert("Talhão mapeado e salvo com sucesso!");
                this.state.drawnItems.clearLayers();
                this.state.currentDrawing = null;
                document.getElementById('btn-save-map').style.display = 'none';
                this.renderPlotsOnMap();
                this.loadPlots(); // Refresh the list view too
            }
        } catch (e) {
            console.error("Error saving mapped plot:", e);
        }
    },

    async updateAgroIntelligence() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=soil_temperature_0_to_7cm,soil_moisture_0_to_7cm&timezone=auto`);
                const data = await response.json();

                if (data.current) {
                    const tempElem = document.getElementById('weather-temp');
                    const descElem = document.getElementById('weather-desc');
                    if (tempElem) tempElem.textContent = `${Math.round(data.current.temperature_2m)}°C`;
                    if (descElem) descElem.textContent = this.getWeatherDesc(data.current.weather_code);
                }

                if (data.hourly) {
                    const latestSoilTemp = data.hourly.soil_temperature_0_to_7cm[0];
                    const latestSoilMoisture = data.hourly.soil_moisture_0_to_7cm[0];
                    const soilTempElem = document.getElementById('soil-temp');
                    const soilMoistElem = document.getElementById('soil-moisture');
                    if (soilTempElem) soilTempElem.textContent = `${Math.round(latestSoilTemp)}°C`;
                    if (soilMoistElem) soilMoistElem.textContent = `${Math.round(latestSoilMoisture * 100)}%`;
                }
            } catch (error) {
                console.error("Error fetching agro data:", error);
            }
        });
    },

    getWeatherDesc(code) {
        const codes = {
            0: "Céu limpo",
            1: "Principalmente limpo",
            2: "Parcialmente nublado",
            3: "Encoberto",
            45: "Nevoeiro",
            48: "Nevoeiro com geada",
            51: "Drizal leve",
            61: "Chuva leve",
            71: "Neve leve",
            95: "Trovoada"
        };
        return codes[code] || "Tempo estável";
    },

    async searchLocation(query) {
        if (!query) return;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                this.state.map.flyTo([parseFloat(lat), parseFloat(lon)], 16);
            } else {
                alert("Localização não encontrada.");
            }
        } catch (e) {
            console.error("Error searching location:", e);
        }
    },

    startDrawing() {
        if (this.state.map) {
            // Find the polygon draw tool and activate it
            // Leaflet.draw tool activation
            new L.Draw.Polygon(this.state.map, {
                shapeOptions: { color: '#3498db' }
            }).enable();
        }
    },

    // Filter plots on map by name
    filterPlotsOnMap: function(query) {
        if (!this.plotsLayer) return;
        
        query = query.toLowerCase();
        let foundPlot = null;
        
        this.plotsLayer.eachLayer((layer) => {
            const plot = layer.options.plotData;
            if (plot) {
                const matches = plot.name.toLowerCase().includes(query);
                if (matches) {
                    layer.setStyle({ opacity: 1, fillOpacity: 0.4 });
                    if (!foundPlot && query.length > 2) foundPlot = layer;
                } else {
                    layer.setStyle({ opacity: 0.1, fillOpacity: 0.05 });
                }
            }
        });

        if (foundPlot) {
            this.state.map.fitBounds(foundPlot.getBounds());
            this.selectedPlotForExport = foundPlot.options.plotData;
            document.getElementById('btn-export-kml').style.display = 'block';
        }
    },

    // Export current plot as KML
    exportCurrentPlot: function() {
        const plot = this.selectedPlotForExport || (this.drawnItems && this.drawnItems.getLayers().length > 0 ? {
            name: "Novo_Talhao",
            coords: this.drawnItems.getLayers()[0].getLatLngs()[0]
        } : null);

        if (!plot) {
            alert("Selecione um talhão no mapa ou busque pelo nome para exportar.");
            return;
        }

        const kmlContent = this.generateKML(plot);
        const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plot.name.replace(/\s+/g, '_')}_coordenadas.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    generateKML: function(plot) {
        let coordsStr = "";
        const coords = Array.isArray(plot.coords[0]) ? plot.coords[0] : plot.coords;
        coords.forEach(p => {
            coordsStr += `${p.lng},${p.lat},0 `;
        });
        coordsStr += `${coords[0].lng},${coords[0].lat},0`;

        return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${plot.name}</name>
    <Style id="polyStyle">
      <LineStyle><color>ff00ff00</color><width>2</width></LineStyle>
      <PolyStyle><color>7f00ff00</color></PolyStyle>
    </Style>
    <Placemark>
      <name>${plot.name}</name>
      <styleUrl>#polyStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => App.init());

// Expose methods to global scope for HTML handlers
window.showView = (v) => App.showView(v);
window.toggleVoiceModal = (s) => App.toggleVoiceModal(s);
window.processCommand = (t) => App.processCommand(t);
window.openActionModal = (id, type) => App.openActionModal(id, type);
window.showMachineDetails = (id) => App.showMachineDetails(id);
window.toggleMachineMenu = (id) => App.toggleMachineMenu(id);
window.editMachine = (id) => App.editMachine(id);
window.deleteMachine = (id) => App.deleteMachine(id);
window.togglePlotMenu = (id) => App.togglePlotMenu(id);
window.editPlot = (id) => App.editPlot(id);
window.deletePlot = (id) => App.deletePlot(id);
window.showPlotDetails = (id) => App.showPlotDetails(id);
window.openPlotActionModal = (type) => App.openPlotActionModal(type);
window.saveMappedPlot = () => App.saveMappedPlot();
window.filterMapPlots = () => App.filterMapPlots();
window.startDrawing = () => App.startDrawing();
window.searchLocation = (q) => App.searchLocation(q);
