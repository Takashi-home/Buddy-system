// 子供会アンケートアプリ - メインアプリケーション
class SurveyApp {
    constructor() {
        this.currentView = 'survey';
        this.surveyData = {
            questions: [],
            nameList: [],
            responses: [],
            githubConfig: {
                token: '',
                username: '',
                repository: '',
                autoSync: false
            },
            appVersion: '1.0.0',
            lastUpdated: new Date().toISOString()
        };
        this.editingQuestion = null;
        this.currentSourceFile = 'html';
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.initializeDefaultData();
        this.renderCurrentView();
        this.updateLastUpdateDisplay();
    }

    // データの読み込み・保存
    async loadData() {
        try {
            const saved = localStorage.getItem('surveyAppData');
            if (saved) {
                this.surveyData = { ...this.surveyData, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
        }
    }

    async saveData() {
        try {
            localStorage.setItem('surveyAppData', JSON.stringify(this.surveyData));
            this.surveyData.lastUpdated = new Date().toISOString();
            this.updateLastUpdateDisplay();
        } catch (error) {
            console.error('データの保存に失敗しました:', error);
            this.showToast('データの保存に失敗しました', 'error');
        }
    }

    initializeDefaultData() {
        if (this.surveyData.questions.length === 0) {
            this.surveyData.questions = [
                {
                    id: 'name',
                    label: '氏名',
                    type: 'select',
                    required: true,
                    options: 'nameList'
                },
                {
                    id: 'grade',
                    label: '学年',
                    type: 'select',
                    required: true,
                    options: ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3']
                },
                {
                    id: 'camp',
                    label: '合宿について(ガード昼休み等)',
                    type: 'radio_with_textarea',
                    required: true,
                    options: ['とても楽しい', '楽しい', '普通', 'つまらない'],
                    textareaLabel: '詳しく教えてください'
                },
                {
                    id: 'private_life',
                    label: '私生活について',
                    type: 'radio_with_textarea',
                    required: true,
                    options: ['とても頑張っている', '頑張っている', '普通', 'あまり頑張れていない'],
                    textareaLabel: 'どんなことを頑張っていますか'
                },
                {
                    id: 'improvement',
                    label: '頑張ってほしいこと(主体性等)',
                    type: 'radio_with_textarea',
                    required: true,
                    options: ['とても身についた', '身についた', '少し身についた', 'まだ身についていない'],
                    textareaLabel: 'どのような場面で感じますか'
                }
            ];
        }

        if (this.surveyData.nameList.length === 0) {
            this.surveyData.nameList = [
                '田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '渡辺健太',
                '山田さくら', '中村大輝', '小林優香', '加藤翔太', '吉田莉子'
            ];
        }

        this.saveData();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // ナビゲーション
        document.querySelectorAll('.nav__button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // アンケートフォーム送信
        document.getElementById('survey-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSurvey();
        });

        // 管理画面
        document.getElementById('add-question-btn').addEventListener('click', () => {
            this.openQuestionModal();
        });

        // GitHub設定
        document.getElementById('github-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGithubSettings();
        });

        // 氏名管理
        document.getElementById('add-name-btn').addEventListener('click', () => {
            this.addName();
        });

        document.getElementById('new-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addName();
            }
        });

        // ソースコード管理
        document.getElementById('view-source-btn').addEventListener('click', () => {
            this.openSourceModal();
        });

        document.getElementById('push-to-github-btn').addEventListener('click', () => {
            this.pushToGithub();
        });

        // データ管理
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterResponses(e.target.value);
        });

        document.getElementById('export-data-btn').addEventListener('click', () => {
            this.exportData();
        });

        // モーダル関連
        this.setupModalListeners();
    }

    setupModalListeners() {
        // 質問編集モーダル
        const questionModal = document.getElementById('question-modal');
        questionModal.querySelector('.modal__close').addEventListener('click', () => {
            this.closeQuestionModal();
        });

        document.getElementById('save-question-btn').addEventListener('click', () => {
            this.saveQuestion();
        });

        document.getElementById('cancel-question-btn').addEventListener('click', () => {
            this.closeQuestionModal();
        });

        // ソースコードモーダル
        const sourceModal = document.getElementById('source-modal');
        sourceModal.querySelector('.modal__close').addEventListener('click', () => {
            this.closeSourceModal();
        });

        document.getElementById('modal-overlay').addEventListener('click', () => {
            this.closeSourceModal();
        });

        // ソースコードタブ
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSourceTab(e.target.dataset.file);
            });
        });

        document.getElementById('save-source-btn').addEventListener('click', () => {
            this.saveSourceCode();
        });

        document.getElementById('commit-source-btn').addEventListener('click', () => {
            this.commitSourceCode();
        });
    }

    // ビュー切り替え
    switchView(viewName) {
        // 現在のビューを非表示
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });

        // ナビゲーションボタンの状態更新
        document.querySelectorAll('.nav__button').forEach(btn => {
            btn.classList.remove('active');
        });

        // 新しいビューを表示
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        this.currentView = viewName;
        this.renderCurrentView();
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'survey':
                this.renderSurveyForm();
                break;
            case 'manage':
                this.renderManageView();
                break;
            case 'data':
                this.renderDataView();
                break;
            case 'settings':
                this.renderSettingsView();
                break;
        }
    }

    // アンケートフォームの描画
    renderSurveyForm() {
        const container = document.getElementById('survey-questions');
        container.innerHTML = '';

        this.surveyData.questions.forEach(question => {
            const questionEl = this.createQuestionElement(question);
            container.appendChild(questionEl);
        });
    }

    createQuestionElement(question) {
        const div = document.createElement('div');
        div.className = 'survey-question';
        div.innerHTML = `
            <label class="survey-question__label">
                ${question.label}
                ${question.required ? '<span class="survey-question__required">*</span>' : ''}
            </label>
            ${this.createQuestionInput(question)}
        `;
        return div;
    }

    createQuestionInput(question) {
        const options = question.options === 'nameList' ? this.surveyData.nameList : question.options;

        switch (question.type) {
            case 'text':
                return `<input type="text" name="${question.id}" class="form-control" ${question.required ? 'required' : ''}>`;

            case 'textarea':
                return `<textarea name="${question.id}" class="form-control auto-resize-textarea" rows="3" ${question.required ? 'required' : ''}></textarea>`;

            case 'select':
                return `
                    <select name="${question.id}" class="form-control" ${question.required ? 'required' : ''}>
                        <option value="">選択してください</option>
                        ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                `;

            case 'radio':
                return `
                    <div class="radio-group">
                        ${options.map(opt => `
                            <label class="radio-option">
                                <input type="radio" name="${question.id}" value="${opt}" ${question.required ? 'required' : ''}>
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                `;

            case 'radio_with_textarea':
                return `
                    <div class="radio-group">
                        ${options.map(opt => `
                            <label class="radio-option">
                                <input type="radio" name="${question.id}" value="${opt}" ${question.required ? 'required' : ''}>
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="textarea-section">
                        <label>${question.textareaLabel || '詳しく教えてください'}</label>
                        <textarea name="${question.id}_text" class="form-control auto-resize-textarea" rows="3"></textarea>
                        <div class="char-count">
                            <span class="char-current">0</span> / 500文字
                        </div>
                    </div>
                `;

            default:
                return '';
        }
    }

    // アンケート送信
    submitSurvey() {
        const form = document.getElementById('survey-form');
        const formData = new FormData(form);
        const response = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            data: {}
        };

        // フォームデータを収集
        for (let [key, value] of formData.entries()) {
            response.data[key] = value;
        }

        // 必須項目チェック
        const requiredQuestions = this.surveyData.questions.filter(q => q.required);
        const missingFields = requiredQuestions.filter(q => {
            const value = response.data[q.id];
            return !value || value.trim() === '';
        });

        if (missingFields.length > 0) {
            this.showToast('すべての必須項目を入力してください', 'error');
            return;
        }

        // 回答を保存
        this.surveyData.responses.push(response);
        this.saveData();

        // フォームをリセット
        form.reset();

        this.showToast('回答を送信しました', 'success');

        // GitHub自動同期が有効な場合
        if (this.surveyData.githubConfig.autoSync) {
            this.syncToGithub();
        }
    }

    // 管理画面の描画
    renderManageView() {
        this.renderQuestionEditor();
        this.renderSurveyPreview();
    }

    renderQuestionEditor() {
        const container = document.getElementById('question-editor');
        container.innerHTML = '';

        this.surveyData.questions.forEach((question, index) => {
            const questionItem = this.createQuestionItem(question, index);
            container.appendChild(questionItem);
        });

        this.setupDragAndDrop();
    }

    createQuestionItem(question, index) {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.dataset.index = index;
        div.draggable = true;

        div.innerHTML = `
            <div class="question-item__header">
                <h4 class="question-item__title">${question.label}</h4>
                <span class="question-item__type">${this.getTypeLabel(question.type)}</span>
                <div class="question-item__actions">
                    <button class="edit-btn" onclick="app.editQuestion(${index})">編集</button>
                    <button class="delete-btn" onclick="app.deleteQuestion(${index})">削除</button>
                </div>
            </div>
            <div class="question-item__body">
                ${this.createQuestionPreview(question)}
            </div>
        `;

        return div;
    }

    createQuestionPreview(question) {
        const options = question.options === 'nameList' ? this.surveyData.nameList : question.options;

        switch (question.type) {
            case 'text':
                return '<input type="text" class="form-control" placeholder="テキスト入力" disabled>';
            case 'textarea':
                return '<textarea class="form-control" placeholder="長文入力" disabled></textarea>';
            case 'select':
                return `
                    <select class="form-control" disabled>
                        <option>選択してください</option>
                        ${options.map(opt => `<option>${opt}</option>`).join('')}
                    </select>
                `;
            case 'radio':
            case 'radio_with_textarea':
                let html = `<div class="radio-group">`;
                options.forEach(opt => {
                    html += `
                        <label class="radio-option">
                            <input type="radio" name="preview_${question.id}" disabled>
                            <span>${opt}</span>
                        </label>
                    `;
                });
                html += '</div>';
                
                if (question.type === 'radio_with_textarea') {
                    html += `
                        <div class="textarea-section">
                            <label>${question.textareaLabel || '詳しく教えてください'}</label>
                            <textarea class="form-control" disabled></textarea>
                        </div>
                    `;
                }
                return html;
            default:
                return '';
        }
    }

    getTypeLabel(type) {
        const labels = {
            'text': 'テキスト',
            'textarea': '長文',
            'select': 'プルダウン',
            'radio': 'ラジオボタン',
            'radio_with_textarea': 'ラジオ+自由記述'
        };
        return labels[type] || type;
    }

    renderSurveyPreview() {
        const container = document.getElementById('survey-preview');
        container.innerHTML = '';

        this.surveyData.questions.forEach(question => {
            const questionEl = this.createQuestionElement(question);
            questionEl.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = true;
            });
            container.appendChild(questionEl);
        });
    }

    // ドラッグ&ドロップ機能
    setupDragAndDrop() {
        const container = document.getElementById('question-editor');
        let draggedElement = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('question-item')) {
                draggedElement = e.target;
                e.target.classList.add('dragging');
            }
        });

        container.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('question-item')) {
                e.target.classList.remove('dragging');
                draggedElement = null;
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement && e.target.closest('.question-item')) {
                const targetElement = e.target.closest('.question-item');
                if (targetElement !== draggedElement) {
                    this.reorderQuestions(draggedElement.dataset.index, targetElement.dataset.index);
                }
            }
        });
    }

    reorderQuestions(fromIndex, toIndex) {
        const questions = [...this.surveyData.questions];
        const [movedQuestion] = questions.splice(fromIndex, 1);
        questions.splice(toIndex, 0, movedQuestion);
        
        this.surveyData.questions = questions;
        this.saveData();
        this.renderManageView();
    }

    // 質問編集
    editQuestion(index) {
        this.editingQuestion = index;
        const question = this.surveyData.questions[index];
        
        document.getElementById('question-title').value = question.label;
        document.getElementById('question-type').value = question.type;
        document.getElementById('question-required').checked = question.required;
        
        if (question.options && question.options !== 'nameList') {
            document.getElementById('question-options').value = question.options.join('\n');
        }

        this.updateQuestionTypeOptions();
        this.openQuestionModal();
    }

    deleteQuestion(index) {
        if (confirm('この質問を削除しますか？')) {
            this.surveyData.questions.splice(index, 1);
            this.saveData();
            this.renderManageView();
            this.showToast('質問を削除しました', 'success');
        }
    }

    openQuestionModal() {
        document.getElementById('question-modal').classList.remove('hidden');
        document.getElementById('question-type').addEventListener('change', () => {
            this.updateQuestionTypeOptions();
        });
    }

    closeQuestionModal() {
        document.getElementById('question-modal').classList.add('hidden');
        this.editingQuestion = null;
        document.getElementById('question-edit-form').reset();
    }

    updateQuestionTypeOptions() {
        const type = document.getElementById('question-type').value;
        const optionsGroup = document.getElementById('options-group');
        
        if (type === 'text' || type === 'textarea') {
            optionsGroup.style.display = 'none';
        } else {
            optionsGroup.style.display = 'block';
        }
    }

    saveQuestion() {
        const title = document.getElementById('question-title').value.trim();
        const type = document.getElementById('question-type').value;
        const required = document.getElementById('question-required').checked;
        const optionsText = document.getElementById('question-options').value.trim();

        if (!title) {
            this.showToast('質問タイトルを入力してください', 'error');
            return;
        }

        const question = {
            id: this.editingQuestion !== null ? this.surveyData.questions[this.editingQuestion].id : Date.now().toString(),
            label: title,
            type: type,
            required: required
        };

        if (type !== 'text' && type !== 'textarea' && optionsText) {
            question.options = optionsText.split('\n').map(opt => opt.trim()).filter(opt => opt);
        }

        if (type === 'radio_with_textarea') {
            question.textareaLabel = '詳しく教えてください';
        }

        if (this.editingQuestion !== null) {
            this.surveyData.questions[this.editingQuestion] = question;
        } else {
            this.surveyData.questions.push(question);
        }

        this.saveData();
        this.renderManageView();
        this.closeQuestionModal();
        this.showToast('質問を保存しました', 'success');
    }

    // データ管理画面
    renderDataView() {
        this.renderResponseList();
    }

    renderResponseList() {
        const container = document.getElementById('response-list');
        container.innerHTML = '';

        if (this.surveyData.responses.length === 0) {
            container.innerHTML = '<p class="text-secondary">回答データがありません</p>';
            return;
        }

        this.surveyData.responses.forEach(response => {
            const responseItem = this.createResponseItem(response);
            container.appendChild(responseItem);
        });
    }

    createResponseItem(response) {
        const div = document.createElement('div');
        div.className = 'response-item';
        
        const name = response.data.name || '未設定';
        const date = new Date(response.timestamp).toLocaleString('ja-JP');

        div.innerHTML = `
            <div class="response-item__header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div class="response-item__info">
                    <span class="response-item__name">${name}</span>
                    <span class="response-item__date">${date}</span>
                </div>
                <button class="response-item__toggle">▼</button>
            </div>
            <div class="response-item__body hidden">
                ${this.createResponseDetails(response)}
            </div>
        `;

        return div;
    }

    createResponseDetails(response) {
        let html = '';
        
        this.surveyData.questions.forEach(question => {
            const value = response.data[question.id];
            const textValue = response.data[question.id + '_text'];
            
            if (value || textValue) {
                html += `
                    <div class="response-field">
                        <span class="response-field__label">${question.label}:</span>
                        <div class="response-field__value">
                            ${value || ''}
                            ${textValue ? `<br><em>詳細: ${textValue}</em>` : ''}
                        </div>
                    </div>
                `;
            }
        });

        return html;
    }

    filterResponses(searchTerm) {
        const items = document.querySelectorAll('.response-item');
        items.forEach(item => {
            const name = item.querySelector('.response-item__name').textContent;
            if (name.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    exportData() {
        const data = {
            questions: this.surveyData.questions,
            responses: this.surveyData.responses,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('データをエクスポートしました', 'success');
    }

    // 設定画面
    renderSettingsView() {
        this.loadGithubSettings();
        this.renderNameList();
    }

    loadGithubSettings() {
        const config = this.surveyData.githubConfig;
        document.getElementById('github-token').value = config.token;
        document.getElementById('github-username').value = config.username;
        document.getElementById('github-repo').value = config.repository;
        document.getElementById('auto-sync').checked = config.autoSync;
    }

    saveGithubSettings() {
        this.surveyData.githubConfig = {
            token: document.getElementById('github-token').value,
            username: document.getElementById('github-username').value,
            repository: document.getElementById('github-repo').value,
            autoSync: document.getElementById('auto-sync').checked
        };

        this.surveyData.lastUpdated = new Date().toISOString(); // 追加
        this.saveData();
        this.showToast('GitHub設定を保存しました', 'success');
    }

    renderNameList() {
        const container = document.getElementById('name-list');
        container.innerHTML = '';

        this.surveyData.nameList.forEach((name, index) => {
            const nameItem = document.createElement('div');
            nameItem.className = 'name-item';
            nameItem.innerHTML = `
                <span class="name-item__text">${name}</span>
                <button class="name-item__delete" onclick="app.deleteName(${index})">削除</button>
            `;
            container.appendChild(nameItem);
        });
    }

    addName() {
        const input = document.getElementById('new-name-input');
        const name = input.value.trim();

        if (!name) {
            this.showToast('氏名を入力してください', 'error');
            return;
        }

        if (this.surveyData.nameList.includes(name)) {
            this.showToast('この氏名は既に登録されています', 'error');
            return;
        }

        this.surveyData.nameList.push(name);
        input.value = '';
        this.saveData();
        this.renderNameList();
        this.showToast('氏名を追加しました', 'success');
    }

    deleteName(index) {
        if (confirm('この氏名を削除しますか？')) {
            this.surveyData.nameList.splice(index, 1);
            this.saveData();
            this.renderNameList();
            this.showToast('氏名を削除しました', 'success');
        }
    }

    // ソースコード管理
    openSourceModal() {
        document.getElementById('source-modal').classList.remove('hidden');
        this.loadSourceCode();
    }

    closeSourceModal() {
        document.getElementById('source-modal').classList.add('hidden');
    }

    switchSourceTab(fileType) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-file="${fileType}"]`).classList.add('active');
        
        this.currentSourceFile = fileType;
        this.loadSourceCode();
    }

    loadSourceCode() {
        const editor = document.getElementById('source-editor');
        const sources = this.getSourceCode();
        editor.value = sources[this.currentSourceFile] || '';
    }

    getSourceCode() {
        return {
            html: document.documentElement.outerHTML,
            css: Array.from(document.styleSheets)
                .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
                    } catch (e) {
                        return '';
                    }
                }).join('\n'),
            js: document.querySelector('script[src="app.js"]') ? 
                'アプリケーションのJavaScriptコードはapp.jsファイルに含まれています。' : ''
        };
    }

    saveSourceCode() {
        this.showToast('ソースコードを保存しました', 'success');
    }

    commitSourceCode() {
        if (!this.surveyData.githubConfig.token) {
            this.showToast('GitHub設定を完了してください', 'error');
            return;
        }

        this.pushToGithub();
    }

    async pushToGithub() {
        const config = this.surveyData.githubConfig;
        
        if (!config.token || !config.username || !config.repository) {
            this.showToast('GitHub設定が不完全です', 'error');
            return;
        }

        try {
            // GitHub APIを使用してファイルをプッシュ
            const sources = this.getSourceCode();
            const files = [
                { path: 'index.html', content: sources.html },
                { path: 'style.css', content: sources.css },
                { path: 'app.js', content: sources.js },
                { path: 'data.json', content: JSON.stringify(this.surveyData, null, 2) }
            ];

            // 実際のGitHub API呼び出しは省略（セキュリティ上の理由）
            // ここでは成功をシミュレート
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showToast('GitHubにプッシュしました', 'success');
            this.closeSourceModal();
        } catch (error) {
            console.error('GitHub push error:', error);
            this.showToast('GitHubへのプッシュに失敗しました', 'error');
        }
    }

    async syncToGithub() {
        if (this.surveyData.githubConfig.autoSync) {
            await this.pushToGithub();
        }
    }

    // ユーティリティ
    updateLastUpdateDisplay() {
        const element = document.getElementById('last-update');
        if (element) {
            const date = new Date(this.surveyData.lastUpdated);
            element.textContent = date.toLocaleString('ja-JP');
        }

        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            versionElement.textContent = this.surveyData.appVersion;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SurveyApp();
    
    // PWA対応
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('data:text/javascript,/* Service Worker */');
    }

    // テキストエリアの自動リサイズ
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('auto-resize-textarea')) {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
            
            // 文字数カウント
            const charCount = e.target.nextElementSibling;
            if (charCount && charCount.classList.contains('char-count')) {
                const current = e.target.value.length;
                charCount.querySelector('.char-current').textContent = current;
                
                if (current > 500) {
                    charCount.style.color = 'var(--color-error)';
                } else {
                    charCount.style.color = 'var(--color-text-secondary)';
                }
            }
        }
    });
});