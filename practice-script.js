
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let correctCount = 0;
let isTimedMode = false;
let timeRemaining = 1200; // 20 minutes
let timerInterval = null;
let startTime = null;
let bookmarkedQuestions = new Set();
let antiCheat = null;
let currentUser = null;

const urlParams = new URLSearchParams(window.location.search);
const subject = urlParams.get('subject') || 'english';

// Helper function to validate image URLs (prevent XSS via data URIs, javascript:, or SVG)
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    
    try {
        // Parse the URL to extract components
        let parsedUrl;
        if (trimmed.startsWith('/')) {
            // Relative URL - construct with a base to parse
            parsedUrl = new URL(trimmed, window.location.origin);
        } else {
            parsedUrl = new URL(trimmed);
        }
        
        // Only allow http and https protocols
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return false;
        }
        
        // Get the pathname without query strings or fragments
        const pathname = parsedUrl.pathname.toLowerCase();
        
        // Whitelist safe image extensions only
        const safeExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
        const hasValidExtension = safeExtensions.some(ext => pathname.endsWith(ext));
        
        return hasValidExtension;
    } catch (e) {
        // Invalid URL format
        return false;
    }
}

// Helper function to escape HTML and convert math notation for MathJax
function escapeHtmlPreserveMath(text) {
    if (!text) return '';
    
    // First, escape HTML to prevent XSS
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    let processed = escapeHtml(text);
    
    // Convert common Unicode math notation to LaTeX wrapped in $ delimiters
    // Superscripts with preceding character: x² → $x^{2}$
    processed = processed.replace(/(\w)²/g, '$$$1^{2}$$');
    processed = processed.replace(/(\w)³/g, '$$$1^{3}$$');
    processed = processed.replace(/(\w)⁴/g, '$$$1^{4}$$');
    processed = processed.replace(/(\w)⁵/g, '$$$1^{5}$$');
    processed = processed.replace(/(\w)⁶/g, '$$$1^{6}$$');
    processed = processed.replace(/(\w)ⁿ/g, '$$$1^{n}$$');
    
    // Subscripts with preceding character: x₁ → $x_{1}$
    processed = processed.replace(/(\w)₀/g, '$$$1_{0}$$');
    processed = processed.replace(/(\w)₁/g, '$$$1_{1}$$');
    processed = processed.replace(/(\w)₂/g, '$$$1_{2}$$');
    processed = processed.replace(/(\w)₃/g, '$$$1_{3}$$');
    
    // Math symbols - wrap individually
    processed = processed.replace(/√(\d+)/g, '$$\\sqrt{$1}$$'); // √25 → $\sqrt{25}$
    processed = processed.replace(/√(\w)/g, '$$\\sqrt{$1}$$');  // √x → $\sqrt{x}$
    processed = processed.replace(/π/g, '$$\\pi$$');
    processed = processed.replace(/θ/g, '$$\\theta$$');
    processed = processed.replace(/α/g, '$$\\alpha$$');
    processed = processed.replace(/β/g, '$$\\beta$$');
    processed = processed.replace(/∞/g, '$$\\infty$$');
    processed = processed.replace(/≤/g, '$$\\leq$$');
    processed = processed.replace(/≥/g, '$$\\geq$$');
    processed = processed.replace(/×/g, '$$\\times$$');
    processed = processed.replace(/÷/g, '$$\\div$$');
    processed = processed.replace(/±/g, '$$\\pm$$');
    processed = processed.replace(/≠/g, '$$\\neq$$');
    processed = processed.replace(/∴/g, '$$\\therefore$$');
    
    return processed;
}

// Utility function to shuffle an array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function waitForDependencies() {
    return new Promise((resolve) => {
        const checkDependencies = () => {
            const hasCustomModal = typeof window.customModal !== 'undefined';
            const hasAntiCheat = typeof window.AntiCheatSystem !== 'undefined';
            const hasSupabaseCheck = typeof window.isSupabaseConfigured !== 'undefined';
            
            if (hasCustomModal && hasAntiCheat && hasSupabaseCheck) {
                resolve();
                return true;
            }
            return false;
        };
        
        if (checkDependencies()) return;
        
        const checkInterval = setInterval(() => {
            if (checkDependencies()) {
                clearInterval(checkInterval);
            }
        }, 50);
        
        // Timeout after 5 seconds to prevent infinite waiting
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('Some dependencies not loaded, proceeding anyway');
            resolve();
        }, 5000);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForDependencies();
        
        // Initialize anti-cheat if available
        if (typeof AntiCheatSystem !== 'undefined') {
            antiCheat = new AntiCheatSystem(() => {
                if (typeof customModal !== 'undefined') {
                    customModal.alert('Maximum violations reached. Your practice session will end.', 'Session Ended');
                }
                showCompletion();
            });
        }
        
        // Get current user
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const auth = getAuth();
        auth.onAuthStateChanged((user) => {
            currentUser = user;
            if (user) {
                if (typeof streakTracker !== 'undefined' && streakTracker.loadFromFirestore) {
                    streakTracker.loadFromFirestore();
                }
                if (typeof bookmarkManager !== 'undefined' && bookmarkManager.loadFromFirestore) {
                    bookmarkManager.loadFromFirestore();
                }
            }
        });
    } catch (error) {
        console.error('Error initializing practice mode:', error);
    }
});

// Mode selection
document.getElementById('freeModeBtn').addEventListener('click', () => {
    const btn = document.getElementById('freeModeBtn');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div><p class="mt-2">Loading...</p></div>';
    
    setTimeout(() => {
        isTimedMode = false;
        document.getElementById('modeSelectionModal').classList.add('hidden');
        document.getElementById('modeDescription').textContent = 'Answer at your own pace with instant feedback';
        initializePractice();
    }, 300);
});

document.getElementById('timedModeBtn').addEventListener('click', () => {
    const btn = document.getElementById('timedModeBtn');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div><p class="mt-2">Loading...</p></div>';
    
    setTimeout(() => {
        isTimedMode = true;
        document.getElementById('modeSelectionModal').classList.add('hidden');
        document.getElementById('modeDescription').textContent = 'Complete in 20 minutes';
        document.getElementById('timerDisplay').classList.remove('hidden');
        initializePractice();
    }, 300);
});

async function initializePractice() {
    document.getElementById('subjectTitle').textContent = `Practice: ${capitalizeFirst(subject)}`;
    document.getElementById('loadingScreen').classList.remove('hidden');
    await loadQuestions();
}

async function loadQuestions() {
    try {
        const response = await fetch(`/api/questions?subject=${encodeURIComponent(subject)}&limit=20`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();

        if (!data.questions || data.questions.length === 0) {
            throw new Error('No questions found for this subject. Please check back later.');
        }

        currentQuestions = shuffleArray(data.questions);
        userAnswers = new Array(currentQuestions.length).fill(null);
        loadBookmarks();

        const loadingScreen = document.getElementById('loadingScreen');
        const setupAlert = document.getElementById('setupAlert');
        const practiceInterface = document.getElementById('practiceInterface');

        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (setupAlert) setupAlert.classList.add('hidden');
        if (practiceInterface) practiceInterface.classList.remove('hidden');

        if (isTimedMode) startTimer();

        startTime = Date.now();
        renderQuestion();

        if (antiCheat) antiCheat.startMonitoring();
    } catch (error) {
        console.error('Error loading questions:', error);

        const loadingScreen = document.getElementById('loadingScreen');
        const practiceInterface = document.getElementById('practiceInterface');
        if (loadingScreen) loadingScreen.classList.add('hidden');

        const msg = error.message || 'Failed to load questions. Please try again.';
        if (typeof customModal !== 'undefined') {
            customModal.error(msg, 'Loading Error');
        } else {
            alert(msg);
        }
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timeRemaining').textContent = 
            `${minutes}:${String(seconds).padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            showCompletion();
        }
        
        if (timeRemaining <= 60) {
            document.getElementById('timerDisplay').classList.add('animate-pulse');
        }
    }, 1000);
}

function loadBookmarks() {
    const saved = localStorage.getItem('jambgenius_bookmarks');
    if (saved) {
        bookmarkedQuestions = new Set(JSON.parse(saved));
    }
}

function saveBookmarks() {
    localStorage.setItem('jambgenius_bookmarks', JSON.stringify([...bookmarkedQuestions]));
}

async function toggleBookmark() {
    const question = currentQuestions[currentQuestionIndex];
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const icon = bookmarkBtn.querySelector('i');
    
    // Toggle bookmark using bookmarkManager
    await bookmarkManager.toggleBookmark({
        question: question.question,
        subject: question.subject || subject,
        options: {
            A: question.option_a,
            B: question.option_b,
            C: question.option_c,
            D: question.option_d
        },
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        difficulty: 'medium'
    });
    
    // Update icon
    const isBookmarked = bookmarkManager.isBookmarked({
        question: question.question,
        subject: question.subject || subject
    });
    
    if (isBookmarked) {
        icon.classList.remove('far');
        icon.classList.add('fas');
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
    }
}

document.getElementById('bookmarkBtn').addEventListener('click', toggleBookmark);

function renderQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    
    document.getElementById('currentQuestionNum').textContent = currentQuestionIndex + 1;
    document.getElementById('questionCounter').textContent = `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    
    // Use innerHTML for math rendering, escape HTML but preserve LaTeX
    const questionTextEl = document.getElementById('questionText');
    questionTextEl.innerHTML = escapeHtmlPreserveMath(question.question);
    
    // Render diagram if available (with URL sanitization)
    const diagramContainer = document.getElementById('diagramContainer');
    if (diagramContainer) {
        if (question.diagram_url && isValidImageUrl(question.diagram_url)) {
            const img = document.createElement('img');
            img.src = question.diagram_url;
            img.alt = 'Question diagram';
            img.className = 'max-w-full h-auto rounded-lg border border-gray-200 my-4';
            diagramContainer.innerHTML = '';
            diagramContainer.appendChild(img);
            diagramContainer.classList.remove('hidden');
        } else {
            diagramContainer.innerHTML = '';
            diagramContainer.classList.add('hidden');
        }
    }
    
    // Trigger MathJax to render any math in the question
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([questionTextEl]).catch(err => console.log('MathJax error:', err));
    }
    
    // Update bookmark icon
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const icon = bookmarkBtn.querySelector('i');
    if (bookmarkedQuestions.has(question.id)) {
        icon.classList.remove('far');
        icon.classList.add('fas');
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
    }
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    const options = ['A', 'B', 'C', 'D'];
    options.forEach(opt => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-btn p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all';
        optionDiv.dataset.option = opt;
        
        const isSelected = userAnswers[currentQuestionIndex]?.selected === opt;
        if (isSelected) {
            optionDiv.classList.add('border-primary-500', 'bg-primary-50');
        }
        
        const optionText = escapeHtmlPreserveMath(question[`option_${opt.toLowerCase()}`] || '');
        optionDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3 font-semibold">
                    ${opt}
                </div>
                <div class="flex-1 option-text">${optionText}</div>
            </div>
        `;
        
        optionDiv.addEventListener('click', () => selectOption(opt));
        optionsContainer.appendChild(optionDiv);
    });
    
    // Trigger MathJax to render math in all options
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([optionsContainer]).catch(err => console.log('MathJax options error:', err));
    }
    
    if (userAnswers[currentQuestionIndex]) {
        showFeedback();
    } else {
        document.getElementById('feedback').classList.add('hidden');
    }
    
    updateNavigation();
    updateScore();
}

async function selectOption(option) {
    if (userAnswers[currentQuestionIndex]) return;
    
    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = option === question.correct_answer;
    
    userAnswers[currentQuestionIndex] = {
        selected: option,
        correct: isCorrect
    };
    
    if (isCorrect) correctCount++;
    
    // Record streak for first answer in session
    if (currentUser && userAnswers.filter(a => a !== null).length === 1) {
        streakTracker.recordPractice();
    }
    
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('border-primary-500', 'bg-primary-50');
        btn.style.pointerEvents = 'none';
    });
    
    const selectedBtn = document.querySelector(`[data-option="${option}"]`);
    selectedBtn.classList.add('border-primary-500', 'bg-primary-50');
    
    showFeedback();
    updateScore();
    
    // Show AI explanation button
    const aiExplainBtn = document.getElementById('aiExplainBtn');
    if (aiExplainBtn) {
        aiExplainBtn.classList.remove('hidden');
    }
}

function showFeedback() {
    const question = currentQuestions[currentQuestionIndex];
    const answer = userAnswers[currentQuestionIndex];
    
    if (!answer) return;
    
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden');
    
    if (answer.correct) {
        feedback.className = 'mt-6 p-4 rounded-lg bg-green-50 border-2 border-green-200';
        feedback.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fas fa-check-circle text-2xl text-green-600 mt-1"></i>
                <div>
                    <div class="font-semibold text-green-900 mb-1">Correct!</div>
                    <div class="text-green-800">${question.explanation || 'Well done!'}</div>
                </div>
            </div>
        `;
    } else {
        feedback.className = 'mt-6 p-4 rounded-lg bg-red-50 border-2 border-red-200';
        feedback.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fas fa-times-circle text-2xl text-red-600 mt-1"></i>
                <div>
                    <div class="font-semibold text-red-900 mb-1">Incorrect</div>
                    <div class="text-red-800 mb-2">The correct answer is <strong>${question.correct_answer}</strong></div>
                    <div class="text-red-700">${question.explanation || ''}</div>
                </div>
            </div>
        `;
    }
}

function updateNavigation() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    
    const nextBtn = document.getElementById('nextBtn');
    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.textContent = 'Finish';
        nextBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Finish';
    } else {
        nextBtn.innerHTML = 'Next<i class="fas fa-arrow-right ml-2"></i>';
    }
}

function updateScore() {
    const answered = userAnswers.filter(a => a !== null).length;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('answeredCount').textContent = answered;
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showCompletion();
    }
});

function showCompletion() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    if (antiCheat) {
        antiCheat.stopMonitoring();
    }
    
    const endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const answered = userAnswers.filter(a => a !== null).length;
    const wrong = answered - correctCount;
    const percentage = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    
    document.getElementById('finalScore').textContent = `${percentage}%`;
    document.getElementById('finalCorrect').textContent = correctCount;
    document.getElementById('finalWrong').textContent = wrong;
    
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    document.getElementById('finalTime').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    // Generate detailed report
    const reportDetails = document.getElementById('reportDetails');
    reportDetails.innerHTML = `
        <div><strong>Subject:</strong> ${capitalizeFirst(subject)}</div>
        <div><strong>Mode:</strong> ${isTimedMode ? 'Timed Practice' : 'Free Practice'}</div>
        <div><strong>Questions Answered:</strong> ${answered} / ${currentQuestions.length}</div>
        <div><strong>Accuracy:</strong> ${percentage}%</div>
        <div><strong>Time Taken:</strong> ${minutes}m ${seconds}s</div>
        <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
    `;
    
    // Save to analytics
    savePracticeSession({
        subject,
        mode: isTimedMode ? 'timed' : 'free',
        total: currentQuestions.length,
        answered,
        correct: correctCount,
        wrong,
        percentage,
        timeTaken,
        date: new Date().toISOString()
    });
    
    document.getElementById('completionModal').classList.remove('hidden');
}

function savePracticeSession(data) {
    const sessions = JSON.parse(localStorage.getItem('jambgenius_sessions') || '[]');
    sessions.push(data);
    localStorage.setItem('jambgenius_sessions', JSON.stringify(sessions));
}

document.getElementById('downloadReportBtn').addEventListener('click', () => {
    const answered = userAnswers.filter(a => a !== null).length;
    const wrong = answered - correctCount;
    const percentage = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    const timeTaken = document.getElementById('finalTime').textContent;
    
    const reportText = `
JAMBGENIUS PRACTICE REPORT
==========================

Subject: ${capitalizeFirst(subject)}
Mode: ${isTimedMode ? 'Timed Practice (20 min)' : 'Free Practice'}
Date: ${new Date().toLocaleString()}

PERFORMANCE
-----------
Score: ${percentage}%
Correct Answers: ${correctCount}
Wrong Answers: ${wrong}
Total Questions: ${answered}
Time Taken: ${timeTaken}

QUESTION BREAKDOWN
------------------
${currentQuestions.map((q, i) => {
    const ans = userAnswers[i];
    if (!ans) return `Q${i+1}: Not answered`;
    return `Q${i+1}: ${ans.correct ? '✓ Correct' : '✗ Wrong'} (Your answer: ${ans.selected}, Correct: ${q.correct_answer})`;
}).join('\n')}

Bookmarked Questions: ${bookmarkedQuestions.size}

---
Generated by JambGenius 💯
Nigeria's Premier JAMB Preparation Platform
    `.trim();
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JambGenius_${subject}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('reviewBtn').addEventListener('click', () => {
    document.getElementById('completionModal').classList.add('hidden');
    currentQuestionIndex = 0;
    renderQuestion();
});

document.getElementById('newPracticeBtn').addEventListener('click', () => {
    window.location.href = 'practice-mode-subjects.html';
});

// AI Explanation Button Handler
document.getElementById('aiExplainBtn')?.addEventListener('click', async () => {
    const question = currentQuestions[currentQuestionIndex];
    const answer = userAnswers[currentQuestionIndex];
    const btn = document.getElementById('aiExplainBtn');
    
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'explain',
                question: question.question,
                options: {
                    A: question.option_a,
                    B: question.option_b,
                    C: question.option_c,
                    D: question.option_d
                },
                correctAnswer: question.correct_answer,
                userAnswer: answer?.selected
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.explanation) {
            // Show explanation in feedback area
            const feedback = document.getElementById('feedback');
            feedback.className = 'mt-6 p-4 rounded-lg bg-purple-50 border-2 border-purple-200';
            feedback.innerHTML = `
                <div class="flex items-start space-x-3">
                    <i class="fas fa-lightbulb text-2xl text-purple-600 mt-1"></i>
                    <div>
                        <div class="font-semibold text-purple-900 mb-2">AI Explanation</div>
                        <div class="text-purple-800">${data.explanation}</div>
                    </div>
                </div>
            `;
            feedback.classList.remove('hidden');
        } else {
            alert('Unable to generate explanation. Please try again.');
        }
    } catch (error) {
        console.error('Error getting explanation:', error);
        alert('Error loading explanation. Please check your connection and try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});
