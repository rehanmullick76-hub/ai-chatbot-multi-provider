document.addEventListener('DOMContentLoaded', function() {
    
    let API_KEY = '';
    let isConnected = false;
    let isSettingsOpen = false;
    let currentProvider = 'openrouter';
    
    // --- Local Storage & Multiple Chats Variables ---
    let allChats = JSON.parse(localStorage.getItem('ai_bot_chats')) || [];
    let currentChatId = null;
    let chatHistory = []; 

    const SYSTEM_PROMPT = "Reply in same language as user. Be helpful and concise. If the user asks for website code (HTML/CSS/JS), ALWAYS provide all code combined inside a single HTML file (using <style> and <script> tags) by default, unless the user explicitly asks for separate files.";

    // Live Preview Modal HTML Inject
    const modalHTML = `
    <div id="previewModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.95); z-index: 9999; flex-direction: column; backdrop-filter: blur(5px);">
        <div style="background: #1e293b; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
            <div style="color: #e2e8f0; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Live Preview
            </div>
            <button onclick="document.getElementById('previewModal').style.display='none'" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s;">Close ✖</button>
        </div>
        <iframe id="previewFrame" style="flex: 1; width: 100%; border: none; background: #ffffff;"></iframe>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const ALL_MODELS = {
        openrouter: {
            '🆓 FREE': [
                { value: 'google/gemini-2.0-flash-001', label: '⚡ Gemini 2.0 Flash' },
                { value: 'meta-llama/llama-3.1-8b-instruct', label: '🦙 Llama 3.1 8B' },
                { value: 'meta-llama/llama-3-70b-instruct', label: '🦙 Llama 3 70B' },
                { value: 'deepseek/deepseek-chat', label: 'Ananya' },
                { value: 'qwen/qwen-2.5-7b-instruct', label: '👤 Qwen 2.5 7B' },
                { value: 'openai/gpt-4o', label: '🌟 GPT-4o' },
                { value: 'openai/gpt-3.5-turbo', label: '⚡ GPT-3.5 Turbo' },
                 { value: 'anthropic/claude-3-haiku', label: '⚡ Claude 3 Haiku' }
            ]
        },
        openai: {
            'OpenAI Models': [
                { value: 'gpt-4o', label: '🌟 GPT-4o' },
                { value: 'gpt-4o-mini', label: '💫 GPT-4o Mini' },
                { value: 'gpt-3.5-turbo', label: '⚡ GPT-3.5 Turbo' }
            ]
        },
        groq: {
            'Groq (FREE)': [
                { value: 'llama-3.3-70b-versatile', label: '🦙 Llama 3.3 70B' },
                { value: 'llama-3.1-8b-instant', label: '🦙 Llama 3.1 8B' },
                { value: 'mixtral-8x7b-32768', label: '🌪️ Mixtral 8x7B' },
                { value: 'gemma2-9b-it', label: '💎 Gemma 2 9B' }
            ]
        },
        google: {
            'Google Gemini': [
                { value: 'gemini-2.0-flash', label: '⚡ Gemini 2.0 Flash' },
                { value: 'gemini-1.5-flash', label: '⚡ Gemini 1.5 Flash' },
                { value: 'gemini-1.5-pro', label: '🔬 Gemini 1.5 Pro' }
            ]
        },
        anthropic: {
            'Anthropic Claude': [
                { value: 'claude-3-5-sonnet-20241022', label: '🎵 Claude 3.5 Sonnet' },
                { value: 'claude-3-opus-20240229', label: '🏆 Claude 3 Opus' },
                { value: 'claude-3-haiku-20240307', label: '⚡ Claude 3 Haiku' }
            ]
        }
    };

    const API_ENDPOINTS = {
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
        openai: 'https://api.openai.com/v1/chat/completions',
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        google: 'https://generativelanguage.googleapis.com/v1beta/models/',
        anthropic: 'https://api.anthropic.com/v1/messages'
    };

    const settingsPanel = document.getElementById('settingsPanel');
    const btnSettings = document.getElementById('btnSettings');
    const connectionStatus = document.getElementById('connectionStatus');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const modelSelect = document.getElementById('modelSelect');
    const typingIndicator = document.getElementById('typingIndicator');
    const chatMessages = document.getElementById('chatMessages');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const chatListElement = document.getElementById('chatList');

    // --- Sidebar & Memory Functions ---
    window.toggleSidebar = function() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
    };

    window.saveChatsToLocal = function() {
        localStorage.setItem('ai_bot_chats', JSON.stringify(allChats));
        renderChatList();
    };

    window.createNewChat = function() {
        const newId = Date.now().toString();
        allChats.unshift({ id: newId, title: 'New Chat', messages: [] });
        currentChatId = newId;
        chatHistory = [];
        chatMessages.innerHTML = '';
        
        // Welcome message
        const welcomeHtml = `👋 <strong>স্বাগতম!</strong><br><br>1️⃣ ⚙️ Settings এ ক্লিক করে API Key বসান<br>2️⃣ Model select করে চ্যাট শুরু করুন!`;
        addMessage(welcomeHtml, 'ai');
                saveChatsToLocal();
        if(window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        }
    };


    window.loadChat = function(id) {
        currentChatId = id;
        const chat = allChats.find(c => c.id === id);
        chatHistory = [...chat.messages];
        chatMessages.innerHTML = '';
        
        if (chatHistory.length === 0) {
            const welcomeHtml = `👋 <strong>স্বাগতম!</strong><br><br>1️⃣ ⚙️ Settings এ ক্লিক করে API Key বসান<br>2️⃣ Model select করে চ্যাট শুরু করুন!`;
            addMessage(welcomeHtml, 'ai');
        } else {
            chatHistory.forEach(msg => {
                addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai', false); // false = no scroll animation for loading
            });
            setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 100);
        }
        
                renderChatList();
        if(window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        }
    };


    window.deleteChat = function(event, id) {
        event.stopPropagation();
        if(!confirm('আপনি কি এই চ্যাটটি ডিলিট করতে চান?')) return;
        
        allChats = allChats.filter(c => c.id !== id);
        if(allChats.length === 0) {
            createNewChat();
        } else if(currentChatId === id) {
            loadChat(allChats[0].id);
        } else {
            saveChatsToLocal();
        }
    };

    function renderChatList() {
        chatListElement.innerHTML = '';
        allChats.forEach(chat => {
            const div = document.createElement('div');
            div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
            div.onclick = () => loadChat(chat.id);
            
            div.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; color:var(--text-secondary)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>${chat.title}</span>
                <button class="btn-delete-chat" onclick="deleteChat(event, '${chat.id}')" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            chatListElement.appendChild(div);
        });
    }

    // --- Settings Functions ---
    window.toggleSettings = function() {
        isSettingsOpen = !isSettingsOpen;
        settingsPanel.classList.toggle('open', isSettingsOpen);
        btnSettings.classList.toggle('active', isSettingsOpen);
    };

    function updateModelList() {
        modelSelect.innerHTML = '';
        const models = ALL_MODELS[currentProvider];
        
        for (const [groupName, modelList] of Object.entries(models)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            
            modelList.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                optgroup.appendChild(option);
            });
            
            modelSelect.appendChild(optgroup);
        }
    }

    window.switchProvider = function(provider) {
        currentProvider = provider;
        isConnected = false;
        connectionStatus.textContent = 'Offline';
        connectionStatus.className = 'status-badge status-offline';
        messageInput.disabled = true;
        sendButton.disabled = true;
        apiKeyInput.value = '';
        
        // If current chat has messages, create a new one automatically
        if(chatHistory.length > 0) createNewChat();
        
        const placeholders = {
            openrouter: '🔑 API Key (sk-or-v1-...)',
            openai: '🔑 API Key (sk-...)',
            groq: '🔑 API Key (gsk_...)',
            google: '🔑 API Key (AIza...)',
            anthropic: '🔑 API Key (sk-ant-...)'
        };
        apiKeyInput.placeholder = placeholders[provider];
        
        updateModelList();
    };

    window.setApiKey = function() {
        const key = apiKeyInput.value.trim();
        if (!key) { alert('API Key দিন!'); return; }
        
        API_KEY = key;
        isConnected = true;
        connectionStatus.textContent = 'Online';
        connectionStatus.className = 'status-badge status-online';
        messageInput.disabled = false;
        sendButton.disabled = false;
        apiKeyInput.value = '';
        apiKeyInput.placeholder = '✓ Connected';
        
        if (isSettingsOpen) window.toggleSettings();
    };

    window.onModelChange = function() {
        if(chatHistory.length > 0) createNewChat(); 
    };

    // --- API Calls ---
    window.sendMessage = async function() {
        const message = messageInput.value.trim();
        if (!message || !isConnected) return;
        
        const model = modelSelect.value;
        
        addMessage(message, 'user');
        chatHistory.push({ role: 'user', content: message });
        
        // Update Title if it's the first message
        let activeChat = allChats.find(c => c.id === currentChatId);
        if (activeChat.messages.length === 0) {
            activeChat.title = message.substring(0, 20) + (message.length > 20 ? '...' : '');
        }
        activeChat.messages = [...chatHistory];
        saveChatsToLocal();
        
        messageInput.value = '';
        messageInput.blur();
        
        typingIndicator.classList.add('active');
        sendButton.disabled = true;
        messageInput.disabled = true;
        
        try {
            let responseText = '';
            if (currentProvider === 'google') responseText = await callGoogleAPI(model);
            else if (currentProvider === 'anthropic') responseText = await callAnthropicAPI(model);
            else responseText = await callOpenAICompatibleAPI(model);
            
            if(responseText) {
                addMessage(responseText, 'ai');
                chatHistory.push({ role: 'assistant', content: responseText });
                
                let activeChat = allChats.find(c => c.id === currentChatId);
                activeChat.messages = [...chatHistory];
                saveChatsToLocal();
            }
        } catch (error) {
            addMessage('❌ Error: ' + error.message, 'ai');
            chatHistory.pop(); // Remove failed user message
            let activeChat = allChats.find(c => c.id === currentChatId);
            activeChat.messages = [...chatHistory];
            saveChatsToLocal();
        } finally {
            typingIndicator.classList.remove('active');
            sendButton.disabled = false;
            messageInput.disabled = false;
            if (window.innerWidth > 768) messageInput.focus();
        }
    };

    async function callOpenAICompatibleAPI(model) {
        const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY };
        if (currentProvider === 'openrouter') {
            headers['HTTP-Referer'] = window.location.href;
            headers['X-Title'] = 'AI Chatbot';
        }

        let formattedMessages = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
        
        formattedMessages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        
        const response = await fetch(API_ENDPOINTS[currentProvider], {
            method: 'POST', headers: headers,
            body: JSON.stringify({ model: model, messages: formattedMessages, temperature: 0.7, max_tokens: 1500 })
        });
        if (!response.ok) throw new Error((await response.json().catch(()=>({}))).error?.message || 'HTTP Error ' + response.status);
        return (await response.json())?.choices?.[0]?.message?.content || 'কোনো উত্তর পাওয়া যায়নি।';
    }

    async function callGoogleAPI(model) {
        const url = API_ENDPOINTS.google + model + ':generateContent?key=' + API_KEY;
        let formattedContents = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const response = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: formattedContents })
        });
        if (!response.ok) throw new Error((await response.json().catch(()=>({}))).error?.message || 'HTTP Error ' + response.status);
        return (await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text || 'কোনো উত্তর পাওয়া যায়নি।';
    }

    async function callAnthropicAPI(model) {
        let formattedMessages = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        const response = await fetch(API_ENDPOINTS.anthropic, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
            body: JSON.stringify({ model: model, max_tokens: 1500, system: SYSTEM_PROMPT, messages: formattedMessages })
        });
        if (!response.ok) throw new Error((await response.json().catch(()=>({}))).error?.message || 'HTTP Error ' + response.status);
        return (await response.json())?.content?.[0]?.text || 'কোনো উত্তর পাওয়া যায়নি।';
    }

    // --- UI Helpers ---
    function addMessage(text, sender, autoScroll = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + sender;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (sender === 'ai') {
            contentDiv.innerHTML = marked.parse(text);
            
            contentDiv.querySelectorAll('pre').forEach((preBlock) => {
                const codeBlock = preBlock.querySelector('code');
                let lang = 'Code';
                if (codeBlock && codeBlock.className) lang = codeBlock.className.replace('language-', '');

                const isHTML = lang.toLowerCase() === 'html' || lang.toLowerCase() === 'xml';
                const wrapper = document.createElement('div');
                wrapper.className = 'code-wrapper';
                
                const header = document.createElement('div');
                header.className = 'code-header';
                
                header.innerHTML = `
                    <span class="lang-name">${lang}</span>
                    <div class="code-actions" style="display: flex; gap: 12px; align-items: center;">
                        ${isHTML ? `
                        <button type="button" class="btn-preview" onclick="previewCode(event, this)" title="Run Code" style="padding: 4px; display: flex;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </button>` : ''}
                        <button type="button" class="btn-copy" onclick="copyCode(event, this)" title="Copy Code" style="padding: 4px; display: flex;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                        </button>
                    </div>
                `;
                
                preBlock.parentNode.insertBefore(wrapper, preBlock);
                wrapper.appendChild(header);
                wrapper.appendChild(preBlock);
                if(codeBlock) hljs.highlightElement(codeBlock);
            });
        } else {
            contentDiv.innerHTML = text.replace(/\n/g, '<br>'); // Handles line breaks in user message properly
        }
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        if (autoScroll) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    window.copyCode = function(event, button) {
        event.preventDefault(); event.stopPropagation();
        const wrapper = button.closest('.code-wrapper');
        const codeBlock = wrapper.querySelector('code');
        
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ece6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => { button.innerHTML = originalHTML; }, 2000);
        });
    };

    window.previewCode = function(event, button) {
        event.preventDefault(); event.stopPropagation();
        const wrapper = button.closest('.code-wrapper');
        const codeBlock = wrapper.querySelector('code');
        const modal = document.getElementById('previewModal');
        const frame = document.getElementById('previewFrame');
        frame.srcdoc = codeBlock.innerText;
        modal.style.display = 'flex';
    };

        messageInput.addEventListener('keypress', function(e) {
        // Shift না চেপে শুধু Enter চাপলে মেসেজ সেন্ড হবে
        if (e.key === 'Enter' && !e.shiftKey && isConnected) { 
            e.preventDefault(); 
            window.sendMessage(); 
        }
    });


    // --- Init App ---
    updateModelList();
    modelSelect.value = 'deepseek/deepseek-chat';
    
     // Load Chats or Create New
    if(allChats.length === 0) {
        createNewChat();
    } else {
        loadChat(allChats[0].id); // Load the most recent chat
    }
});