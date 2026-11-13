(() => {
    const url = window.location.href;
    const hostname = window.location.hostname;

    let platform = 'Autre';
    if(hostname.includes('linkedin.com')) platform = 'LinkedIn';
    else if(hostname.includes('indeed.')) platform = 'Indeed';
    else if(hostname.includes('hellowork.com')) platform = 'HelloWork';

    function getCleanUrl(){
        try {
            const u = new URL(url);
            if (platform === 'LinkedIn') {
                const jobId = u.searchParams.get('currentJobId') || u.pathname.match(/\/jobs\/view\/(\d+)/)?.[1];
                if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}/`;
            } else if (platform === 'Indeed') {
                const jk = u.searchParams.get('jk') || u.searchParams.get('vjk');
                if (jk) return `https://${u.hostname}/viewjob?jk=${jk}`;
            } else if (platform === 'HelloWork') {
                return `${u.origin}${u.pathname}`;
            }

            ['utm_source', 'utm_medium', 'utm_campaign', 'refId', 'trackingId'].forEach(p => u.searchParams.delete(p));
            return u.toString();
        } catch {
            return url;
        }
    }

    function extractFromJsonLd(){
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for(const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);
                const job = data['@type'] === 'JobPosting' ? data : (data['@graph']?.find(item => item['@type'] === 'JobPosting'));
                if(job) {
                    return {
                        title: job.title,
                        company: job.hiringOrganization.name || job.hiringOrganization,
                        location: job.jobLocation?.address?.addressLocality || ''
                    };
                }
            } catch {

            }
        }
        return null;
    }

    function extractFromDOM(){
        let title = '';
        let company = '';

        if(platform === 'LinkedIn') {
            title = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24,' +
                '.job-details-jobs-unified-top-card__job-title h1')?.textContent;
            company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name,' +
                '.jobs-unified-top-card__primary-description a')?.textContent;
        } else if(platform === 'Indeed') {
            title = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title')?.textContent;
            company = document.querySelector('[data-testid="inlineHeader-companyName"], [data-testid="jobsearch-CompanyInfoContainer"] a')?.textContent;
        } else if(platform === 'HelloWork') {
            title = document.querySelector('[data-cy="job-title"], h1[data-title], h1')?.textContent;
            company = document.querySelector('[data-cy="company-name"], [data-cy="job-company"], a[href*="/entreprises/"]')?.textContent;
        }

        return { title, company };
    }

    function extractFallback() {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const rawTitle = ogTitle || document.title ||  '';

        const parts = rawTitle.split(/[-|•–—]/).map(s => s.trim()).filter(Boolean);
        const title = parts[0] || rawTitle;
        const company = parts.length > 1 ? parts[1] : '';

        return { title, company };
    }

    const jsonLd = extractFromJsonLd() || {};
    const dom = extractFromDOM();
    const fallback = extractFallback();
    const finalTitle = (dom.title || jsonLd.title || fallback.title || '').trim();
    const finalCompany = (dom.company || jsonLd.company || fallback.company || '').trim();

    return {
        title: finalTitle,
        company: finalCompany,
        url: getCleanUrl(),
        platform: platform
    };
})();