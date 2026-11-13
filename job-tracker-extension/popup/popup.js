const STORAGE_KEY = 'jobs';

// retourne liste des jobs
async function getStoredJobs(){
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
}

// sauvegarde l'offre en tête de liste
async function saveJob(newJob){
    const jobs = await getStoredJobs();
    const updatedJobs = [newJob, ...jobs];
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedJobs});
    return updatedJobs;
}

async function deleteJob(id){
    const jobs = await getStoredJobs();
    const updatedJobs = jobs.filter(job => job.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedJobs});
    return updatedJobs;
}

function createJobCard(job){
    const li = document.createElement('li');
    li.className = 'job-card';
    li.dataset.id = job.id;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'job-info';

    const titleLink = document.createElement('a');
    titleLink.className = 'job-title';
    titleLink.href = job.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = job.title;

    const companySpan = document.createElement('span');
    companySpan.className = 'job-company';
    companySpan.textContent = job.company;

    const statusSpan = document.createElement('span');
    statusSpan.className = 'job-status';
    statusSpan.textContent = job.status || 'applied';

    const platformSpan = document.createElement('span');
    platformSpan.className = 'platform-tag';
    platformSpan.textContent = job.platform || 'Autre';

    infoDiv.appendChild(titleLink);
    infoDiv.appendChild(companySpan);
    infoDiv.appendChild(statusSpan);
    infoDiv.appendChild(platformSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Supprimer';
    deleteBtn.setAttribute('aria-label', `Supprimer ${job.title}`);
    deleteBtn.textContent = 'x';

    li.appendChild(infoDiv);
    li.appendChild(deleteBtn);

    return li;
}

function renderJobsList(jobs){
    const listElement = document.getElementById('jobs-list');
    const emptyState = document.getElementById('empty-state');
    const countBadge = document.getElementById('job-count');

    countBadge.textContent = jobs.length;

    listElement.innerHTML = '';

    if (jobs.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();
    jobs.forEach(job => {
        fragment.appendChild(createJobCard(job));
    });

    listElement.appendChild(fragment);
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
}

async function extractFromActiveTab(tabId) {
    const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [ 'scripts/extract-info.js' ]
    });

    if (results && results[0] && results[0].result) {
        return results[0].result;
    }

    throw new Error("Impossible d'extraire les informations de la page.");
}

document.addEventListener("DOMContentLoaded", async () => {
    const jobForm = document.getElementById("job-form");
    const titleInput = document.getElementById("job-title");
    const companyInput = document.getElementById("job-company");
    const platformInput = document.getElementById("job-platform");
    const urlInput = document.getElementById("job-url");
    const jobsList = document.getElementById("jobs-list");
    const statusMsg = document.getElementById("status-message");

    const initialJobs = await getStoredJobs();
    renderJobsList(initialJobs);

    try {
        const activeTab = await getActiveTab();
        if (activeTab && activeTab.id && !activeTab.url.startsWith('chrome://')) {
            const extracted = await extractFromActiveTab(activeTab.id);
            if (extracted) {
                titleInput.value = extracted.title || '';
                companyInput.value = extracted.company || '';
                platformInput.value = extracted.platform || '';
                urlInput.value = extracted.url || activeTab.url;
            }
        }
    } catch (e) {
        // Si l'extraction échoue (ex: page système ou permission), le formulaire reste vide et modifiable manuellement
        console.warn("Extraction automatique impossible, saisie manuelle active.", e);
    }

    jobForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const newJob = {
            id: crypto.randomUUID(),
            title: titleInput.value.trim(),
            company: companyInput.value.trim(),
            platform: platformInput.value.trim() || 'Autre',
            url: urlInput.value || '',
            status: 'applied',
            createdAt: new Date().toISOString()
        };

        const updated = await saveJob(newJob);
        renderJobsList(updated);

        statusMsg.textContent = `Offre enregistrée : "${newJob.title}"`;
        statusMsg.classList.remove('hidden');
        setTimeout(() => statusMsg.classList.add('hidden'), 3000);
    });

    jobsList.addEventListener('click', async (event) => {
        const deleteBtn = event.target.closest('.delete-btn');
        if (!deleteBtn) return;

        const card = deleteBtn.closest('.job-card');
        const jobId = card.dataset.id;
        if (jobId) {
            const updated = await deleteJob(jobId);
            renderJobsList(updated);
        }
    });
});