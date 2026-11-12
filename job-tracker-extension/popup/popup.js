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

    infoDiv.appendChild(titleLink);
    infoDiv.appendChild(companySpan);
    infoDiv.appendChild(statusSpan);

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
    const saveBtn = document.getElementById("save-job-btn");
    const jobsList = document.getElementById("jobs-list");

    const initialJobs = await getStoredJobs();
    renderJobsList(initialJobs);

    saveBtn.addEventListener("click", async () => {
        try {
            const activeTab = await getActiveTab();
            const statusMsg = document.getElementById("status-message");

            if (!activeTab || !activeTab.id || activeTab.url.startsWith('chrome://')) {
                alert("Impossible d'extraire les données de cette page.");
                return;
            }

            const extracted = await extractFromActiveTab(activeTab.id);

            const newJob = {
                id: crypto.randomUUID(),
                title: extracted.title || 'Poste sans titre',
                company: 'A détecter',
                url: extracted.url,
                status: 'applied',
                createdAt: new Date().toISOString()
            };

            const updated = await saveJob(newJob);
            renderJobsList(updated);

            statusMsg.textContent = `Offre enregistrée : ${newJob.title}`;
            statusMsg.classList.remove('hidden');
            setTimeout(() => statusMsg.classList.add('hidden'), 3000);
        } catch (error) {
            console.error('Erreur lors de l\'extraction : ', error);
            alert("Erreur lors de l'extraction : " + error.message);
        }
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