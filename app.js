<<<<<<< HEAD
// PWA and Application State Management
class SurveyApp {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'loading';
        this.db = null;
        this.logs = [];
        this.isOffline = false;
        
        // Initial data from requirements
        this.initialNames = ["田中太郎", "佐藤花子", "山田次郎", "鈴木美咲", "高橋健太", "渡辺愛子", "伊藤翔太", "中村真美", "小林大輝", "加藤さくら"];
        this.grades = ["小1", "小2", "小3", "小4", "小5", "小6", "中1", "中2", "中3"];
        this.surveyQuestions = {
            camp: {
                label: "合宿について（ガード昼休み等）",
                type: "rating_with_text",
                options: ["とても楽しい", "楽しい", "普通", "つまらない"],
                textPrompt: "詳しく教えてください"
            },
            lifestyle: {
                label: "私生活について",
                type: "rating_with_text",
                options: ["とても頑張っている", "頑張っている", "普通", "あまり頑張れていない"],
                textPrompt: "どんなことを頑張っていますか"
            },
            improvement: {
                label: "頑張ってほしいこと（主体性等）",
                type: "rating_with_text",
                options: ["とても身についた", "身についた", "普通", "まだ身についていない"],
                textPrompt: "どのような場面で感じますか"
            }
        };
        this.userRoles = {
            super_admin: "スーパー管理者",
            admin: "管理者",
            editor: "編集者",
            viewer: "閲覧者"
        };
        
        this.init();
    }

    async init() {
        this.setupConsoleLogging();
        await this.initServiceWorker();
        await this.initIndexedDB();
        await this.loadSettings();
        this.setupEventListeners();
        this.checkAuthentication();
    }

    // Console logging for debugging
    setupConsoleLogging() {
        const originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console)
        };

        ['log', 'error', 'warn', 'info'].forEach(level => {
            console[level] = (...args) => {
                originalConsole[level](...args);
                this.logs.push({
                    timestamp: new Date().toISOString(),
                    level: level,
                    message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
                });
                
                if (this.logs.length > 1000) {
                    this.logs = this.logs.slice(-500);
                }
            };
        });
        
        console.info('Survey App initialized');
    }

    // Service Worker registration
    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const swCode = `
const CACHE_NAME = 'survey-app-v1';
const urlsToCache = [
  '/',
  '/style.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
                `;
                
                const blob = new Blob([swCode], { type: 'application/javascript' });
                const swUrl = URL.createObjectURL(blob);
                
                const registration = await navigator.serviceWorker.register(swUrl);
                console.info('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // IndexedDB initialization
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SurveyAppDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.info('IndexedDB initialized');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Surveys store
                if (!db.objectStoreNames.contains('surveys')) {
                    const surveyStore = db.createObjectStore('surveys', { keyPath: 'id', autoIncrement: true });
                    surveyStore.createIndex('name', 'name', { unique: false });
                    surveyStore.createIndex('grade', 'grade', { unique: false });
                    surveyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                }
                
                console.info('IndexedDB stores created');
            };
        });
    }

    // Load application settings
    async loadSettings() {
        try {
            const namesData = await this.getFromDB('settings', 'names');
            const questionsData = await this.getFromDB('settings', 'questions');
            
            if (!namesData) {
                await this.saveToDB('settings', { key: 'names', value: this.initialNames });
                console.info('Initial names saved to DB');
            } else {
                this.initialNames = namesData.value;
                console.info('Names loaded from DB:', this.initialNames);
            }
            
            if (!questionsData) {
                await this.saveToDB('settings', { key: 'questions', value: this.surveyQuestions });
                console.info('Initial questions saved to DB');
            } else {
                this.surveyQuestions = questionsData.value;
                console.info('Questions loaded from DB');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    // Database operations
    async getFromDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveToDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromDB(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Event listeners setup
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchScreen(e.target.dataset.screen);
            });
        });

        // Survey form
        document.getElementById('survey-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSurveySubmit();
        });

        // Preview button
        document.getElementById('preview-btn').addEventListener('click', () => {
            this.showPreview();
        });

        // Admin tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAdminTab(e.target.dataset.tab);
            });
        });

        // Name management
        document.getElementById('add-name-btn').addEventListener('click', () => {
            this.addName();
        });

        // Search and filter
        document.getElementById('search-input').addEventListener('input', () => {
            this.filterStudentCards();
        });

        document.getElementById('grade-filter').addEventListener('change', () => {
            this.filterStudentCards();
        });

        // Modal close buttons
        document.getElementById('close-preview').addEventListener('click', () => {
            this.hideModal('preview-modal');
        });

        document.getElementById('close-feedback').addEventListener('click', () => {
            this.hideModal('feedback-modal');
        });

        // Modal backdrop clicks
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // FAB
        document.getElementById('fab').addEventListener('click', () => {
            this.showModal('feedback-modal');
        });

        // Feedback form
        document.getElementById('feedback-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFeedbackSubmit();
        });

        // GitHub actions
        document.getElementById('backup-btn').addEventListener('click', () => {
            this.handleGitHubBackup();
        });

        document.getElementById('sync-btn').addEventListener('click', () => {
            this.handleGitHubSync();
        });

        // Log management
        document.getElementById('export-logs-btn').addEventListener('click', () => {
            this.exportLogs();
        });

        document.getElementById('clear-logs-btn').addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('log-filter').addEventListener('change', () => {
            this.filterLogs();
        });

        // Offline/online detection
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.showToast('オンラインに戻りました', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.showToast('オフラインモードになりました', 'info');
        });
        
        console.info('Event listeners set up');
    }

    // Authentication
    checkAuthentication() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showMainApp();
            } catch (error) {
                console.error('Failed to parse saved user:', error);
                this.showScreen('login');
            }
        } else {
            this.showScreen('login');
        }
    }

    handleLogin() {
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');
        
        // Simple password-based role assignment
        let role = null;
        if (password === 'super') role = 'super_admin';
        else if (password === 'admin') role = 'admin';
        else if (password === 'editor') role = 'editor';
        else if (password === 'viewer') role = 'viewer';
        
        if (role) {
            this.currentUser = { role, roleName: this.userRoles[role] };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            errorElement.classList.add('hidden');
            console.info('User logged in:', this.currentUser);
            this.showMainApp();
        } else {
            errorElement.classList.remove('hidden');
            console.warn('Invalid login attempt');
        }
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        console.info('User logged out');
        this.showScreen('login');
    }

    showMainApp() {
        document.getElementById('user-role').textContent = this.currentUser.roleName;
        document.getElementById('main-nav').classList.remove('hidden');
        document.getElementById('fab').classList.remove('hidden');
        
        // Initialize all components
        this.populateDropdowns();
        this.renderSurveyQuestions();
        this.switchScreen('dashboard');
    }

    // Screen management
    showScreen(screenName) {
        // Hide loading screen
        document.getElementById('loading-screen').style.display = 'none';
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenName;
        }
        
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-screen="${screenName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        console.info('Switched to screen:', screenName);
    }

    switchScreen(screenName) {
        this.showScreen(screenName);
        
        // Load screen-specific data
        if (screenName === 'dashboard') {
            this.loadDashboardData();
        } else if (screenName === 'data') {
            this.loadStudentCards();
        } else if (screenName === 'admin') {
            this.loadAdminData();
        }
    }

    // Dashboard functionality
    async loadDashboardData() {
        try {
            const surveys = await this.getAllFromDB('surveys');
            
            // Calculate statistics
            const totalResponses = surveys.length;
            const currentMonth = new Date().getMonth();
            const monthlyResponses = surveys.filter(survey => 
                new Date(survey.timestamp).getMonth() === currentMonth
            ).length;
            const uniqueChildren = new Set(surveys.map(survey => survey.name)).size;
            
            // Update stats
            document.getElementById('total-responses').textContent = totalResponses;
            document.getElementById('monthly-responses').textContent = monthlyResponses;
            document.getElementById('unique-children').textContent = uniqueChildren;
            
            // Create charts
            this.createSatisfactionChart(surveys);
            this.createGradeChart(surveys);
            
            console.info('Dashboard data loaded');
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    createSatisfactionChart(surveys) {
        const canvas = document.getElementById('satisfaction-chart');
        const ctx = canvas.getContext('2d');
        
        // Simple satisfaction distribution
        const satisfactionData = {};
        surveys.forEach(survey => {
            Object.values(survey.responses || {}).forEach(response => {
                if (response.rating) {
                    satisfactionData[response.rating] = (satisfactionData[response.rating] || 0) + 1;
                }
            });
        });
        
        this.drawBarChart(ctx, satisfactionData, '満足度分布');
    }

    createGradeChart(surveys) {
        const canvas = document.getElementById('grade-chart');
        const ctx = canvas.getContext('2d');
        
        // Grade distribution
        const gradeData = {};
        surveys.forEach(survey => {
            gradeData[survey.grade] = (gradeData[survey.grade] || 0) + 1;
        });
        
        this.drawBarChart(ctx, gradeData, '学年別統計');
    }

    drawBarChart(ctx, data, title) {
        const canvas = ctx.canvas;
        const { width, height } = canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Colors from design system
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
        
        const entries = Object.entries(data);
        if (entries.length === 0) {
            // Draw "No data" message
            ctx.fillStyle = '#626C71';
            ctx.font = '16px FKGroteskNeue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('データがありません', width / 2, height / 2);
            return;
        }
        
        const maxValue = Math.max(...Object.values(data));
        const barWidth = (width - 60) / entries.length;
        const chartHeight = height - 80;
        
        // Draw bars
        entries.forEach(([label, value], index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = 30 + index * barWidth;
            const y = height - 40 - barHeight;
            
            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
            
            // Draw value labels
            ctx.fillStyle = '#134252';
            ctx.font = '12px FKGroteskNeue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
            
            // Draw category labels
            ctx.save();
            ctx.translate(x + barWidth / 2, height - 20);
            ctx.rotate(-Math.PI / 4);
            ctx.textAlign = 'right';
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });
        
        // Draw title
        ctx.fillStyle = '#134252';
        ctx.font = '16px FKGroteskNeue, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);
    }

    // Survey functionality
    populateDropdowns() {
        const nameSelect = document.getElementById('student-name');
        const gradeSelect = document.getElementById('student-grade');
        const gradeFilter = document.getElementById('grade-filter');
        
        // Clear existing options except the first one
        nameSelect.innerHTML = '<option value="">選択してください</option>';
        gradeSelect.innerHTML = '<option value="">選択してください</option>';
        gradeFilter.innerHTML = '<option value="">全学年</option>';
        
        // Populate names
        this.initialNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            nameSelect.appendChild(option);
        });
        
        // Populate grades
        this.grades.forEach(grade => {
            const option1 = document.createElement('option');
            option1.value = grade;
            option1.textContent = grade;
            gradeSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = grade;
            option2.textContent = grade;
            gradeFilter.appendChild(option2);
        });
        
        console.info('Dropdowns populated with', this.initialNames.length, 'names and', this.grades.length, 'grades');
    }

    renderSurveyQuestions() {
        const container = document.getElementById('survey-questions');
        container.innerHTML = '';
        
        Object.entries(this.surveyQuestions).forEach(([key, question]) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-group';
            
            questionDiv.innerHTML = `
                <div class="question-title">${question.label}</div>
                <div class="rating-options">
                    ${question.options.map((option, index) => `
                        <div class="rating-option">
                            <input type="radio" id="${key}-${index}" name="${key}" value="${option}" required>
                            <label for="${key}-${index}">${option}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="form-group">
                    <label for="${key}-text" class="form-label">${question.textPrompt}</label>
                    <textarea id="${key}-text" name="${key}-text" class="form-control" rows="3"></textarea>
                </div>
            `;
            
            container.appendChild(questionDiv);
        });
        
        console.info('Survey questions rendered');
    }

    async handleSurveySubmit() {
        try {
            const form = document.getElementById('survey-form');
            const formData = new FormData(form);

            // select要素から直接値を取得（FormDataが空文字になる場合の対策）
            let name = formData.get('student-name');
            let grade = formData.get('student-grade');

            if (!name) {
                const select = form.querySelector('#student-name');
                name = select && select.value ? select.value : '';
            }
            if (!grade) {
                const select = form.querySelector('#student-grade');
                grade = select && select.value ? select.value : '';
            }

            if (!name || !grade) {
                this.showToast('氏名と学年を選択してください', 'error');
                return;
            }

            const responses = {};
            Object.keys(this.surveyQuestions).forEach(key => {
                responses[key] = {
                    rating: formData.get(key),
                    text: formData.get(`${key}-text`) || ''
                };
            });

            const survey = {
                name,
                grade,
                responses,
                timestamp: new Date().toISOString()
            };

            await this.saveToDB('surveys', survey);
            this.showToast('アンケートを送信しました', 'success');
            form.reset();
            console.info('Survey submitted for:', name);

        } catch (error) {
            console.error('Failed to submit survey:', error);
            this.showToast('送信に失敗しました', 'error');
        }
    }

    showPreview() {
        // <select>の値取得はFormDataではname属性が必要
        // name属性が抜けている場合はここで取得し直す
        const form = document.getElementById('survey-form');
        const formData = new FormData(form);

        // select要素から直接値を取得（FormDataが空文字になる場合の対策）
        let name = formData.get('student-name');
        let grade = formData.get('student-grade');

        // select要素のvalueが空文字の場合は未選択扱い
        if (!name) {
            const select = form.querySelector('#student-name');
            name = select && select.value ? select.value : '未選択';
        }
        if (!grade) {
            const select = form.querySelector('#student-grade');
            grade = select && select.value ? select.value : '未選択';
        }

        let previewHTML = `
            <div class="form-group">
                <strong>氏名:</strong> ${name}
            </div>
            <div class="form-group">
                <strong>学年:</strong> ${grade}
            </div>
        `;

        Object.entries(this.surveyQuestions).forEach(([key, question]) => {
            const rating = formData.get(key) || '未選択';
            const text = formData.get(`${key}-text`) || '';

            previewHTML += `
                <div class="form-group">
                    <strong>${question.label}:</strong> ${rating}
                    ${text ? `<br><em>${text}</em>` : ''}
                </div>
            `;
        });

        document.getElementById('preview-content').innerHTML = previewHTML;
        this.showModal('preview-modal');
    }

    // Data management
    async loadStudentCards() {
        try {
            const surveys = await this.getAllFromDB('surveys');
            const studentData = {};
            
            // Group surveys by student
            surveys.forEach(survey => {
                if (!studentData[survey.name]) {
                    studentData[survey.name] = {
                        name: survey.name,
                        grade: survey.grade,
                        surveys: []
                    };
                }
                studentData[survey.name].surveys.push(survey);
            });
            
            this.renderStudentCards(Object.values(studentData));
            console.info('Student cards loaded:', Object.keys(studentData).length);
            
        } catch (error) {
            console.error('Failed to load student cards:', error);
        }
    }

    renderStudentCards(students) {
        const container = document.getElementById('student-cards');
        container.innerHTML = '';
        
        if (students.length === 0) {
            container.innerHTML = '<p>まだデータがありません。アンケートを入力してください。</p>';
            return;
        }
        
        students.forEach(student => {
            const card = document.createElement('div');
            card.className = 'card student-card';
            
            const latestSurvey = student.surveys[student.surveys.length - 1];
            const latestDate = new Date(latestSurvey.timestamp).toLocaleDateString('ja-JP');
            
            card.innerHTML = `
                <div class="card__body">
                    <div class="student-header">
                        <div>
                            <h3 class="student-name">${student.name}</h3>
                            <div class="student-grade">${student.grade}</div>
                        </div>
                        <div class="response-count">${student.surveys.length}回回答</div>
                    </div>
                    <div class="latest-response">最新回答: ${latestDate}</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.showStudentDetail(student);
            });
            
            container.appendChild(card);
        });
    }

    showStudentDetail(student) {
        const detailHTML = `
            <h3>${student.name} (${student.grade})</h3>
            <p>回答履歴: ${student.surveys.length}件</p>
            ${student.surveys.map(survey => {
                const date = new Date(survey.timestamp).toLocaleDateString('ja-JP');
                return `
                    <div class="card" style="margin: 10px 0;">
                        <div class="card__body">
                            <strong>${date}</strong>
                            ${Object.entries(survey.responses || {}).map(([key, response]) => {
                                const question = this.surveyQuestions[key];
                                return `
                                    <div style="margin: 10px 0;">
                                        <strong>${question?.label || key}:</strong> ${response.rating || '未回答'}
                                        ${response.text ? `<br><em>${response.text}</em>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
        
        document.getElementById('preview-content').innerHTML = detailHTML;
        this.showModal('preview-modal');
    }

    filterStudentCards() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const gradeFilter = document.getElementById('grade-filter').value;
        
        const cards = document.querySelectorAll('.student-card');
        cards.forEach(card => {
            const name = card.querySelector('.student-name').textContent.toLowerCase();
            const grade = card.querySelector('.student-grade').textContent;
            
            const matchesSearch = !searchTerm || name.includes(searchTerm);
            const matchesGrade = !gradeFilter || grade === gradeFilter;
            
            if (matchesSearch && matchesGrade) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Admin functionality
    switchAdminTab(tabName) {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        
        if (tabName === 'logs') {
            this.displayLogs();
        }
        
        console.info('Switched to admin tab:', tabName);
    }

    loadAdminData() {
        this.renderNameList();
        this.renderQuestionsEditor();
        console.info('Admin data loaded');
    }

    renderNameList() {
        const container = document.getElementById('name-list');
        container.innerHTML = '';
        
        this.initialNames.forEach((name, index) => {
            const nameItem = document.createElement('div');
            nameItem.className = 'name-item';
            nameItem.innerHTML = `
                <span>${name}</span>
                <button class="remove-name-btn" data-index="${index}" title="削除">✕</button>
            `;
            
            // Add event listener to remove button
            const removeBtn = nameItem.querySelector('.remove-name-btn');
            removeBtn.addEventListener('click', () => {
                this.removeName(index);
            });
            
            container.appendChild(nameItem);
        });
    }

    async addName() {
        const input = document.getElementById('new-name');
        const name = input.value.trim();
        
        if (!name) {
            this.showToast('名前を入力してください', 'error');
            return;
        }
        
        if (this.initialNames.includes(name)) {
            this.showToast('この名前は既に登録されています', 'error');
            return;
        }
        
        try {
            this.initialNames.push(name);
            await this.saveToDB('settings', { key: 'names', value: this.initialNames });
            this.renderNameList();
            this.populateDropdowns();
            input.value = '';
            this.showToast('名前を追加しました', 'success');
            console.info('Name added:', name);
        } catch (error) {
            console.error('Failed to add name:', error);
            this.showToast('名前の追加に失敗しました', 'error');
        }
    }

    async removeName(index) {
        if (confirm('この名前を削除しますか？')) {
            try {
                const removedName = this.initialNames[index];
                this.initialNames.splice(index, 1);
                await this.saveToDB('settings', { key: 'names', value: this.initialNames });
                this.renderNameList();
                this.populateDropdowns();
                this.showToast('名前を削除しました', 'success');
                console.info('Name removed:', removedName);
            } catch (error) {
                console.error('Failed to remove name:', error);
                this.showToast('名前の削除に失敗しました', 'error');
            }
        }
    }

    renderQuestionsEditor() {
        const container = document.getElementById('questions-editor');
        container.innerHTML = '';
        
        Object.entries(this.surveyQuestions).forEach(([key, question]) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'card';
            questionDiv.style.margin = '10px 0';
            questionDiv.innerHTML = `
                <div class="card__body">
                    <div class="form-group">
                        <label class="form-label">質問文</label>
                        <input type="text" class="form-control question-label-input" value="${question.label}" data-key="${key}" data-field="label">
                    </div>
                    <div class="form-group">
                        <label class="form-label">テキスト欄のプロンプト</label>
                        <input type="text" class="form-control question-prompt-input" value="${question.textPrompt}" data-key="${key}" data-field="textPrompt">
                    </div>
                    <div class="form-group">
                        <label class="form-label">選択肢（1行に1つ）</label>
                        <textarea class="form-control question-options-input" rows="4" data-key="${key}">${question.options.join('\n')}</textarea>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const labelInput = questionDiv.querySelector('.question-label-input');
            labelInput.addEventListener('change', (e) => {
                this.updateQuestion(key, 'label', e.target.value);
            });
            
            const promptInput = questionDiv.querySelector('.question-prompt-input');
            promptInput.addEventListener('change', (e) => {
                this.updateQuestion(key, 'textPrompt', e.target.value);
            });
            
            const optionsInput = questionDiv.querySelector('.question-options-input');
            optionsInput.addEventListener('change', (e) => {
                this.updateQuestionOptions(key, e.target.value);
            });
            
            container.appendChild(questionDiv);
        });
    }

    async updateQuestion(key, field, value) {
        try {
            this.surveyQuestions[key][field] = value;
            await this.saveToDB('settings', { key: 'questions', value: this.surveyQuestions });
            this.renderSurveyQuestions();
            console.info('Question updated:', key, field, value);
        } catch (error) {
            console.error('Failed to update question:', error);
        }
    }

    async updateQuestionOptions(key, value) {
        try {
            this.surveyQuestions[key].options = value.split('\n').filter(opt => opt.trim());
            await this.saveToDB('settings', { key: 'questions', value: this.surveyQuestions });
            this.renderSurveyQuestions();
            console.info('Question options updated:', key);
        } catch (error) {
            console.error('Failed to update question options:', error);
        }
    }

    // GitHub integration
    async handleGitHubBackup() {
        const token = document.getElementById('github-token').value;
        const repo = document.getElementById('github-repo').value;
    
        if (!token || !repo) {
            this.showToast('トークンとリポジトリ名を入力してください', 'error');
            return;
        }
    
        try {
            const surveys = await this.getAllFromDB('surveys');
            const backupData = {
                surveys,
                settings: {
                    names: this.initialNames,
                    questions: this.surveyQuestions
                },
                timestamp: new Date().toISOString()
            };
    
            const path = `backup/data-${Date.now()}.json`;
    
            // UTF-8 Base64エンコード
            function toBase64(str) {
                return btoa(unescape(encodeURIComponent(str)));
            }
    
            const content = toBase64(JSON.stringify(backupData, null, 2));
    
            const url = `https://api.github.com/repos/${repo}/contents/${path}`;
            const body = {
                message: 'Auto backup from survey app',
                content: content
            };
    
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
    
            const result = await res.json();
    
            if (res.ok) {
                this.showToast('バックアップが完了しました', 'success');
                document.getElementById('github-status').innerHTML = '<div class="status status--success">バックアップ成功</div>';
                console.info('GitHub backup successful');
            } else {
                // エラー内容を表示
                this.showToast(`バックアップ失敗: ${result.message}`, 'error');
                document.getElementById('github-status').innerHTML = `<div class="status status--error">バックアップ失敗: ${result.message}</div>`;
                console.error('GitHub backup failed:', result);
            }
    
        } catch (error) {
            console.error('GitHub backup failed:', error);
            this.showToast('バックアップに失敗しました', 'error');
            document.getElementById('github-status').innerHTML = '<div class="status status--error">バックアップ失敗</div>';
        }
    }

    async handleGitHubSync() {
        this.showToast('同期機能は開発中です', 'info');
    }

    async handleFeedbackSubmit() {
        const title = document.getElementById('feedback-title').value;
        const description = document.getElementById('feedback-description').value;
        const token = document.getElementById('github-token').value;
        const repo = document.getElementById('github-repo').value;

        if (!title || !description) {
            this.showToast('タイトルと詳細を入力してください', 'error');
            return;
        }
        if (!token || !repo) {
            this.showToast('トークンとリポジトリ名を入力してください', 'error');
            return;
        }

        try {
            const url = `https://api.github.com/repos/${repo}/issues`;
            const body = {
                title: title,
                body: description
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const result = await res.json();

            if (res.ok) {
                this.showToast('フィードバックをGitHub Issueとして登録しました', 'success');
                this.hideModal('feedback-modal');
                document.getElementById('feedback-form').reset();
                document.getElementById('github-status').innerHTML = '<div class="status status--success">Issue作成成功</div>';
                console.info('Feedback submitted as GitHub Issue:', result.html_url);
            } else {
                this.showToast(`Issue作成失敗: ${result.message}`, 'error');
                document.getElementById('github-status').innerHTML = `<div class="status status--error">Issue作成失敗: ${result.message}</div>`;
                console.error('GitHub Issue creation failed:', result);
            }
        } catch (error) {
            console.error('GitHub Issue creation failed:', error);
            this.showToast('Issue作成に失敗しました', 'error');
            document.getElementById('github-status').innerHTML = '<div class="status status--error">Issue作成失敗</div>';
        }
    }

    // Log management
    displayLogs() {
        this.filterLogs();
    }

    filterLogs() {
        const filter = document.getElementById('log-filter').value;
        const container = document.getElementById('logs-display');
        
        const filteredLogs = filter ? this.logs.filter(log => log.level === filter) : this.logs;
        
        container.innerHTML = filteredLogs.map(log => `
            <div class="log-entry ${log.level}">
                <span class="log-timestamp">${new Date(log.timestamp).toLocaleString('ja-JP')}</span>
                [${log.level.toUpperCase()}] ${log.message}
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    exportLogs() {
        const csv = ['Timestamp,Level,Message']
            .concat(this.logs.map(log => `"${log.timestamp}","${log.level}","${log.message.replace(/"/g, '""')}"`))
            .join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        this.showToast('ログをエクスポートしました', 'success');
    }

    clearLogs() {
        if (confirm('ログをクリアしますか？')) {
            this.logs = [];
            this.displayLogs();
            this.showToast('ログをクリアしました', 'success');
        }
    }

    // Utility functions
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SurveyApp();
    // Make app globally available for debugging
    window.app = app;
});
=======
アプリケーションのJavaScriptコードはapp.jsファイルに含まれています。
>>>>>>> main
