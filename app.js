// Initialize Supabase 
const supabaseUrl = 'https://yvcrcorrbtgcodajyumo.supabase.co';  
const supabaseKey = 'sb_publishable_VFx1p3mjoHRSqF_A1n7g6A_DnL4N_Zh';  
const supabaseClient = window.supabase ? supabase.createClient(supabaseUrl, supabaseKey) : null;

const ALL_MODELS = ['Human', 'Model_C', 'Hybrid', 'AbsRL_FastText', 'Duel_Encoder', 'SFT', 'Model_D'];

function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

function generateId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- PAGE 1: INDEX.HTML ---
if (document.getElementById('welcome-page')) {
    document.getElementById('start-btn').addEventListener('click', async () => {
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const major = document.getElementById('major').value;
        const errorBox = document.getElementById('form-error');
        const startBtn = document.getElementById('start-btn');

        if (!age || !gender || !major.trim()) {
            errorBox.textContent = "Please fill out all fields.";
            errorBox.classList.remove('hidden');
            return;
        }

        startBtn.disabled = true;
        startBtn.textContent = "Starting...";
        errorBox.classList.add('hidden');

        const evaluatorId = generateId(); 

        try {
            const { error } = await supabaseClient.from('evaluators').insert([{ id: evaluatorId, age: parseInt(age), gender, major }]);
            if (error) throw error;

            sessionStorage.setItem('evaluatorId', evaluatorId);
            sessionStorage.setItem('currentArticleIndex', '0');
            window.location.href = 'evaluation.html'; 
        } catch (err) {
            console.error("Error:", err);
            errorBox.textContent = "Database error. Check console.";
            errorBox.classList.remove('hidden');
            startBtn.disabled = false;
            startBtn.textContent = "Start Evaluation";
        }
    });
}

// --- PAGE 2: EVALUATION.HTML ---
if (document.getElementById('evaluation-page')) {
    const evaluatorId = sessionStorage.getItem('evaluatorId');
    let currentArticleIndex = parseInt(sessionStorage.getItem('currentArticleIndex') || '0');
    let currentRatings = {};

    if (!evaluatorId) {
        window.location.href = 'index.html'; 
    } else {
        loadArticle(); 
    }

    function loadArticle() {
        const article = EVALUATION_DATA[currentArticleIndex];
        document.getElementById('progress-text').textContent = `Article ${currentArticleIndex + 1} of ${EVALUATION_DATA.length}`;
        document.getElementById('original-text').textContent = article.Original_Article;

        currentRatings = {};
        const shuffledModels = shuffleArray(ALL_MODELS);
        const grid = document.getElementById('summaries-grid');
        grid.innerHTML = '';  

        shuffledModels.forEach((modelName, idx) => {
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.innerHTML = `
                <div>
                    <h4>Summary ${idx + 1}</h4>
                    <p>${article[modelName]}</p>
                </div>
                <div class="rating-footer">
                    <span style="font-size:0.9rem; font-weight:600; color:#6b7280;">Rating:</span>
                    <div class="stars" data-model="${modelName}">
                        <span class="star" data-value="1">★</span>
                        <span class="star" data-value="2">★</span>
                        <span class="star" data-value="3">★</span>
                        <span class="star" data-value="4">★</span>
                        <span class="star" data-value="5">★</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        document.querySelectorAll('.stars').forEach(starContainer => {
            const model = starContainer.getAttribute('data-model');
            const stars = starContainer.querySelectorAll('.star');

            stars.forEach(star => {
                star.addEventListener('click', (e) => {
                    const value = parseInt(e.target.getAttribute('data-value'));
                    currentRatings[model] = value;
                    stars.forEach(s => {
                        s.classList.toggle('active', parseInt(s.getAttribute('data-value')) <= value);
                    });
                });
            });
        });
    }

    document.getElementById('next-btn').addEventListener('click', async (e) => {
        const errorBox = document.getElementById('eval-error');
        const btn = e.target;
        
        if (Object.keys(currentRatings).length < ALL_MODELS.length) {
            errorBox.textContent = "Please provide a rating for all summaries.";
            errorBox.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        btn.textContent = "Saving...";
        errorBox.classList.add('hidden');

        const payload = ALL_MODELS.map(model => ({
            evaluator_id: evaluatorId,
            article_index: currentArticleIndex,
            model_name: model,
            score: currentRatings[model]
        }));

        try {
            const { error } = await supabaseClient.from('ratings').insert(payload);
            if (error) throw error;

            if (currentArticleIndex < EVALUATION_DATA.length - 1) {
                currentArticleIndex++;
                sessionStorage.setItem('currentArticleIndex', currentArticleIndex.toString());
                loadArticle();
                btn.disabled = false;
                btn.textContent = (currentArticleIndex === EVALUATION_DATA.length - 1) ? "Finish Evaluation" : "Next Article →";
                window.scrollTo(0, 0); 
            } else {
                window.location.href = 'thanks.html';
            }
        } catch (err) {
            console.error("Error:", err);
            errorBox.textContent = "Failed to save. Try again.";
            errorBox.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = "Next Article →";
        }
    });
}

// --- PAGE 3: THANKS.HTML ---
if (document.getElementById('thanks-page')) {
    sessionStorage.clear(); // Clears memory so they can't hit "back"
}
