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

document.addEventListener("DOMContentLoaded", async () => {
    const saveBtn = document.getElementById("save-job-btn");
    const jobsList = document.getElementById("jobs-list");

    const initialJobs = await getStoredJobs();
    renderJobsList(initialJobs);

    saveBtn.addEventListener("click", async () => {
        const fakeJob = {
            id: crypto.randomUUID(),
            title: `Dev Frontend #${Math.floor(Math.random() * 1000)}`,
            company: 'Awesome Tech Inc.',
            url: 'https://example.com/jobs/dev-frontend',
            status: 'applied',
            createdAt: new Date().toISOString()
        };

        const updated = await saveJob(fakeJob);
        renderJobsList(updated);
    });

    jobsList.addEventListener('click', async () => {
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