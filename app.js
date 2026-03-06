
const supabaseUrl = 'https://yvcrcorrbtgcodajyumo.supabase.co';  
const supabaseKey = 'sb_publishable_VFx1p3mjoHRSqF_A1n7g6A_DnL4N_Zh';  
const supabaseClient = window.supabase ? supabase.createClient(supabaseUrl, supabaseKey) : null;

const ALL_MODELS = ['Human', 'Model_C', 'Hybrid', 'SFT', 'Model_D'];

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
                <div class="rating-footer" style="display: flex; flex-direction: column; gap: 10px; align-items: stretch; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size:0.9rem; font-weight:600; color:#6b7280;">Rating:</span>
                        <span style="font-size:1rem; font-weight:700; color:var(--primary);" id="val-${modelName}">Not rated</span>
                    </div>
                    <input type="range" min="1" max="5" step="0.5" value="1" class="slider" data-model="${modelName}">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #9ca3af;">
                        <span>1 (Poor)</span>
                        <span>5 (Excellent)</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Setup Slider events
        document.querySelectorAll('.slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value); 
                const model = e.target.getAttribute('data-model');
                
                // Update text to show exact decimal (e.g. 4.2 / 5.0)
                document.getElementById(`val-${model}`).textContent = val.toFixed(1) + " / 5.0";
                
                // Save rating to state
                currentRatings[model] = val;
            });
        });
    }

    document.getElementById('next-btn').addEventListener('click', async (e) => {
        const errorBox = document.getElementById('eval-error');
        const btn = e.target;
        
        if (Object.keys(currentRatings).length < ALL_MODELS.length) {
            errorBox.textContent = "Please adjust the slider to rate all summaries before continuing.";
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
            const { error } = await supabaseClient.from('ratings_v2').insert(payload);
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
// --- PAGE 3: LIVE-TEST.HTML ---
if (document.getElementById('live-test-page')) {
    const evaluatorId = sessionStorage.getItem('evaluatorId');
    if (!evaluatorId) {
        // Optional: you can redirect to index.html if you want strict flow
        console.warn("No evaluator ID found. Make sure user started from index.html.");
    }

    document.getElementById('submit-live-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        const errorBox = document.getElementById('live-error');
        const slider = document.getElementById('live-slider');
        const score = parseFloat(slider.value);

        if (!evaluatorId) {
            errorBox.textContent = "Session error: Please go back to start page to register.";
            errorBox.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        btn.textContent = "Saving...";
        errorBox.classList.add('hidden');

        try {
            // Reusing ratings_v2 table. Article index 999 = Live test rating.
            const { error } = await supabaseClient.from('ratings_v2').insert([{
                evaluator_id: evaluatorId,
                article_index: 999, 
                model_name: 'Live_Demo_HF',
                score: score
            }]);
            
            if (error) throw error;
            
            // On success, redirect to the thank you page
            window.location.href = 'thanks.html';
        } catch (err) {
            console.error("Error saving live rating:", err);
            errorBox.textContent = "Failed to save rating. Try again.";
            errorBox.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = "Submit Rating & Finish";
        }
    });
}

// --- PAGE 4: THANKS.HTML ---
if (document.getElementById('thanks-page')) {
    sessionStorage.clear(); // Clears memory so they can't hit "back"
}
